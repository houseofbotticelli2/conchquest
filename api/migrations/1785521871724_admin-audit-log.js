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
  pgm.createTable('admin_audit_log', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    // SET NULL, not CASCADE -- if an admin's own account is later deleted,
    // their past actions should stay in the log, not disappear with them.
    admin_id: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    admin_email: { type: 'text', notNull: true },
    action: { type: 'text', notNull: true },
    // Free text, not a foreign key -- the target (a deleted user's email, a
    // config key, a species name) often needs to remain readable even after
    // the thing it refers to no longer exists.
    target: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('admin_audit_log', 'created_at');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('admin_audit_log');
};
