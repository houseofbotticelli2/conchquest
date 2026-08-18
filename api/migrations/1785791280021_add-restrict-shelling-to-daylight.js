/* eslint-disable camelcase */

/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

// Per-user preference for whether findBestWindow (scoringEngine.ts) restricts
// the shelling window to daylight hours. Defaults to false (all hours) --
// plenty of shellers work low tides at night with a light, and the app
// previously hard-coded daylight-only with no way to opt out.
exports.up = (pgm) => {
  pgm.addColumn('users', {
    restrict_shelling_to_daylight: { type: 'boolean', notNull: true, default: false },
  });

  // multi_day_forecast_cache stores the fully-computed ShellingScoreResult
  // per day (including bestWindow), not just raw conditions -- unlike
  // conditions_cache, which only caches raw tide/wind/wave/weather data and
  // lets computeShellingScore run fresh per request. Since bestWindow bakes
  // in the daylight restriction, the cache key must include it, or two users
  // with different preferences requesting the same location would get each
  // other's cached (and wrong) result.
  pgm.addColumn('multi_day_forecast_cache', {
    restrict_shelling_to_daylight: { type: 'boolean', notNull: true, default: false },
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropColumn('multi_day_forecast_cache', 'restrict_shelling_to_daylight');
  pgm.dropColumn('users', 'restrict_shelling_to_daylight');
};
