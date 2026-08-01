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
  // Only needed for admin-console user deletion (calling Supabase's Admin API
  // to remove the actual auth account, not just our mirrored `users` row) --
  // optional, not required(), so the main API still boots fine without it.
  // Never send this to any client; it must only ever be used server-side.
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  openWeatherApiKey: required('OPENWEATHER_API_KEY'),
  openaiApiKey: required('OPENAI_API_KEY'),
  conditionsCacheTtlMinutes: optionalNumber('CONDITIONS_CACHE_TTL_MINUTES', 20),
  strategyCacheTtlMinutes: optionalNumber('STRATEGY_CACHE_TTL_MINUTES', 1440),
  noaaStationRefreshDays: optionalNumber('NOAA_STATION_REFRESH_DAYS', 30),
  bucketUrl: required('BUCKET_ENDPOINT'),
  bucketName: required('RAILWAY_BUCKET_NAME'),
  bucketAccessKeyId: required('ACCESS_KEY_ID'),
  bucketSecretAccessKey: required('SECRET_ACCESS_KEY'),
};

export const isProduction = env.nodeEnv === 'production';
