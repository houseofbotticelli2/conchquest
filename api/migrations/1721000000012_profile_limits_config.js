/* eslint-disable camelcase */

exports.up = (pgm) => {
  pgm.sql(`
    INSERT INTO app_config (key, value, description) VALUES
      ('recent_finds_limit', '7', 'How many finds show in the Profile screen''s Recent Finds preview.'),
      ('recent_beaches_limit', '3', 'How many beaches show in the Profile screen''s Recent Beaches preview.')
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DELETE FROM app_config WHERE key IN ('recent_finds_limit', 'recent_beaches_limit')`);
};
