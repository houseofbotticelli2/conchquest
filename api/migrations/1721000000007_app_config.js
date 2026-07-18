/* eslint-disable camelcase */

// Generic key/value runtime config, editable directly in Postgres (e.g. via
// Railway's Console tab) so values like fuzz radii can be tuned without a
// redeploy. api/src/services/appConfig.ts reads this with a short cache.
exports.up = (pgm) => {
  pgm.createTable('app_config', {
    key: { type: 'text', primaryKey: true },
    value: { type: 'jsonb', notNull: true },
    description: { type: 'text' },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.sql(`
    INSERT INTO app_config (key, value, description) VALUES
      ('fuzz_radius_standard_meters', '91.44', 'Max random offset applied to a private find''s location on the community map (default 300ft).'),
      ('fuzz_radius_rare_meters', '1609.34', 'Max random offset applied to a rare/very_rare species find''s location on the community map, regardless of its own privacy setting (default 1mi).')
  `);
};

exports.down = (pgm) => {
  pgm.dropTable('app_config');
};
