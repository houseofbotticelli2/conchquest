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

// For settings whose real home is app_config: returns null when the variable
// isn't set, so callers can tell "unset" apart from "deliberately set to the
// same number as the default" and fall through to the database only in the
// first case.
function overrideNumber(name: string): number | null {
  const raw = process.env[name];
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: optionalNumber('PORT', 3000),
  databaseUrl: required('DATABASE_URL'),
  supabaseUrl: required('SUPABASE_URL'),
  // The publishable/anon key -- safe to be public (it's already hardcoded
  // client-side in admin/src/lib/supabase.ts and the mobile app) -- needed
  // here only so the admin session routes (adminSession.ts) can call
  // Supabase's password/refresh grant endpoints server-side on the admin
  // console's behalf, instead of the browser calling Supabase directly.
  supabaseAnonKey: required('SUPABASE_ANON_KEY'),
  // Only needed for admin-console user deletion (calling Supabase's Admin API
  // to remove the actual auth account, not just our mirrored `users` row) --
  // optional, not required(), so the main API still boots fine without it.
  // Never send this to any client; it must only ever be used server-side.
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  // Browser origins allowed to make credentialed (cookie-carrying) requests --
  // the admin console's cookie-session auth needs an explicit origin
  // allowlist (browsers reject credentialed requests against a wildcard
  // CORS origin). Defaults cover local dev (Vite's admin dev server + the
  // mobile app's `expo start --web` preview); add the deployed admin
  // console's real origin here once it has one.
  corsAllowedOrigins: (process.env.CORS_ALLOWED_ORIGINS ?? 'http://localhost:5173,http://localhost:8082')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  openWeatherApiKey: required('OPENWEATHER_API_KEY'),
  openaiApiKey: required('OPENAI_API_KEY'),
  // Lives in app_config now (`conditions_cache_ttl_minutes`) so it can be
  // changed without a redeploy. Setting the env var overrides the database
  // value for this process only -- which is how you tune it locally without
  // changing it for everyone, since all contributors share one database.
  // Read it via getConditionsCacheTtlMinutes(), not directly.
  conditionsCacheTtlMinutesOverride: overrideNumber('CONDITIONS_CACHE_TTL_MINUTES'),
  strategyCacheTtlMinutes: optionalNumber('STRATEGY_CACHE_TTL_MINUTES', 1440),
  noaaStationRefreshDays: optionalNumber('NOAA_STATION_REFRESH_DAYS', 30),
  bucketUrl: required('BUCKET_ENDPOINT'),
  bucketName: required('RAILWAY_BUCKET_NAME'),
  bucketAccessKeyId: required('ACCESS_KEY_ID'),
  bucketSecretAccessKey: required('SECRET_ACCESS_KEY'),
};

export const isProduction = env.nodeEnv === 'production';

// Whether this process is actually being served over a real HTTPS domain
// (any Railway deployment, regardless of what its environment is named --
// this project's is literally called "dev") vs. plain local http dev.
// Distinct from isProduction on purpose: NODE_ENV isn't set at all on
// Railway today, so isProduction alone would be false there too, which is
// wrong for anything that needs to know "am I reachable over HTTPS."
export const isHttpsDeployment = Boolean(process.env.RAILWAY_ENVIRONMENT);
