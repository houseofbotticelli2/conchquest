import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: optionalNumber('PORT', 3000),
  databaseUrl: required('DATABASE_URL'),
  supabaseUrl: required('SUPABASE_URL'),
  supabaseJwtSecret: required('SUPABASE_JWT_SECRET'),
  openWeatherApiKey: required('OPENWEATHER_API_KEY'),
  conditionsCacheTtlMinutes: optionalNumber('CONDITIONS_CACHE_TTL_MINUTES', 20),
  noaaStationRefreshDays: optionalNumber('NOAA_STATION_REFRESH_DAYS', 30),
};

export const isProduction = env.nodeEnv === 'production';
