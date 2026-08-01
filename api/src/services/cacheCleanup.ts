import { pool } from '../config/db';

// Expired rows in these tables aren't deleted when they expire -- reads just
// skip them via `WHERE expires_at > now()` -- so they quietly accumulate
// forever otherwise. This only ever removes rows that are ALREADY past their
// expiry; it must never touch live entries, or it would undo the caching
// work these tables exist for.
async function clearExpiredRows(table: string): Promise<number> {
  const result = await pool.query(`DELETE FROM ${table} WHERE expires_at < now()`);
  return result.rowCount ?? 0;
}

export async function cleanExpiredCaches(): Promise<void> {
  const [conditionsCleared, strategyCleared, forecastCleared] = await Promise.all([
    clearExpiredRows('conditions_cache'),
    clearExpiredRows('shelling_strategy_cache'),
    clearExpiredRows('multi_day_forecast_cache'),
  ]);

  await pool.query(
    `INSERT INTO cache_cleanup_runs (conditions_cleared, strategy_cleared, forecast_cleared)
     VALUES ($1, $2, $3)`,
    [conditionsCleared, strategyCleared, forecastCleared]
  );

  console.log(
    `Cache cleanup: removed ${conditionsCleared} expired conditions_cache row(s), ` +
      `${strategyCleared} shelling_strategy_cache row(s), ${forecastCleared} multi_day_forecast_cache row(s).`
  );
}
