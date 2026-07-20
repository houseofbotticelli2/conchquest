/* eslint-disable camelcase */

// Tracks transient failures fetching NOAA tide/buoy/weather data so we can
// look for day-of-week/hour-of-day patterns instead of only seeing them
// scroll by in Railway's ephemeral log stream.
exports.up = (pgm) => {
  pgm.createTable('noaa_fetch_failures', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    source: { type: 'text', notNull: true }, // 'tide' | 'buoy' | 'weather'
    station_id: { type: 'text' },
    error_message: { type: 'text', notNull: true },
    occurred_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('noaa_fetch_failures', 'occurred_at');
  pgm.createIndex('noaa_fetch_failures', 'source');
};

exports.down = (pgm) => {
  pgm.dropTable('noaa_fetch_failures');
};
