import { Router } from 'express';
import { pool } from '../config/db';

export const noaaFailuresRouter = Router();

interface NoaaFailureRow {
  id: string;
  source: string;
  station_id: string | null;
  error_message: string;
  occurred_at: Date;
}

noaaFailuresRouter.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 200, 1000);
    const source = typeof req.query.source === 'string' ? req.query.source : undefined;

    const result = await pool.query<NoaaFailureRow>(
      source
        ? `SELECT id, source, station_id, error_message, occurred_at FROM noaa_fetch_failures WHERE source = $1 ORDER BY occurred_at DESC LIMIT $2`
        : `SELECT id, source, station_id, error_message, occurred_at FROM noaa_fetch_failures ORDER BY occurred_at DESC LIMIT $1`,
      source ? [source, limit] : [limit]
    );

    res.json(
      result.rows.map((row) => ({
        id: row.id,
        source: row.source,
        stationId: row.station_id,
        errorMessage: row.error_message,
        occurredAt: row.occurred_at,
      }))
    );
  } catch (err) {
    next(err);
  }
});
