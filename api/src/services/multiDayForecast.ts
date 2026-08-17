import { pool } from '../config/db';
import { NormalizedConditions, ShellingScoreResult } from '../types';
import { getTideEventsForRange, deriveTideConditions, selectDayLowTide } from './noaaTides';
import { getWaveConditions } from './noaaBuoys';
import { getCurrentWeather, getForecast, getUvIndex, nearestForecastBlock } from './openWeather';
import { getMoonPhase } from './moonPhase';
import { computeShellingScore } from './scoringEngine';
import { round, degToCompass } from '../utils/units';
import { ensureTideStationsSynced, ensureBuoyStationsSynced } from './noaaStations';
import { getConditionsCacheTtlMinutes } from './appConfig';

// OpenWeather's free-tier forecast endpoint only covers ~5 days at 3-hour
// resolution -- projecting further would mean fabricating data, not
// forecasting it, so this is the honest limit rather than the 7 days a
// day-strip UI might visually suggest.
const MULTI_DAY_COUNT = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface MultiDayEntry extends ShellingScoreResult {
  date: string; // YYYY-MM-DD
  // A semidiurnal day often has two lows -- bestWindow.lowTideTime is
  // always the one actually scored against (the day's lowest, see
  // selectDayLowTide), never this one. Purely a display extra: the day's
  // *other* low tide, if one exists in the same day window. Doesn't feed
  // into scoring or bestWindow at all.
  altLowTide: { time: string; heightFt: number } | null;
}

function bucket(lat: number, lon: number) {
  return { latBucket: round(lat, 2), lonBucket: round(lon, 2) };
}

// Same shape as conditionsAggregator.ts's conditions_cache -- this route just
// never used it. Reuses the conditions cache TTL since it's the same
// underlying freshness question (today's entry is scored against "now").
// Keyed by restrictShellingToDaylight too, not just location -- this cache
// stores the fully-computed result (bestWindow included), and that bakes in
// the daylight restriction, so two users with different preferences hitting
// the same location bucket must not share a cache row.
async function readCache(lat: number, lon: number, restrictShellingToDaylight: boolean): Promise<MultiDayEntry[] | null> {
  const { latBucket, lonBucket } = bucket(lat, lon);
  const result = await pool.query<{ payload: MultiDayEntry[] }>(
    `SELECT payload FROM multi_day_forecast_cache
     WHERE lat_bucket = $1 AND lon_bucket = $2 AND restrict_shelling_to_daylight = $3 AND expires_at > now()
     ORDER BY fetched_at DESC LIMIT 1`,
    [latBucket, lonBucket, restrictShellingToDaylight]
  );
  const row = result.rows[0];
  if (!row) return null;
  return row.payload.map((entry) => ({ ...entry, conditions: { ...entry.conditions, meta: { ...entry.conditions.meta, cacheHit: true } } }));
}

async function writeCache(lat: number, lon: number, payload: MultiDayEntry[], restrictShellingToDaylight: boolean): Promise<void> {
  const { latBucket, lonBucket } = bucket(lat, lon);
  const expiresAt = new Date(Date.now() + (await getConditionsCacheTtlMinutes()) * 60_000).toISOString();
  await pool.query(
    `INSERT INTO multi_day_forecast_cache (lat_bucket, lon_bucket, payload, expires_at, restrict_shelling_to_daylight) VALUES ($1, $2, $3, $4, $5)`,
    [latBucket, lonBucket, JSON.stringify(payload), expiresAt, restrictShellingToDaylight]
  );
}

export async function getMultiDayForecast(lat: number, lon: number, restrictShellingToDaylight: boolean): Promise<MultiDayEntry[]> {
  const cached = await readCache(lat, lon, restrictShellingToDaylight);
  if (cached) return cached;

  const entries = await fetchMultiDayForecast(lat, lon, restrictShellingToDaylight);
  await writeCache(lat, lon, entries, restrictShellingToDaylight);
  return entries;
}

