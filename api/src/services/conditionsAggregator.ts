import { pool } from '../config/db';
import { env } from '../config/env';
import { NormalizedConditions } from '../types';
import { ensureTideStationsSynced, ensureBuoyStationsSynced } from './noaaStations';
import { getTideConditions } from './noaaTides';
import { getWaveConditions } from './noaaBuoys';
import { getCurrentWeather } from './openWeather';
import { getMoonPhase } from './moonPhase';
import { round } from '../utils/units';

interface CacheRow {
  payload: Omit<NormalizedConditions, 'meta'> & { meta: NormalizedConditions['meta'] };
  expires_at: Date;
}

function bucket(lat: number, lon: number) {
  return { latBucket: round(lat, 2), lonBucket: round(lon, 2) };
}

async function readCache(lat: number, lon: number): Promise<NormalizedConditions | null> {
  const { latBucket, lonBucket } = bucket(lat, lon);
  const result = await pool.query<CacheRow>(
    `SELECT payload, expires_at FROM conditions_cache
     WHERE lat_bucket = $1 AND lon_bucket = $2 AND expires_at > now()
     ORDER BY fetched_at DESC LIMIT 1`,
    [latBucket, lonBucket]
  );
  const row = result.rows[0];
  if (!row) return null;
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
  const [tide, waves, currentWeather] = await Promise.all([
    getTideConditions(lat, lon, now),
    getWaveConditions(lat, lon),
    getCurrentWeather(lat, lon),
  ]);

  if (!tide) {
    throw new Error('No NOAA tide station found near this location');
  }

  const moon = getMoonPhase(now);
  const fetchedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + env.conditionsCacheTtlMinutes * 60_000).toISOString();

  const conditions: NormalizedConditions = {
    location: { lat, lon },
    tide,
    wind: currentWeather.wind,
    waves: waves ?? {
      heightFt: null,
      periodSec: null,
      directionDeg: null,
      stationId: null,
      distanceKm: null,
      observedAt: null,
      stale: true,
    },
    weather: currentWeather.weather,
    moon,
    meta: { fetchedAt, expiresAt, cacheHit: false },
  };

  await writeCache(lat, lon, conditions, tide.stationId, waves?.stationId ?? null);
  return conditions;
}
