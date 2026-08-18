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
  pgm.addColumns('users', {
    role: { type: 'text', notNull: true, default: 'user' },
  });
  pgm.addConstraint('users', 'users_role_check', "CHECK (role IN ('user', 'admin'))");
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropConstraint('users', 'users_role_check');
  pgm.dropColumns('users', ['role']);
};
