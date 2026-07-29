/* eslint-disable camelcase */

// The previous approach (task #67) piggybacked the strategy cache on
// conditions_cache, on the assumption that a conditions_cache row would
// exist for whatever location/day the Shelling Strategy card was requested
// for. That assumption turned out to be false: the Score screen actually
// gets its data from getMultiDayForecast() (/api/score/multi-day), which
// computes conditions independently and never writes to conditions_cache at
// all (only the single-day GET /api/score route does). So the strategy
// cache never found a row to attach to, and every request silently
// regenerated via OpenAI. This gives the strategy cache its own table,
// independent of conditions_cache, keyed by location bucket + day offset
// (today/tomorrow/etc, since a multi-day selection needs its own cached
// strategy per day) with its own TTL.

/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.dropColumns('conditions_cache', ['strategy_text', 'strategy_generated_at']);

  pgm.createTable('shelling_strategy_cache', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    lat_bucket: { type: 'numeric(5,2)', notNull: true },
    lon_bucket: { type: 'numeric(5,2)', notNull: true },
    day_offset: { type: 'integer', notNull: true },
    strategy_text: { type: 'text', notNull: true },
    generated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    expires_at: { type: 'timestamptz', notNull: true },
  });
  pgm.createIndex('shelling_strategy_cache', ['lat_bucket', 'lon_bucket', 'day_offset']);
  pgm.createIndex('shelling_strategy_cache', 'expires_at');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('shelling_strategy_cache');
  pgm.addColumns('conditions_cache', {
    strategy_text: { type: 'text' },
    strategy_generated_at: { type: 'timestamptz' },
  });
};
