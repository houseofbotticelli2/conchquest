/* eslint-disable camelcase */

// Project-wide decision: express distances in feet, not meters, anywhere
// they're config or API-facing. Replaces the meter-keyed rows from the
// previous migration (editing that migration's content wouldn't affect
// environments where it already ran).
exports.up = (pgm) => {
  pgm.sql(`DELETE FROM app_config WHERE key IN ('fuzz_radius_standard_meters', 'fuzz_radius_rare_meters')`);
  pgm.sql(`
    INSERT INTO app_config (key, value, description) VALUES
      ('fuzz_radius_standard_feet', '300', 'Max random offset applied to a private find''s location on the community map.'),
      ('fuzz_radius_rare_feet', '5280', 'Max random offset applied to a rare/very_rare species find''s location on the community map, regardless of its own privacy setting.')
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DELETE FROM app_config WHERE key IN ('fuzz_radius_standard_feet', 'fuzz_radius_rare_feet')`);
  pgm.sql(`
    INSERT INTO app_config (key, value, description) VALUES
      ('fuzz_radius_standard_meters', '91.44', 'Max random offset applied to a private find''s location on the community map (default 300ft).'),
      ('fuzz_radius_rare_meters', '1609.34', 'Max random offset applied to a rare/very_rare species find''s location on the community map, regardless of its own privacy setting (default 1mi).')
  `);
};
