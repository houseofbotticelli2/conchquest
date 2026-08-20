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
  is_favorite: boolean;
  created_at: Date;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

async function toResponse(row: SavedLocationRow, restrictShellingToDaylight: boolean) {
  const conditions = await getConditions(row.lat, row.lon);
  const result = computeShellingScore(conditions, new Date(conditions.meta.referenceTime), restrictShellingToDaylight);

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
    isFavorite: row.is_favorite,
    createdAt: row.created_at,
    score: result.score,
    confidence: result.confidence,
    conditionSummary,
  };
}

const SELECT_COLUMNS = `
  id, name, ST_Y(geog::geometry) AS lat, ST_X(geog::geometry) AS lon,
  city, notes, alert_threshold_score, is_favorite, created_at
`;

savedLocationsRouter.get('/', async (req, res, next) => {
  try {
    // My Beaches wants favourites grouped at the top; Profile's "Recent
    // beaches" wants what it says. That difference only matters because the
    // limit is applied in SQL -- sorting client-side would already have
    // received the wrong rows. Favourites-first stays the default so existing
    // callers are unaffected.
    const sort = req.query.sort === 'recent' ? 'recent' : 'default';

    const rawLimit = req.query.limit;
    let limit: number | null = null;
    if (rawLimit !== undefined) {
      const parsed = Number(rawLimit);
      if (!Number.isInteger(parsed) || parsed < 1) {
        res.status(400).json({ error: 'Query param limit must be a positive integer' });
        return;
      }
      limit = parsed;
    }

    // Applying the limit in SQL (rather than fetching every saved beach and
    // slicing client-side) matters here because each row's response requires
    // a live conditions/score computation (see toResponse below) -- fetching
    // unbounded rows means computing that for beaches that won't even be
    // displayed, which is expensive on any conditions_cache miss.
    const result = await pool.query<SavedLocationRow>(
      `SELECT ${SELECT_COLUMNS} FROM saved_locations WHERE user_id = $1
       ORDER BY ${sort === 'recent' ? '' : 'is_favorite DESC,'} created_at DESC
       ${limit !== null ? 'LIMIT $2' : ''}`,
      limit !== null ? [req.user!.id, limit] : [req.user!.id]
    );

    const enriched = await Promise.all(result.rows.map((row) => toResponse(row, req.user!.restrictShellingToDaylight)));
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
      `INSERT INTO saved_locations (user_id, name, geog, city, notes, alert_threshold_score, is_favorite)
       VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography, $5, $6, $7, $8)
       RETURNING ${SELECT_COLUMNS}`,
      [req.user!.id, name.trim(), lon, lat, city?.trim() || null, notes ?? null, alertThresholdScore ?? null, isFirst]
    );

    res.status(201).json(await toResponse(result.rows[0], req.user!.restrictShellingToDaylight));
  } catch (err) {
    next(err);
  }
});

savedLocationsRouter.patch('/:id', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { name, city, notes, alertThresholdScore, isFavorite, lat, lon } = req.body ?? {};

    const hasLat = lat !== undefined;
    const hasLon = lon !== undefined;
    if (hasLat !== hasLon) {
      res.status(400).json({ error: 'lat and lon must both be provided together' });
      return;
    }
    if (hasLat && (typeof lat !== 'number' || typeof lon !== 'number' || lat < -90 || lat > 90 || lon < -180 || lon > 180)) {
      res.status(400).json({ error: 'lat and lon must be valid coordinates' });
      return;
    }

    await client.query('BEGIN');


    // geog can't be COALESCE'd against a possibly-null parameter the way the
    // other columns are -- when lat/lon aren't provided, this expression
    // must evaluate to the column's current value, not a NULL point.
    const result = await client.query<SavedLocationRow>(
      `UPDATE saved_locations
       SET name = COALESCE($1, name),
           city = COALESCE($2, city),
           notes = COALESCE($3, notes),
           alert_threshold_score = COALESCE($4, alert_threshold_score),
           is_favorite = COALESCE($5, is_favorite),
           geog = CASE WHEN $6::double precision IS NOT NULL
                       THEN ST_SetSRID(ST_MakePoint($7, $6), 4326)::geography
                       ELSE geog END
       WHERE id = $8 AND user_id = $9
       RETURNING ${SELECT_COLUMNS}`,
      [
        name ?? null,
        city ?? null,
        notes ?? null,
        alertThresholdScore ?? null,
        isFavorite ?? null,
        hasLat ? lat : null,
        hasLat ? lon : null,
        req.params.id,
        req.user!.id,
      ]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Saved beach not found' });
      return;
    }

    await client.query('COMMIT');
    res.json(await toResponse(result.rows[0], req.user!.restrictShellingToDaylight));
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