async function fetchMultiDayForecast(lat: number, lon: number, restrictShellingToDaylight: boolean): Promise<MultiDayEntry[]> {
  await Promise.all([ensureTideStationsSynced(), ensureBuoyStationsSynced()]);

  const now = new Date();
  const rangeBegin = new Date(now.getTime() - DAY_MS);
  const rangeEnd = new Date(now.getTime() + MULTI_DAY_COUNT * DAY_MS);

  const [tideRange, currentWeather, forecastBlocks, todaysUvIndex] = await Promise.all([
    getTideEventsForRange(lat, lon, rangeBegin, rangeEnd),
    getCurrentWeather(lat, lon),
    getForecast(lat, lon),
    getUvIndex(lat, lon),
  ]);

  // Anchor every future day's sunrise/sunset to today's real values shifted
  // by whole days, rather than reconstructing a date from hour/minute -- a
  // sunset's UTC clock time can be earlier than its sunrise's (it can fall
  // just after UTC midnight for US timezones), so rebuilding "day N's
  // sunset" from just the day + that clock time silently put sunset before
  // sunrise for every day after today.
  const baseSunrise = new Date(currentWeather.weather.sunrise);
  let baseSunset = new Date(currentWeather.weather.sunset);
  if (baseSunset.getTime() < baseSunrise.getTime()) baseSunset = new Date(baseSunset.getTime() + DAY_MS);

  const entries: MultiDayEntry[] = [];

  for (let dayOffset = 0; dayOffset < MULTI_DAY_COUNT; dayOffset++) {
    const isToday = dayOffset === 0;
    const sunrise = new Date(baseSunrise.getTime() + dayOffset * DAY_MS);
    const sunset = new Date(baseSunset.getTime() + dayOffset * DAY_MS);
    const dayMidpoint = new Date((sunrise.getTime() + sunset.getTime()) / 2);
    // No real per-user timezone data exists anywhere in this app, so this
    // approximates "this calendar day" as a 24h window centered on local
    // solar noon, rather than a true midnight-to-midnight span.
    const dayStart = new Date(dayMidpoint.getTime() - 12 * 60 * 60 * 1000);
    const dayEnd = new Date(dayMidpoint.getTime() + 12 * 60 * 60 * 1000);

    // Deliberately ignores restrictShellingToDaylight -- the score should
    // always reflect the actual low tide, day or night. The restriction only
    // controls what findBestWindow (scoringEngine.ts) is willing to *display*
    // as a usable window, a separate concern from what instant conditions
    // are scored at. Picks the day's lowest (best) low tide, not just
    // whichever comes first chronologically -- see selectDayLowTide.
    const candidateLow = tideRange ? selectDayLowTide(tideRange.events, dayStart, dayEnd) : null;

    // Display-only: the day's other low tide (if this is a two-low day),
    // never the one used for scoring/bestWindow above. Excluded by time
    // rather than object identity, since candidateLow is a fresh object
    // returned from selectDayLowTide, not necessarily the same reference
    // as its matching entry in tideRange.events.
    const altLow = tideRange
      ? tideRange.events.find((e) => {
          if (e.type !== 'low') return false;
          if (candidateLow && e.time === candidateLow.time) return false;
          const t = new Date(e.time).getTime();
          return t >= dayStart.getTime() && t < dayEnd.getTime();
        }) ?? null
      : null;

    // Score against this day's low tide -- or midday if it has none -- not
    // the literal current instant, even for today. Evaluated a minute
    // *before* the low, not at it -- deriveTideConditions' nextEvents only
    // includes events strictly after the reference time, so scoring exactly
    // at the low would drop it out of nextEvents and hide it from
    // findBestWindow entirely.
    const referenceTime = new Date(candidateLow ? new Date(candidateLow.time).getTime() - 60_000 : dayMidpoint.getTime());

    const tide = tideRange ? deriveTideConditions(tideRange.station, tideRange.events, referenceTime) : null;

    // Always use the forecast block nearest the reference time (rather than
    // today's live reading) -- today's low tide can be hours away from "now,"
    // so the live snapshot wouldn't represent it any better than the 3-hour
    // forecast does, and using the same path for every day keeps them
    // consistent with each other.
    const block = nearestForecastBlock(forecastBlocks, referenceTime);
    const wind: NormalizedConditions['wind'] = block
      ? { speedMph: block.windSpeedMph, gustMph: null, directionDeg: block.windDeg, directionCompass: degToCompass(block.windDeg) }
      : currentWeather.wind;
    const weather: NormalizedConditions['weather'] = {
      tempF: block?.tempF ?? null,
      conditions: block?.conditions ?? null,
      sunrise: sunrise.toISOString(),
      sunset: sunset.toISOString(),
      humidity: block?.humidity ?? null,
      // UV isn't forecastable via this endpoint -- only ever available for
      // the real current instant, so only today (not "today's low tide,"
      // which may be hours off) gets a real value.
      uvIndex: isToday ? todaysUvIndex : null,
    };

    // A real NDBC buoy only ever reports its live reading -- only the
    // Open-Meteo fallback (noaaBuoys.ts) can actually anchor to referenceTime,
    // via its hourly forecast. Only today gets a real value at all; future
    // days are explicitly marked stale/null rather than reusing today's
    // reading as if it still applied to a day that hasn't happened yet.
    const waves: NormalizedConditions['waves'] = isToday
      ? (await getWaveConditions(lat, lon, referenceTime)) ?? {
          heightFt: null,
          periodSec: null,
          directionDeg: null,
          stationId: null,
          distanceFeet: null,
          observedAt: null,
          stale: true,
        }
      : { heightFt: null, periodSec: null, directionDeg: null, stationId: null, distanceFeet: null, observedAt: null, stale: true };

    const conditions: NormalizedConditions = {
      location: { lat, lon },
      tide,
      wind,
      waves,
      weather,
      moon: getMoonPhase(dayMidpoint),
      meta: { fetchedAt: now.toISOString(), expiresAt: now.toISOString(), cacheHit: false, referenceTime: referenceTime.toISOString() },
    };

    const score = computeShellingScore(conditions, referenceTime, restrictShellingToDaylight);
    entries.push({
      ...score,
      date: dayMidpoint.toISOString().slice(0, 10),
      altLowTide: altLow ? { time: altLow.time, heightFt: altLow.heightFt } : null,
    });
  }

  return entries;
}
