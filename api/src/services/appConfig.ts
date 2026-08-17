import { pool } from '../config/db';
import { env } from '../config/env';

const CACHE_TTL_MS = 30_000;
const cache = new Map<string, { value: unknown; expiresAt: number }>();

async function getConfigValue(key: string): Promise<unknown | null> {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const result = await pool.query<{ value: unknown }>('SELECT value FROM app_config WHERE key = $1', [key]);
  const value = result.rows[0]?.value ?? null;
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

export async function getConfigNumber(key: string, fallback: number): Promise<number> {
  const value = await getConfigValue(key);
  return typeof value === 'number' ? value : fallback;
}

export async function getConfigString(key: string, fallback: string): Promise<string> {
  const value = await getConfigValue(key);
  return typeof value === 'string' ? value : fallback;
}

/**
 * How long cached conditions and multi-day forecasts stay fresh, in minutes.
 *
 * Read through here rather than off `env` directly: it's tuned from the admin
 * console, and it has two call sites (conditionsAggregator and
 * multiDayForecast) that must agree -- they write expiry into two different
 * cache tables for what is, to a user, the same data.
 *
 * The env var wins when set so a developer can shorten it locally without
 * changing it for production, since we all share one database.
 */
export async function getConditionsCacheTtlMinutes(): Promise<number> {
  return env.conditionsCacheTtlMinutesOverride
    ?? getConfigNumber('conditions_cache_ttl_minutes', 20);
}
