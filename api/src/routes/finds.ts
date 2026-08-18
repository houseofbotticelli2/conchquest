import { Router } from 'express';
import { pool } from '../config/db';
import { getConfigNumber } from '../services/appConfig';
import { getDownloadUrl, isOwnUploadKey } from '../services/storage';
import { feetToMeters, metersToFeet } from '../utils/units';

export const findsRouter = Router();

const VALID_CONDITIONS = ['pristine', 'good', 'fair', 'poor', 'fragment'];
const DEFAULT_NEARBY_RADIUS_FEET = 16_000; // ~3mi
// This used to be a ~30mi legibility cap -- now that dense areas return
// clusters instead of a wall of individual pins, it's just a sanity bound
// (covers zooming out to see the whole contiguous US) rather than a limit
// on how far a user can actually see finds.
const MAX_NEARBY_RADIUS_FEET = 16_000_000; // ~3,030mi
// One degree of latitude is ~364,000ft everywhere; used only to size
// clustering grid cells, not for real distance math, so this doesn't need
// to account for longitude's latitude-dependent scaling.
const FEET_PER_DEGREE_LATITUDE = 364_000;

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
  thumb_key: string | null;
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
    // Small variant for lists. Falls back to the original for finds logged
    // before thumbnails existed, so old finds keep rendering.
    thumbUrl: row.thumb_key ? await getDownloadUrl(row.thumb_key) : row.photo_key ? await getDownloadUrl(row.photo_key) : null,
    isPrivate: row.is_private,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Only ever called for a public find -- a private one is hidden from
// non-owners entirely (see GET /:id), not shown with any kind of
// approximated location.
async function toCommunityResponse(row: FindRow) {
  return {
    isOwner: false as const,
    id: row.id,
    loggedByUserId: row.user_id,
    speciesId: row.species_id,
    speciesName: row.species_name,
    speciesRarity: row.species_rarity,
    loggedBy: row.logged_by,
    location: { lat: row.lat, lon: row.lon },
    foundAt: row.found_at,
    condition: row.condition,
    notes: row.notes,
    photoUrl: row.photo_key ? await getDownloadUrl(row.photo_key) : null,
    // Small variant for lists. Falls back to the original for finds logged
    // before thumbnails existed, so old finds keep rendering.
    thumbUrl: row.thumb_key ? await getDownloadUrl(row.thumb_key) : row.photo_key ? await getDownloadUrl(row.photo_key) : null,
  };
}

const SELECT_COLUMNS = `
  sf.id, sf.user_id, COALESCE(u.display_name, split_part(u.email, '@', 1)) AS logged_by,
  sf.species_id, ss.common_name AS species_name, ss.rarity AS species_rarity,
  ST_Y(sf.geog::geometry) AS lat, ST_X(sf.geog::geometry) AS lon,
  sf.found_at, sf.condition, sf.notes, sf.photo_key, sf.thumb_key, sf.is_private, sf.created_at, sf.updated_at
`;
const FROM_CLAUSE = `FROM shell_finds sf JOIN users u ON u.id = sf.user_id LEFT JOIN shell_species ss ON ss.id = sf.species_id`;

