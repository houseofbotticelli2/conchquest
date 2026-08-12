import { pool } from '../config/db';
import { env } from '../config/env';
import { NormalizedConditions } from '../types';
import { ensureTideStationsSynced, ensureBuoyStationsSynced } from './noaaStations';
import { getTideEventsForRange, deriveTideConditions, findScoringReferenceTime } from './noaaTides';
import { getWaveConditions } from './noaaBuoys';
import { getCurrentWeather, getForecast, getUvIndex, nearestForecastBlock } from './openWeather';
import { getMoonPhase } from './moonPhase';
import { round, degToCompass } from '../utils/units';

interface CacheRow {
  payload: Omit<NormalizedConditions, 'meta'> & { meta: NormalizedConditions['meta'] };
  expires_at: Date;
}

function bucket(lat: number, lon: number) {
  return { latBucket: round(lat, 2), lonBucket: round(lon, 2) };
}

const DAY_MS = 24 * 60 * 60 * 1000;

async function readCache(lat: number, lon: number): Promise<NormalizedConditions | null> {
  const { latBucket, lonBucket } = bucket(lat, lon);
  const result = await pool.query<CacheRow>(
    `SELECT payload, expires_at FROM conditions_cache
     WHERE lat_bucket = $1 AND lon_bucket = $2 AND expires_at > now()
     ORDER BY fetched_at DESC LIMIT 1`,
    [latBucket, lonBucket]
  );
  const row = result.rows[0];
  if (!row) {
    console.log(`[conditions-cache] MISS bucket=${latBucket},${lonBucket}`);
    return null;
  }
  console.log(`[conditions-cache] HIT bucket=${latBucket},${lonBucket} expiresAt=${row.expires_at.toISOString()}`);
  return { ...row.payload, meta: { ...row.payload.meta, cacheHit: true } };
}

async function writeCache(
  lat: number,
  lon: number,
  payload: NormalizedConditions,
  noaaStationId: string | null,
  ndbcStationId: string | null
): Promise<void> {
  const { latBucket, lonBucket } = bucket(lat, lon);
  console.log(`[conditions-cache] WRITE bucket=${latBucket},${lonBucket} expiresAt=${payload.meta.expiresAt}`);
  await pool.query(
    `INSERT INTO conditions_cache (lat_bucket, lon_bucket, noaa_station_id, ndbc_station_id, payload, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [latBucket, lonBucket, noaaStationId, ndbcStationId, JSON.stringify(payload), payload.meta.expiresAt]
  );
}

export async function getConditions(lat: number, lon: number): Promise<NormalizedConditions> {
  const cached = await readCache(lat, lon);
  if (cached) return cached;

  await Promise.all([ensureTideStationsSynced(), ensureBuoyStationsSynced()]);

  const now = new Date();
  const rangeBegin = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const rangeEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const [tideRange, currentWeather, uvIndex, forecastBlocks] = await Promise.all([
    getTideEventsForRange(lat, lon, rangeBegin, rangeEnd),
    getCurrentWeather(lat, lon),
    getUvIndex(lat, lon),
    getForecast(lat, lon),
  ]);

  // Score against the day's best (lowest) low tide, not the literal instant
  // this was fetched -- uses the exact same solar-noon-centered day window
  // as multiDayForecast.ts's day-0 entry, so the same beach doesn't show a
  // different score/breakdown depending on which screen asked for it.
  const baseSunrise = new Date(currentWeather.weather.sunrise);
  let baseSunset = new Date(currentWeather.weather.sunset);
  if (baseSunset.getTime() < baseSunrise.getTime()) baseSunset = new Date(baseSunset.getTime() + DAY_MS);
  const dayMidpoint = new Date((baseSunrise.getTime() + baseSunset.getTime()) / 2);
  const dayStart = new Date(dayMidpoint.getTime() - 12 * 60 * 60 * 1000);
  const dayEnd = new Date(dayMidpoint.getTime() + 12 * 60 * 60 * 1000);
  const referenceTime = tideRange ? findScoringReferenceTime(tideRange.events, dayStart, dayEnd) : now;
  const tide = tideRange ? deriveTideConditions(tideRange.station, tideRange.events, referenceTime) : null;

  // Fetched after referenceTime is known -- the Open-Meteo fallback (a real
  // NDBC buoy can't do this, it only ever reports live) anchors to that
  // instant rather than always answering for right now.
  const waves = await getWaveConditions(lat, lon, referenceTime);

  // Nearest forecast block to the reference time, not the live reading --
  // the low tide can be hours away from "now," so the live snapshot isn't
  // necessarily any more accurate than the 3-hour forecast for that moment.
  // Falls back to the live reading only if no forecast block exists at all.
  const block = nearestForecastBlock(forecastBlocks, referenceTime);
  const wind: NormalizedConditions['wind'] = block
    ? { speedMph: block.windSpeedMph, gustMph: null, directionDeg: block.windDeg, directionCompass: degToCompass(block.windDeg) }
    : currentWeather.wind;

  const moon = getMoonPhase(referenceTime);
  const fetchedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + env.conditionsCacheTtlMinutes * 60_000).toISOString();

  const conditions: NormalizedConditions = {
    location: { lat, lon },
    tide,
    wind,
    // No wave forecast exists, ever -- only a live buoy reading -- so this
    // stays the live value regardless of how far off the reference time is.
    waves: waves ?? {
      heightFt: null,
      periodSec: null,
      directionDeg: null,
      stationId: null,
      distanceFeet: null,
      observedAt: null,
      stale: true,
    },
    weather: {
      tempF: block?.tempF ?? currentWeather.weather.tempF,
      conditions: block?.conditions ?? currentWeather.weather.conditions,
      sunrise: currentWeather.weather.sunrise,
      sunset: currentWeather.weather.sunset,
      humidity: block?.humidity ?? currentWeather.weather.humidity,
      uvIndex,
    },
    moon,
    meta: { fetchedAt, expiresAt, cacheHit: false, referenceTime: referenceTime.toISOString() },
  };

  await writeCache(lat, lon, conditions, tideRange?.station.stationId ?? null, waves?.stationId ?? null);
  return conditions;
}
