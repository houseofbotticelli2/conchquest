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

// Stations NDBC's own activestations.xml still lists as active/met-capable,
// but which never actually have a live realtime2.txt data file -- confirmed
// via ~2000 repeated 404s in noaa_fetch_failures over several weeks, not a
// transient blip. Excluded from candidate selection entirely so a nearby
// beach gets the next-real-nearest buoy (or the Open-Meteo fallback)
// instead of a guaranteed failed fetch every time.
const KNOWN_DEAD_BUOY_STATIONS = ['rkxf1'];

/**
 * Has it been long enough since we last completed a sync?
 *
 * Deliberately max(synced_at), not min(). min() asks "is any row old?", and
 * the answer is permanently yes: a station NOAA retires stops appearing in the
 * feed, so the sync never touches its row again and its timestamp is frozen
 * forever. On 2026-08-17 that turned into an outage -- eight buoys retired
 * since July made the table look 30 days stale on every request, so every
 * request started its own full re-sync, and those transactions deadlocked
 * against each other until the connection pool was exhausted and the whole API
 * stalled. The question worth asking is "when did we last finish a sync",
 * which is max().
 */
async function isStale(table: 'noaa_tide_stations' | 'ndbc_buoy_stations'): Promise<boolean> {
  const result = await pool.query<{ newest: Date | null; count: string }>(
    `SELECT max(synced_at) AS newest, count(*) AS count FROM ${table}`
  );
  const row = result.rows[0];
  if (!row || row.count === '0' || !row.newest) return true;
  const ageDays = (Date.now() - new Date(row.newest).getTime()) / 86_400_000;
  return ageDays > env.noaaStationRefreshDays;
}

// Arbitrary but fixed keys; only these two call sites use them.
const ADVISORY_LOCK_KEYS = { noaa_tide_stations: 811001, ndbc_buoy_stations: 811002 } as const;

// In-process de-duplication. Without it, every request that arrives during a
// sync starts its own -- the thundering herd that caused the outage above.
const inFlight = new Map<string, Promise<void>>();

/**
 * Runs `sync` at most once at a time, across both this process and any other.
 *
 * The in-process map handles concurrent requests here; the Postgres advisory
 * lock handles a second container doing the same thing. If someone else holds
 * the lock we return immediately rather than waiting -- station metadata that
 * is a few minutes stale is completely harmless, and queueing is precisely how
 * requests piled up last time.
 */
async function syncOnce(table: keyof typeof ADVISORY_LOCK_KEYS, sync: () => Promise<void>): Promise<void> {
  const existing = inFlight.get(table);
  if (existing) return existing;

  const run = (async () => {
    const client = await pool.connect();
    try {
      const { rows } = await client.query<{ acquired: boolean }>(
        'SELECT pg_try_advisory_lock($1) AS acquired',
        [ADVISORY_LOCK_KEYS[table]]
      );
      if (!rows[0]?.acquired) return; // another instance is already on it
      try {
        await sync();
      } finally {
        await client.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_KEYS[table]]);
      }
    } finally {
      client.release();
      inFlight.delete(table);
    }
  })();

  inFlight.set(table, run);
  return run;
}

/**
 * A refresh failure should not take down scoring when we already have station
 * data. The rows are only metadata -- a name and a position -- and month-old
 * coordinates are far better than a 500. Only rethrow when the table is empty,
 * because then there is genuinely nothing to work with.
 */