findsRouter.post('/', async (req, res, next) => {
  try {
    const { speciesId, lat, lon, foundAt, condition, notes, photoKey, thumbKey, isPrivate } = req.body ?? {};

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
    // The key has to be one we minted for *this* user. Without this the
    // caller could point a find at anyone's object: it would be handed back
    // as a presigned download URL, and deleted from the bucket if this find
    // were ever removed by moderation.
    if (!isOwnUploadKey(photoKey, req.user!.id, 'find')) {
      res.status(400).json({ error: 'photoKey does not belong to this user' });
      return;
    }
    // Optional -- an older client won't send one -- but same ownership rule.
    if (thumbKey !== undefined && thumbKey !== null) {
      if (typeof thumbKey !== 'string' || !isOwnUploadKey(thumbKey, req.user!.id, 'find')) {
        res.status(400).json({ error: 'thumbKey does not belong to this user' });
        return;
      }
    }

    const inserted = await pool.query<{ id: string }>(
      `INSERT INTO shell_finds (user_id, species_id, geog, found_at, condition, notes, photo_key, thumb_key, is_private)
       VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography, COALESCE($5, now()), $6, $7, $8, $9, COALESCE($10, true))
       RETURNING id`,
      [req.user!.id, speciesId ?? null, lon, lat, foundAt ?? null, condition ?? null, notes ?? null, photoKey ?? null, thumbKey ?? null, isPrivate ?? null]
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
  user_id: string;
  species_id: string | null;
  species_name: string | null;
  species_rarity: string | null;
  lat: number;
  lon: number;
  found_at: Date;
  condition: string | null;
  notes: string | null;
  photo_key: string | null;
  thumb_key: string | null;
  is_private: boolean;
  logged_by: string;
  distance_m: number;
}

interface ClusterRow {
  cluster_lat: number;
  cluster_lon: number;
  find_count: string;
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
    const radiusMeters = feetToMeters(radiusFeet);

    const countResult = await pool.query<{ count: string }>(
      `SELECT count(*) FROM shell_finds sf
       WHERE NOT sf.is_private
         -- An account pending deletion leaves the community straight away,
         -- even though the real purge waits out the grace period.
         AND NOT EXISTS (SELECT 1 FROM users du WHERE du.id = sf.user_id AND du.deletion_requested_at IS NOT NULL)
         AND ST_DWithin(sf.geog, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
         AND NOT EXISTS (
           SELECT 1 FROM user_blocks ub WHERE ub.blocker_user_id = $4 AND ub.blocked_user_id = sf.user_id
         )`,
      [lon, lat, radiusMeters, req.user!.id]
    );
    const matchCount = Number(countResult.rows[0].count);

    const [clusterThreshold, gridDivisions] = await Promise.all([
      getConfigNumber('map_cluster_threshold', 60),
      getConfigNumber('map_cluster_grid_divisions', 20),
    ]);

    if (matchCount > clusterThreshold) {
      const radiusDegrees = radiusFeet / FEET_PER_DEGREE_LATITUDE;
      const cellSizeDegrees = (radiusDegrees * 2) / gridDivisions;

      const clusterResult = await pool.query<ClusterRow>(
        `SELECT
           avg(ST_Y(sf.geog::geometry)) AS cluster_lat,
           avg(ST_X(sf.geog::geometry)) AS cluster_lon,
           count(*) AS find_count
         FROM shell_finds sf
         WHERE NOT sf.is_private
         -- An account pending deletion leaves the community straight away,
         -- even though the real purge waits out the grace period.
         AND NOT EXISTS (SELECT 1 FROM users du WHERE du.id = sf.user_id AND du.deletion_requested_at IS NOT NULL)
           AND ST_DWithin(sf.geog, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
           AND NOT EXISTS (
             SELECT 1 FROM user_blocks ub WHERE ub.blocker_user_id = $5 AND ub.blocked_user_id = sf.user_id
           )
         GROUP BY floor(ST_Y(sf.geog::geometry) / $4), floor(ST_X(sf.geog::geometry) / $4)
         ORDER BY find_count DESC
         LIMIT 300`,
        [lon, lat, radiusMeters, cellSizeDegrees, req.user!.id]
      );

      res.json({
        mode: 'clusters' as const,
        clusters: clusterResult.rows.map((row) => ({
          lat: Number(row.cluster_lat),
          lon: Number(row.cluster_lon),
          count: Number(row.find_count),
        })),
      });
      return;
    }

    const result = await pool.query<NearbyFindRow>(
      `SELECT
         sf.id, sf.user_id, sf.species_id, ss.common_name AS species_name, ss.rarity AS species_rarity,
         ST_Y(sf.geog::geometry) AS lat, ST_X(sf.geog::geometry) AS lon,
         sf.found_at, sf.condition, sf.notes, sf.photo_key, sf.thumb_key, sf.is_private,
         COALESCE(u.display_name, split_part(u.email, '@', 1)) AS logged_by,
         ST_Distance(sf.geog, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) AS distance_m
       FROM shell_finds sf
       JOIN users u ON u.id = sf.user_id
       LEFT JOIN shell_species ss ON ss.id = sf.species_id
       WHERE NOT sf.is_private
         -- An account pending deletion leaves the community straight away,
         -- even though the real purge waits out the grace period.
         AND NOT EXISTS (SELECT 1 FROM users du WHERE du.id = sf.user_id AND du.deletion_requested_at IS NOT NULL)
         AND ST_DWithin(sf.geog, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
         AND NOT EXISTS (
           SELECT 1 FROM user_blocks ub WHERE ub.blocker_user_id = $5 AND ub.blocked_user_id = sf.user_id
         )
       ORDER BY sf.found_at DESC
       LIMIT $4`,
      [lon, lat, radiusMeters, limit, req.user!.id]
    );

    const finds = await Promise.all(
      result.rows.map(async (row) => ({
        id: row.id,
        loggedByUserId: row.user_id,
        speciesId: row.species_id,
        speciesName: row.species_name,
        speciesRarity: row.species_rarity,
        loggedBy: row.logged_by,
        location: { lat: row.lat, lon: row.lon },
        foundAt: row.found_at,
        condition: row.condition,
        notes: row.notes,
        photoUrl: row.photo_key ? await getDownloadUrl(row.photo_key) : null,
    // Small variant for lists. Falls back to the original for finds logged
    // before thumbnails existed, so old finds keep rendering.
    thumbUrl: row.thumb_key ? await getDownloadUrl(row.thumb_key) : row.photo_key ? await getDownloadUrl(row.photo_key) : null,
        distanceFeet: Math.round(metersToFeet(row.distance_m)),
      }))
    );

    res.json({ mode: 'individual' as const, finds });
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

    // A private find is hidden from everyone but its owner -- responding
    // 404 (not a 403) so a non-owner can't distinguish "doesn't exist"
    // from "exists but is private."
    if (!isOwner && row.is_private) {
      res.status(404).json({ error: 'Find not found' });
      return;
    }

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
    // Optional here (COALESCE leaves the existing key when omitted), but when
    // supplied it must be this user's -- same reasoning as POST above.
    if (photoKey !== undefined && photoKey !== null) {
      if (typeof photoKey !== 'string' || !isOwnUploadKey(photoKey, req.user!.id, 'find')) {
        res.status(400).json({ error: 'photoKey does not belong to this user' });
        return;
      }
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
