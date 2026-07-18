import { pool } from '../config/db';
import { env } from '../config/env';
import { metersToFeet } from '../utils/units';

const NOAA_TIDE_STATIONS_URL =
  'https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=tidepredictions';
const NDBC_ACTIVE_STATIONS_URL = 'https://www.ndbc.noaa.gov/activestations.xml';

interface NearestStation {
  stationId: string;
  name: string;
  distanceFeet: number;
}

async function isStale(table: 'noaa_tide_stations' | 'ndbc_buoy_stations'): Promise<boolean> {
  const result = await pool.query<{ oldest: Date | null; count: string }>(
    `SELECT min(synced_at) AS oldest, count(*) AS count FROM ${table}`
  );
  const row = result.rows[0];
  if (!row || row.count === '0' || !row.oldest) return true;
  const ageDays = (Date.now() - new Date(row.oldest).getTime()) / 86_400_000;
  return ageDays > env.noaaStationRefreshDays;
}

interface NoaaStationRecord {
  id: string;
  name: string;
  state?: string;
  lat: number;
  lng: number;
}

export async function ensureTideStationsSynced(): Promise<void> {
  if (!(await isStale('noaa_tide_stations'))) return;

  const response = await fetch(NOAA_TIDE_STATIONS_URL);
  if (!response.ok) {
    throw new Error(`NOAA station metadata request failed: ${response.status}`);
  }
  const body = (await response.json()) as { stations: NoaaStationRecord[] };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const station of body.stations) {
      await client.query(
        `INSERT INTO noaa_tide_stations (station_id, name, state, geog, synced_at)
         VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography, now())
         ON CONFLICT (station_id) DO UPDATE
         SET name = EXCLUDED.name, state = EXCLUDED.state, geog = EXCLUDED.geog, synced_at = now()`,
        [station.id, station.name, station.state ?? null, station.lng, station.lat]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

function extractAttr(xmlFragment: string, attr: string): string | null {
  const match = xmlFragment.match(new RegExp(`${attr}="([^"]*)"`));
  return match ? match[1] : null;
}

export async function ensureBuoyStationsSynced(): Promise<void> {
  if (!(await isStale('ndbc_buoy_stations'))) return;

  const response = await fetch(NDBC_ACTIVE_STATIONS_URL);
  if (!response.ok) {
    throw new Error(`NDBC active stations request failed: ${response.status}`);
  }
  const xml = await response.text();
  const stationTags = xml.match(/<station\b[^>]*\/>/g) ?? [];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const tag of stationTags) {
      const id = extractAttr(tag, 'id');
      const lat = extractAttr(tag, 'lat');
      const lon = extractAttr(tag, 'lon');
      if (!id || !lat || !lon) continue;
      const name = extractAttr(tag, 'name');
      const met = extractAttr(tag, 'met');

      await client.query(
        `INSERT INTO ndbc_buoy_stations (station_id, name, geog, has_meteorological, synced_at)
         VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography, $5, now())
         ON CONFLICT (station_id) DO UPDATE
         SET name = EXCLUDED.name, geog = EXCLUDED.geog, has_meteorological = EXCLUDED.has_meteorological, synced_at = now()`,
        [id, name, Number(lon), Number(lat), met !== 'n']
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function findNearestTideStation(lat: number, lon: number): Promise<NearestStation | null> {
  const result = await pool.query<{ station_id: string; name: string; distance_m: number }>(
    `SELECT station_id, name, ST_Distance(geog, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) AS distance_m
     FROM noaa_tide_stations
     ORDER BY geog <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
     LIMIT 1`,
    [lon, lat]
  );
  const row = result.rows[0];
  if (!row) return null;
  return { stationId: row.station_id, name: row.name, distanceFeet: metersToFeet(row.distance_m) };
}

export async function findNearestBuoyStation(lat: number, lon: number): Promise<NearestStation | null> {
  const result = await pool.query<{ station_id: string; name: string; distance_m: number }>(
    `SELECT station_id, name, ST_Distance(geog, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) AS distance_m
     FROM ndbc_buoy_stations
     WHERE has_meteorological = true
     ORDER BY geog <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
     LIMIT 1`,
    [lon, lat]
  );
  const row = result.rows[0];
  if (!row) return null;
  return { stationId: row.station_id, name: row.name, distanceFeet: metersToFeet(row.distance_m) };
}
