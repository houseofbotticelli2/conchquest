import { Router } from 'express';
import { pool } from '../config/db';
import { getConditions } from '../services/conditionsAggregator';
import { computeShellingScore } from '../services/scoringEngine';

export const savedLocationsRouter = Router();

interface SavedLocationRow {
  id: string;
  name: string;
  lat: number;
  lon: number;
  city: string | null;
  notes: string | null;
  alert_threshold_score: number | null;
  is_home: boolean;
  created_at: Date;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

async function toResponse(row: SavedLocationRow) {
  const conditions = await getConditions(row.lat, row.lon);
  const result = computeShellingScore(conditions);

  const conditionSummary = result.bestWindow
    ? `Best window ${formatTime(result.bestWindow.start)}–${formatTime(result.bestWindow.end)}`
    : `${Math.round(conditions.wind.speedMph)}mph wind${conditions.waves.heightFt != null ? ` · ${conditions.waves.heightFt.toFixed(1)}ft waves` : ''}`;

  return {
    id: row.id,
    name: row.name,
    location: { lat: row.lat, lon: row.lon },
    city: row.city,
    notes: row.notes,
    alertThresholdScore: row.alert_threshold_score,
    isHome: row.is_home,
    createdAt: row.created_at,
    score: result.score,
    confidence: result.confidence,
    conditionSummary,
  };
}

const SELECT_COLUMNS = `
  id, name, ST_Y(geog::geometry) AS lat, ST_X(geog::geometry) AS lon,
  city, notes, alert_threshold_score, is_home, created_at
`;

savedLocationsRouter.get('/', async (req, res, next) => {
  try {
    const result = await pool.query<SavedLocationRow>(
      `SELECT ${SELECT_COLUMNS} FROM saved_locations WHERE user_id = $1 ORDER BY is_home DESC, created_at DESC`,
      [req.user!.id]
    );

    const enriched = await Promise.all(result.rows.map(toResponse));
    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

savedLocationsRouter.post('/', async (req, res, next) => {
  try {
    const { name, lat, lon, city, notes, alertThresholdScore } = req.body ?? {};

    if (typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    if (typeof lat !== 'number' || typeof lon !== 'number' || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      res.status(400).json({ error: 'lat and lon are required and must be valid coordinates' });
      return;
    }

    const existingCount = await pool.query<{ count: string }>(
      `SELECT count(*) FROM saved_locations WHERE user_id = $1`,
      [req.user!.id]
    );
    const isFirst = existingCount.rows[0].count === '0';

    const result = await pool.query<SavedLocationRow>(
      `INSERT INTO saved_locations (user_id, name, geog, city, notes, alert_threshold_score, is_home)
       VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography, $5, $6, $7, $8)
       RETURNING ${SELECT_COLUMNS}`,
      [req.user!.id, name.trim(), lon, lat, city?.trim() || null, notes ?? null, alertThresholdScore ?? null, isFirst]
    );

    res.status(201).json(await toResponse(result.rows[0]));
  } catch (err) {
    next(err);
  }
});

savedLocationsRouter.patch('/:id', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { name, city, notes, alertThresholdScore, isHome } = req.body ?? {};

    await client.query('BEGIN');

    if (isHome === true) {
      await client.query(`UPDATE saved_locations SET is_home = false WHERE user_id = $1`, [req.user!.id]);
    }

    const result = await client.query<SavedLocationRow>(
      `UPDATE saved_locations
       SET name = COALESCE($1, name),
           city = COALESCE($2, city),
           notes = COALESCE($3, notes),
           alert_threshold_score = COALESCE($4, alert_threshold_score),
           is_home = COALESCE($5, is_home)
       WHERE id = $6 AND user_id = $7
       RETURNING ${SELECT_COLUMNS}`,
      [name ?? null, city ?? null, notes ?? null, alertThresholdScore ?? null, isHome ?? null, req.params.id, req.user!.id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Saved beach not found' });
      return;
    }

    await client.query('COMMIT');
    res.json(await toResponse(result.rows[0]));
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

savedLocationsRouter.delete('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(`DELETE FROM saved_locations WHERE id = $1 AND user_id = $2`, [
      req.params.id,
      req.user!.id,
    ]);

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Saved beach not found' });
      return;
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
