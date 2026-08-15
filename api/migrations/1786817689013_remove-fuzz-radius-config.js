/* eslint-disable camelcase */

// Location privacy is now a plain binary: public finds show their exact
// location on the community map, private finds are hidden from everyone
// but their owner. Removes the fuzz-radius config this replaces (a private
// find used to be shown, just offset within this radius; rare/very_rare
// species were always fuzzed by the larger radius regardless of their own
// privacy setting -- both behaviors are gone, not just unused).
export const shorthands = undefined;

export const up = (pgm) => {
  pgm.sql(`DELETE FROM app_config WHERE key IN ('fuzz_radius_standard_feet', 'fuzz_radius_rare_feet')`);
};

export const down = (pgm) => {
  pgm.sql(`
    INSERT INTO app_config (key, value, description) VALUES
      ('fuzz_radius_standard_feet', '300', 'Max random offset applied to a private find''s location on the community map.'),
      ('fuzz_radius_rare_feet', '5280', 'Max random offset applied to a rare/very_rare species find''s location on the community map, regardless of its own privacy setting.')
  `);
};
