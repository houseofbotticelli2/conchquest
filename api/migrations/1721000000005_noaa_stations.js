/* eslint-disable camelcase */

exports.up = (pgm) => {
  // NOAA Tides & Currents prediction stations — synced periodically from
  // https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json
  pgm.createTable('noaa_tide_stations', {
    station_id: { type: 'text', primaryKey: true },
    name: { type: 'text', notNull: true },
    state: { type: 'text' },
    geog: { type: 'geography(Point,4326)', notNull: true },
    synced_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('noaa_tide_stations', 'geog', { method: 'gist' });

  // NOAA NDBC buoy stations (real-time wave/wind observations) — synced
  // periodically from https://www.ndbc.noaa.gov/activestations.xml
  pgm.createTable('ndbc_buoy_stations', {
    station_id: { type: 'text', primaryKey: true },
    name: { type: 'text' },
    geog: { type: 'geography(Point,4326)', notNull: true },
    has_meteorological: { type: 'boolean', notNull: true, default: true },
    synced_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('ndbc_buoy_stations', 'geog', { method: 'gist' });
};

exports.down = (pgm) => {
  pgm.dropTable('ndbc_buoy_stations');
  pgm.dropTable('noaa_tide_stations');
};
