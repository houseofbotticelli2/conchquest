/* eslint-disable camelcase */

// getMultiDayForecast() (used by the Score screen, via GET /api/score/multi-day)
// calls NOAA/OpenWeather/NDBC live on every single request -- unlike the
// single-day GET /api/score route, it never used conditions_cache. Same
// caching shape as conditions_cache (JSON blob per location bucket, insert +
// TTL), reusing conditionsCacheTtlMinutes since it's the same underlying
// question: how fresh does "now" need to be for today's entry.

/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.createTable('multi_day_forecast_cache', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    lat_bucket: { type: 'numeric(5,2)', notNull: true },
    lon_bucket: { type: 'numeric(5,2)', notNull: true },
    payload: { type: 'jsonb', notNull: true },
    fetched_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    expires_at: { type: 'timestamptz', notNull: true },
  });
  pgm.createIndex('multi_day_forecast_cache', ['lat_bucket', 'lon_bucket']);
  pgm.createIndex('multi_day_forecast_cache', 'expires_at');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('multi_day_forecast_cache');
};
