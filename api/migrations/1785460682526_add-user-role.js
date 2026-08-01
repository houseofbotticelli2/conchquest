/* eslint-disable camelcase */

/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.addColumns('users', {
    role: { type: 'text', notNull: true, default: 'user' },
  });
  pgm.addConstraint('users', 'users_role_check', "CHECK (role IN ('user', 'admin'))");
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropConstraint('users', 'users_role_check');
  pgm.dropColumns('users', ['role']);
};
