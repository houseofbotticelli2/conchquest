import { pool } from '../config/db';

export type NoaaFailureSource = 'tide' | 'buoy' | 'weather';

// Best-effort logging — a failure to record a failure must never take down
// the request that triggered it.
export async function logNoaaFailure(source: NoaaFailureSource, stationId: string | null, error: unknown): Promise<void> {
  try {
    const message = error instanceof Error ? error.message : String(error);
    await pool.query(
      `INSERT INTO noaa_fetch_failures (source, station_id, error_message) VALUES ($1, $2, $3)`,
      [source, stationId, message]
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to record NOAA failure log entry:', err instanceof Error ? err.message : err);
  }
}
