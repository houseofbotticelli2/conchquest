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
  // Were hardcoded constants in shellingStrategy.ts -- moved to app_config so
  // they're tunable from the admin console without a code deploy, same as
  // the other Shelling Strategy settings.
  pgm.sql(`
    INSERT INTO app_config (key, value, description) VALUES
      ('shelling_strategy_temperature', '0.5', 'OpenAI sampling temperature for the Shelling Strategy card -- higher is more varied/creative, lower is more consistent.'),
      ('shelling_strategy_max_tokens', '200', 'Max output tokens for the Shelling Strategy card. Tested against real conditions: typical responses use 110-130 tokens, so this has comfortable headroom before truncating mid-sentence.')
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.sql(`DELETE FROM app_config WHERE key IN ('shelling_strategy_temperature', 'shelling_strategy_max_tokens')`);
};
