/* eslint-disable camelcase */

/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  // Was a hardcoded constant in beachAlerts.ts (ALERT_COOLDOWN_HOURS) --
  // moved to app_config to match beach_alert_lead_time_hours, which is the
  // same kind of tunable business-logic value and was already configurable.
  pgm.sql(`
    INSERT INTO app_config (key, value, description) VALUES
      ('beach_alert_cooldown_hours', '12', 'Hours to wait before a beach that already cleared its alert threshold can trigger another notification.')
  `);

  // History of the weekly cache-cleanup job's runs, so the (future) admin
  // console has real data to show rather than nothing -- mirrors how the
  // beach alert cron's results are currently only visible via console logs.
  pgm.createTable('cache_cleanup_runs', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    ran_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    conditions_cleared: { type: 'integer', notNull: true },
    strategy_cleared: { type: 'integer', notNull: true },
    forecast_cleared: { type: 'integer', notNull: true },
  });
  pgm.createIndex('cache_cleanup_runs', 'ran_at');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('cache_cleanup_runs');
  pgm.sql(`DELETE FROM app_config WHERE key = 'beach_alert_cooldown_hours'`);
};
