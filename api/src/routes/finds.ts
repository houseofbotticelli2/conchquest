import { Router } from 'express';
import { pool } from '../config/db';
import { getConfigNumber } from '../services/appConfig';
import { fuzzLocation } from '../utils/fuzzLocation';

export const findsRouter = Router();

const VALID_CONDITIONS = ['pristine', 'good', 'fair', 'poor', 'fragment'];
const RARE_RARITIES = ['rare', 'very_rare'];
const DEFAULT_NEARBY_RADIUS_M = 5000;
const MAX_NEARBY_RADIUS_M = 50_000;

interface FindRow {
  id: string;
  species_id: string | null;
  lat: number;
  lon: number;
  found_at: Date;
  condition: string | null;
  notes: string | null;
  photo_url: string | null;
  is_private: boolean;
  created_at: Date;
  updated_at: Date;
}

function toResponse(row: FindRow) {
  return {
    id: row.id,
    speciesId: row.species_id,
    location: { lat: row.lat, lon: row.lon },
    foundAt: row.found_at,
    condition: row.condition,
    notes: row.notes,
    photoUrl: row.photo_url,
    isPrivate: row.is_private,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_COLUMNS = `
  id, species_id, ST_Y(geog::geometry) AS lat, ST_X(geog::geometry) AS lon,
  found_at, condition, notes, photo_url, is_private, created_at, updated_at
`;

findsRouter.post('/', async (req, res, next) => {
  try {
    const { speciesId, lat, lon, foundAt, condition, notes, photoUrl, isPrivate } = req.body ?? {};

    if (typeof lat !== 'number' || typeof lon !== 'number' || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      res.status(400).json({ error: 'lat and lon are required and must be valid coordinates' });
      return;
    }
    if (condition !== undefined && !VALID_CONDITIONS.includes(condition)) {
      res.status(400).json({ error: `condition must be one of: ${VALID_CONDITIONS.join(', ')}` });
      return;
    }

    const result = await pool.query<FindRow>(
      `INSERT INTO shell_finds (user_id, species_id, geog, found_at, condition, notes, photo_url, is_private)
       VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography, COALESCE($5, now()), $6, $7, $8, COALESCE($9, true))
       RETURNING ${SELECT_COLUMNS}`,
      [req.user!.id, speciesId ?? null, lon, lat, foundAt ?? null, condition ?? null, notes ?? null, photoUrl ?? null, isPrivate ?? null]
    );

    res.status(201).json(toResponse(result.rows[0]));
  } catch (err) {
    next(err);
  }
});

findsRouter.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const result = await pool.query<FindRow>(
      `SELECT ${SELECT_COLUMNS} FROM shell_finds
       WHERE user_id = $1
       ORDER BY found_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user!.id, limit, offset]
    );

    res.json(result.rows.map(toResponse));
  } catch (err) {
    next(err);
  }
});

interface NearbyFindRow {
  id: string;
  species_id: string | null;
  species_name: string | null;
  species_rarity: string | null;
  lat: number;
  lon: number;
  found_at: Date;
  condition: string | null;
  notes: string | null;
  is_private: boolean;
  logged_by: string;
  distance_m: number;
}

findsRouter.get('/nearby', async (req, res, next) => {
  try {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      res.status(400).json({ error: 'Query params lat and lon are required and must be valid coordinates' });
      return;
    }

    const radiusMeters = Math.min(Number(req.query.radiusMeters) || DEFAULT_NEARBY_RADIUS_M, MAX_NEARBY_RADIUS_M);
    const limit = Math.min(Number(req.query.limit) || 100, 200);

    const [standardFuzzRadius, rareFuzzRadius] = await Promise.all([
      getConfigNumber('fuzz_radius_standard_meters', 91.44),
      getConfigNumber('fuzz_radius_rare_meters', 1609.34),
    ]);

    const result = await pool.query<NearbyFindRow>(
      `SELECT
         sf.id, sf.species_id, ss.common_name AS species_name, ss.rarity AS species_rarity,
         ST_Y(sf.geog::geometry) AS lat, ST_X(sf.geog::geometry) AS lon,
         sf.found_at, sf.condition, sf.notes, sf.is_private,
         COALESCE(u.display_name, split_part(u.email, '@', 1)) AS logged_by,
         ST_Distance(sf.geog, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) AS distance_m
       FROM shell_finds sf
       JOIN users u ON u.id = sf.user_id
       LEFT JOIN shell_species ss ON ss.id = sf.species_id
       WHERE ST_DWithin(sf.geog, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
       ORDER BY sf.found_at DESC
       LIMIT $4`,
      [lon, lat, radiusMeters, limit]
    );

    const finds = result.rows.map((row) => {
      const isRare = row.species_rarity !== null && RARE_RARITIES.includes(row.species_rarity);
      const fuzzRadius = isRare ? rareFuzzRadius : row.is_private ? standardFuzzRadius : 0;
      const location =
        fuzzRadius > 0 ? fuzzLocation({ lat: row.lat, lon: row.lon }, row.id, fuzzRadius) : { lat: row.lat, lon: row.lon };

      return {
        id: row.id,
        speciesId: row.species_id,
        speciesName: row.species_name,
        loggedBy: row.logged_by,
        location,
        isLocationFuzzed: fuzzRadius > 0,
        foundAt: row.found_at,
        condition: row.condition,
        notes: row.notes,
        distanceMeters: Math.round(row.distance_m),
      };
    });

    res.json(finds);
  } catch (err) {
    next(err);
  }
});

findsRouter.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query<FindRow>(
      `SELECT ${SELECT_COLUMNS} FROM shell_finds WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user!.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Find not found' });
      return;
    }

    res.json(toResponse(result.rows[0]));
  } catch (err) {
    next(err);
  }
});
