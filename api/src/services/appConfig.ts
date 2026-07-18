import { pool } from '../config/db';

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