async function refreshFailureIsFatal(table: keyof typeof ADVISORY_LOCK_KEYS): Promise<boolean> {
  const { rows } = await pool.query<{ count: string }>(`SELECT count(*) AS count FROM ${table}`);
  return rows[0]?.count === '0';
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

  await syncOnce('noaa_tide_stations', async () => {
    try {
      const response = await fetch(NOAA_TIDE_STATIONS_URL);
      if (!response.ok) {
        throw new Error(`NOAA station metadata request failed: ${response.status}`);
      }
      const body = (await response.json()) as { stations: NoaaStationRecord[] };

      // One statement instead of one per station. The old row-at-a-time loop
      // held a transaction open across ~3,500 round trips, which is what gave
      // concurrent syncs so long to deadlock against each other.
      await pool.query(
        `INSERT INTO noaa_tide_stations (station_id, name, state, geog, synced_at)
         SELECT s.id, s.name, s.state,
                ST_SetSRID(ST_MakePoint(s.lon, s.lat), 4326)::geography, now()
         FROM unnest($1::text[], $2::text[], $3::text[], $4::float8[], $5::float8[])
              AS s(id, name, state, lon, lat)
         ON CONFLICT (station_id) DO UPDATE
         SET name = EXCLUDED.name, state = EXCLUDED.state, geog = EXCLUDED.geog, synced_at = now()`,
        [
          body.stations.map((s) => s.id),
          body.stations.map((s) => s.name),
          body.stations.map((s) => s.state ?? null),
          body.stations.map((s) => s.lng),
          body.stations.map((s) => s.lat),
        ]
      );
    } catch (err) {
      if (await refreshFailureIsFatal('noaa_tide_stations')) throw err;
      console.error('Tide station refresh failed; continuing on existing data:', err);
    }
  });
}

function extractAttr(xmlFragment: string, attr: string): string | null {
  const match = xmlFragment.match(new RegExp(`${attr}="([^"]*)"`));
  return match ? match[1] : null;
}

export async function ensureBuoyStationsSynced(): Promise<void> {
  if (!(await isStale('ndbc_buoy_stations'))) return;

  await syncOnce('ndbc_buoy_stations', async () => {
    try {
      const response = await fetch(NDBC_ACTIVE_STATIONS_URL);
      if (!response.ok) {
        throw new Error(`NDBC active stations request failed: ${response.status}`);
      }
      const xml = await response.text();
      const stationTags = xml.match(/<station\b[^>]*\/>/g) ?? [];

      const ids: string[] = [];
      const names: (string | null)[] = [];
      const lons: number[] = [];
      const lats: number[] = [];
      const mets: boolean[] = [];
      for (const tag of stationTags) {
        const id = extractAttr(tag, 'id');
        const lat = extractAttr(tag, 'lat');
        const lon = extractAttr(tag, 'lon');
        if (!id || !lat || !lon) continue;
        ids.push(id);
        names.push(extractAttr(tag, 'name'));
        lons.push(Number(lon));
        lats.push(Number(lat));
        mets.push(extractAttr(tag, 'met') !== 'n');
      }

      // A feed that came back suspiciously empty must not be allowed to delete
      // the station list below. Treat it as a failed refresh instead.
      if (ids.length === 0) throw new Error('NDBC active stations feed contained no usable stations');

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          `INSERT INTO ndbc_buoy_stations (station_id, name, geog, has_meteorological, synced_at)
           SELECT s.id, s.name,
                  ST_SetSRID(ST_MakePoint(s.lon, s.lat), 4326)::geography, s.met, now()
           FROM unnest($1::text[], $2::text[], $3::float8[], $4::float8[], $5::bool[])
                AS s(id, name, lon, lat, met)
           ON CONFLICT (station_id) DO UPDATE
           SET name = EXCLUDED.name, geog = EXCLUDED.geog,
               has_meteorological = EXCLUDED.has_meteorological, synced_at = now()`,
          [ids, names, lons, lats, mets]
        );

        // Drop stations NDBC no longer lists. Previously they lingered forever,
        // which is how a retired buoy could still be picked as someone's
        // "nearest" and then 404 on every reading (see KNOWN_DEAD_BUOY_STATIONS,
        // a hand-maintained list that existed only because of this). Nothing
        // references these rows by foreign key -- they are pure metadata.
        const pruned = await client.query(
          `DELETE FROM ndbc_buoy_stations WHERE station_id <> ALL($1::text[])`,
          [ids]
        );
        if (pruned.rowCount) console.log(`Pruned ${pruned.rowCount} retired NDBC station(s).`);

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (err) {
      if (await refreshFailureIsFatal('ndbc_buoy_stations')) throw err;
      console.error('Buoy station refresh failed; continuing on existing data:', err);
    }
  });
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
     WHERE has_meteorological = true AND NOT (station_id = ANY($3))
     ORDER BY geog <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
     LIMIT 1`,
    [lon, lat, KNOWN_DEAD_BUOY_STATIONS]
  );
  const row = result.rows[0];
  if (!row) return null;
  return { stationId: row.station_id, name: row.name, distanceFeet: metersToFeet(row.distance_m) };
}
