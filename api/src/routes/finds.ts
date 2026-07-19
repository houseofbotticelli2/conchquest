import { Router } from 'express';
import { pool } from '../config/db';
import { getConfigNumber } from '../services/appConfig';
import { getDownloadUrl } from '../services/storage';
import { fuzzLocation } from '../utils/fuzzLocation';
import { feetToMeters, metersToFeet } from '../utils/units';

export const findsRouter = Router();

const VALID_CONDITIONS = ['pristine', 'good', 'fair', 'poor', 'fragment'];
const RARE_RARITIES = ['rare', 'very_rare'];
const DEFAULT_NEARBY_RADIUS_FEET = 16_000; // ~3mi
const MAX_NEARBY_RADIUS_FEET = 160_000; // ~30mi

interface FindRow {
  id: string;
  user_id: string;
  logged_by: string;
  species_id: string | null;
  species_name: string | null;
  species_rarity: string | null;
  lat: number;
  lon: number;
  found_at: Date;
  condition: string | null;
  notes: string | null;
  photo_key: string | null;
  is_private: boolean;
  created_at: Date;
  updated_at: Date;
}

async function toResponse(row: FindRow) {
  return {
    isOwner: true as const,
    id: row.id,
    speciesId: row.species_id,
    speciesName: row.species_name,
    speciesRarity: row.species_rarity,
    location: { lat: row.lat, lon: row.lon },
    foundAt: row.found_at,
    condition: row.condition,
    notes: row.notes,
    photoUrl: row.photo_key ? await getDownloadUrl(row.photo_key) : null,
    isPrivate: row.is_private,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function toCommunityResponse(row: FindRow) {
  const [standardFuzzRadiusFeet, rareFuzzRadiusFeet] = await Promise.all([
    getConfigNumber('fuzz_radius_standard_feet', 300),
    getConfigNumber('fuzz_radius_rare_feet', 5280),
  ]);

  const isRare = row.species_rarity !== null && RARE_RARITIES.includes(row.species_rarity);
  const fuzzRadiusFeet = isRare ? rareFuzzRadiusFeet : row.is_private ? standardFuzzRadiusFeet : 0;
  const location =
    fuzzRadiusFeet > 0 ? fuzzLocation({ lat: row.lat, lon: row.lon }, row.id, feetToMeters(fuzzRadiusFeet)) : { lat: row.lat, lon: row.lon };

  return {
    isOwner: false as const,
    id: row.id,
    speciesId: row.species_id,
    speciesName: row.species_name,
    speciesRarity: row.species_rarity,
    loggedBy: row.logged_by,
    location,
    isLocationFuzzed: fuzzRadiusFeet > 0,
    foundAt: row.found_at,
    condition: row.condition,
    notes: row.notes,
    photoUrl: row.photo_key ? await getDownloadUrl(row.photo_key) : null,
  };
}

const SELECT_COLUMNS = `
  sf.id, sf.user_id, COALESCE(u.display_name, split_part(u.email, '@', 1)) AS logged_by,
  sf.species_id, ss.common_name AS species_name, ss.rarity AS species_rarity,
  ST_Y(sf.geog::geometry) AS lat, ST_X(sf.geog::geometry) AS lon,
  sf.found_at, sf.condition, sf.notes, sf.photo_key, sf.is_private, sf.created_at, sf.updated_at
`;
const FROM_CLAUSE = `FROM shell_finds sf JOIN users u ON u.id = sf.user_id LEFT JOIN shell_species ss ON ss.id = sf.species_id`;

findsRouter.post('/', async (req, res, next) => {
  try {
    const { speciesId, lat, lon, foundAt, condition, notes, photoKey, isPrivate } = req.body ?? {};

    if (typeof lat !== 'number' || typeof lon !== 'number' || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      res.status(400).json({ error: 'lat and lon are required and must be valid coordinates' });
      return;
    }
    if (condition !== undefined && !VALID_CONDITIONS.includes(condition)) {
      res.status(400).json({ error: `condition must be one of: ${VALID_CONDITIONS.join(', ')}` });
      return;
    }
    if (typeof photoKey !== 'string' || !photoKey.trim()) {
      res.status(400).json({ error: 'photoKey is required' });
      return;
    }

    const inserted = await pool.query<{ id: string }>(
      `INSERT INTO shell_finds (user_id, species_id, geog, found_at, condition, notes, photo_key, is_private)
       VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography, COALESCE($5, now()), $6, $7, $8, COALESCE($9, true))
       RETURNING id`,
      [req.user!.id, speciesId ?? null, lon, lat, foundAt ?? null, condition ?? null, notes ?? null, photoKey ?? null, isPrivate ?? null]
    );

    const result = await pool.query<FindRow>(`SELECT ${SELECT_COLUMNS} ${FROM_CLAUSE} WHERE sf.id = $1`, [
      inserted.rows[0].id,
    ]);

    res.status(201).json(await toResponse(result.rows[0]));
  } catch (err) {
    next(err);
  }
});

findsRouter.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const result = await pool.query<FindRow>(
      `SELECT ${SELECT_COLUMNS} ${FROM_CLAUSE}
       WHERE sf.user_id = $1
       ORDER BY sf.found_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user!.id, limit, offset]
    );

    res.json(await Promise.all(result.rows.map(toResponse)));
  } catch (err) {
    next(err);
  }
});

findsRouter.get('/stats', async (req, res, next) => {
  try {
    const result = await pool.query<{ total_finds: string; rare_finds: string; species_count: string }>(
      `SELECT
         COUNT(*) AS total_finds,
         COUNT(*) FILTER (WHERE ss.rarity IN ('rare', 'very_rare')) AS rare_finds,
         COUNT(DISTINCT sf.species_id) AS species_count
       FROM shell_finds sf
       LEFT JOIN shell_species ss ON ss.id = sf.species_id
       WHERE sf.user_id = $1`,
      [req.user!.id]
    );

    const row = result.rows[0];
    res.json({
      totalFinds: Number(row.total_finds),
      rareFinds: Number(row.rare_finds),
      speciesCount: Number(row.species_count),
    });
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
  photo_key: string | null;
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

    const radiusFeet = Math.min(Number(req.query.radiusFeet) || DEFAULT_NEARBY_RADIUS_FEET, MAX_NEARBY_RADIUS_FEET);
    const limit = Math.min(Number(req.query.limit) || 100, 200);

    const [standardFuzzRadiusFeet, rareFuzzRadiusFeet] = await Promise.all([
      getConfigNumber('fuzz_radius_standard_feet', 300),
      getConfigNumber('fuzz_radius_rare_feet', 5280),
    ]);

    const result = await pool.query<NearbyFindRow>(
      `SELECT
         sf.id, sf.species_id, ss.common_name AS species_name, ss.rarity AS species_rarity,
         ST_Y(sf.geog::geometry) AS lat, ST_X(sf.geog::geometry) AS lon,
         sf.found_at, sf.condition, sf.notes, sf.photo_key, sf.is_private,
         COALESCE(u.display_name, split_part(u.email, '@', 1)) AS logged_by,
         ST_Distance(sf.geog, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) AS distance_m
       FROM shell_finds sf
       JOIN users u ON u.id = sf.user_id
       LEFT JOIN shell_species ss ON ss.id = sf.species_id
       WHERE ST_DWithin(sf.geog, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
       ORDER BY sf.found_at DESC
       LIMIT $4`,
      [lon, lat, feetToMeters(radiusFeet), limit]
    );

    const finds = await Promise.all(
      result.rows.map(async (row) => {
        const isRare = row.species_rarity !== null && RARE_RARITIES.includes(row.species_rarity);
        const fuzzRadiusFeet = isRare ? rareFuzzRadiusFeet : row.is_private ? standardFuzzRadiusFeet : 0;
        const location =
          fuzzRadiusFeet > 0
            ? fuzzLocation({ lat: row.lat, lon: row.lon }, row.id, feetToMeters(fuzzRadiusFeet))
            : { lat: row.lat, lon: row.lon };

        return {
          id: row.id,
          speciesId: row.species_id,
          speciesName: row.species_name,
          speciesRarity: row.species_rarity,
          loggedBy: row.logged_by,
          location,
          isLocationFuzzed: fuzzRadiusFeet > 0,
          foundAt: row.found_at,
          condition: row.condition,
          notes: row.notes,
          photoUrl: row.photo_key ? await getDownloadUrl(row.photo_key) : null,
          distanceFeet: Math.round(metersToFeet(row.distance_m)),
        };
      })
    );

    res.json(finds);
  } catch (err) {
    next(err);
  }
});

findsRouter.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query<FindRow>(`SELECT ${SELECT_COLUMNS} ${FROM_CLAUSE} WHERE sf.id = $1`, [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Find not found' });
      return;
    }

    const row = result.rows[0];
    const isOwner = row.user_id === req.user!.id;
    res.json(isOwner ? await toResponse(row) : await toCommunityResponse(row));
  } catch (err) {
    next(err);
  }
});

findsRouter.patch('/:id', async (req, res, next) => {
  try {
    const { speciesId, condition, notes, photoKey, isPrivate } = req.body ?? {};

    if (condition !== undefined && condition !== null && !VALID_CONDITIONS.includes(condition)) {
      res.status(400).json({ error: `condition must be one of: ${VALID_CONDITIONS.join(', ')}` });
      return;
    }

    const result = await pool.query<{ id: string }>(
      `UPDATE shell_finds
       SET species_id = COALESCE($1, species_id),
           condition = COALESCE($2, condition),
           notes = COALESCE($3, notes),
           photo_key = COALESCE($4, photo_key),
           is_private = COALESCE($5, is_private),
           updated_at = now()
       WHERE id = $6 AND user_id = $7
       RETURNING id`,
      [speciesId ?? null, condition ?? null, notes ?? null, photoKey ?? null, isPrivate ?? null, req.params.id, req.user!.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Find not found' });
      return;
    }

    const updated = await pool.query<FindRow>(`SELECT ${SELECT_COLUMNS} ${FROM_CLAUSE} WHERE sf.id = $1`, [
      result.rows[0].id,
    ]);

    res.json(await toResponse(updated.rows[0]));
  } catch (err) {
    next(err);
  }
});
