import { Pool } from 'pg';
import { env, isProduction } from './env';

export const pool = new Pool({
  connectionString: env.databaseUrl,
  // Railway's public Postgres endpoint requires SSL; the private/internal
  // network endpoint does not present a verifiable cert, so we disable
  // verification rather than skip SSL outright.
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle Postgres client', err);
});
