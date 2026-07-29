import { NormalizedConditions, ShellingScoreResult } from '../types';
import { getTideEventsForRange, deriveTideConditions } from './noaaTides';
import { getWaveConditions } from './noaaBuoys';
import { getCurrentWeather, getForecast, ForecastBlock } from './openWeather';
import { getMoonPhase } from './moonPhase';
import { computeShellingScore } from './scoringEngine';
import { degToCompass } from '../utils/units';
import { ensureTideStationsSynced, ensureBuoyStationsSynced } from './noaaStations';

// OpenWeather's free-tier forecast endpoint only covers ~5 days at 3-hour
// resolution -- projecting further would mean fabricating data, not
// forecasting it, so this is the honest limit rather than the 7 days a
// day-strip UI might visually suggest.
const MULTI_DAY_COUNT = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface MultiDayEntry extends ShellingScoreResult {
  date: string; // YYYY-MM-DD
}

function nearestBlock(blocks: ForecastBlock[], at: Date): ForecastBlock | null {
  if (blocks.length === 0) return null;
  const atMs = at.getTime();
  return blocks.reduce((closest, block) => {
    const blockDiff = Math.abs(new Date(block.time).getTime() - atMs);
    const closestDiff = Math.abs(new Date(closest.time).getTime() - atMs);
    return blockDiff < closestDiff ? block : closest;
  }, blocks[0]);
}

export async function getMultiDayForecast(lat: number, lon: number): Promise<MultiDayEntry[]> {
  await Promise.all([ensureTideStationsSynced(), ensureBuoyStationsSynced()]);

  const now = new Date();
  const rangeBegin = new Date(now.getTime() - DAY_MS);
  const rangeEnd = new Date(now.getTime() + MULTI_DAY_COUNT * DAY_MS);

  const [tideRange, currentWeather, todaysWaves, forecastBlocks] = await Promise.all([
    getTideEventsForRange(lat, lon, rangeBegin, rangeEnd),
    getCurrentWeather(lat, lon),
    getWaveConditions(lat, lon),
    getForecast(lat, lon),
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

    const daylightLow = (tideRange?.events ?? []).find((e) => {
      if (e.type !== 'low') return false;
      const t = new Date(e.time).getTime();
      return t > sunrise.getTime() && t < sunset.getTime();
    });

    // For today, score against the real current instant (matches the
    // existing single-day /api/score behavior exactly). For future days,
    // score against that day's best window -- or midday if it has none --
    // since there's no meaningful "now" for a day that hasn't happened yet.
    // Evaluated a minute *before* the low, not at it -- deriveTideConditions'
    // nextEvents only includes events strictly after the reference time, so
    // scoring exactly at the low would drop it out of nextEvents and hide it
    // from findBestWindow entirely.
    const referenceTime = isToday
      ? now
      : new Date(daylightLow ? new Date(daylightLow.time).getTime() - 60_000 : dayMidpoint.getTime());

    const tide = tideRange ? deriveTideConditions(tideRange.station, tideRange.events, referenceTime) : null;

    let wind: NormalizedConditions['wind'];
    let weather: NormalizedConditions['weather'];
    if (isToday) {
      wind = currentWeather.wind;
      weather = currentWeather.weather;
    } else {
      const block = nearestBlock(forecastBlocks, referenceTime);
      wind = block
        ? { speedMph: block.windSpeedMph, gustMph: null, directionDeg: block.windDeg, directionCompass: degToCompass(block.windDeg) }
        : currentWeather.wind;
      weather = {
        tempF: block?.tempF ?? null,
        conditions: block?.conditions ?? null,
        sunrise: sunrise.toISOString(),
        sunset: sunset.toISOString(),
      };
    }

    // Wave forecasts don't exist -- only a live buoy reading -- so only
    // today gets a real value; future days are explicitly marked stale/null
    // rather than reusing today's reading as if it still applied.
    const waves: NormalizedConditions['waves'] = isToday
      ? todaysWaves ?? { heightFt: null, periodSec: null, directionDeg: null, stationId: null, distanceFeet: null, observedAt: null, stale: true }
      : { heightFt: null, periodSec: null, directionDeg: null, stationId: null, distanceFeet: null, observedAt: null, stale: true };

    const conditions: NormalizedConditions = {
      location: { lat, lon },
      tide,
      wind,
      waves,
      weather,
      moon: getMoonPhase(dayMidpoint),
      meta: { fetchedAt: now.toISOString(), expiresAt: now.toISOString(), cacheHit: false },
    };

    const score = computeShellingScore(conditions, referenceTime);
    entries.push({ ...score, date: dayMidpoint.toISOString().slice(0, 10) });
  }

  return entries;
}
