/* eslint-disable camelcase */

exports.up = (pgm) => {
  pgm.createTable('conditions_cache', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    // Requests are bucketed to ~1.1km (2 decimal places) so nearby users
    // and repeat requests hit the same cache row instead of re-fetching.
    lat_bucket: { type: 'numeric(5,2)', notNull: true },
    lon_bucket: { type: 'numeric(5,2)', notNull: true },
    noaa_station_id: { type: 'text' },
    ndbc_station_id: { type: 'text' },
    payload: { type: 'jsonb', notNull: true },
    fetched_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    expires_at: { type: 'timestamptz', notNull: true },
  });

  pgm.createIndex('conditions_cache', ['lat_bucket', 'lon_bucket']);
  pgm.createIndex('conditions_cache', 'expires_at');
};

exports.down = (pgm) => {
  pgm.dropTable('conditions_cache');
};
