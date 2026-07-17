import { Router } from 'express';
import { pool } from '../config/db';

export const findsRouter = Router();

const VALID_CONDITIONS = ['pristine', 'good', 'fair', 'poor', 'fragment'];

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
