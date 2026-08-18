/* eslint-disable camelcase */

// Minimal v1 of the UGC report/block mechanism required by Apple App Review
// Guideline 1.2 (the app has user-generated content via the community find
// map). Deliberately scoped down: content_reports supports dismiss/
// find_removed only, no account-level suspension/ban -- that's a bigger
// feature that can come later if it turns out to actually be needed.

/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  pgm.createTable('content_reports', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    reporter_user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    // Nullable + ON DELETE SET NULL: if the admin's "remove find" action
    // actually deletes the shell_finds row, the report record survives as
    // history with find_id cleared, rather than being deleted itself.
    find_id: { type: 'uuid', references: 'shell_finds', onDelete: 'SET NULL' },
    reported_user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    reason: { type: 'text', notNull: true }, // 'inappropriate_content' | 'harassment' | 'spam' | 'other'
    notes: { type: 'text' },
    status: { type: 'text', notNull: true, default: 'pending' }, // 'pending' | 'dismissed' | 'find_removed'
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    reviewed_at: { type: 'timestamptz' },
    reviewed_by_admin_id: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
  });
  pgm.createIndex('content_reports', 'status');
  pgm.createIndex('content_reports', 'reported_user_id');

  pgm.createTable('user_blocks', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    blocker_user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    blocked_user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('user_blocks', 'user_blocks_unique_pair', { unique: ['blocker_user_id', 'blocked_user_id'] });
  pgm.createIndex('user_blocks', 'blocker_user_id');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('user_blocks');
  pgm.dropTable('content_reports');
};
