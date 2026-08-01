import { Router } from 'express';
import { pool } from '../config/db';

export const cacheCleanupRunsRouter = Router();

interface CacheCleanupRunRow {
  id: string;
  ran_at: Date;
  conditions_cleared: number;
  strategy_cleared: number;
  forecast_cleared: number;
}

cacheCleanupRunsRouter.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 200);

    const result = await pool.query<CacheCleanupRunRow>(
      `SELECT id, ran_at, conditions_cleared, strategy_cleared, forecast_cleared
       FROM cache_cleanup_runs ORDER BY ran_at DESC LIMIT $1`,
      [limit]
    );

    res.json(
      result.rows.map((row) => ({
        id: row.id,
        ranAt: row.ran_at,
        conditionsCleared: row.conditions_cleared,
        strategyCleared: row.strategy_cleared,
        forecastCleared: row.forecast_cleared,
      }))
    );
  } catch (err) {
    next(err);
  }
});
