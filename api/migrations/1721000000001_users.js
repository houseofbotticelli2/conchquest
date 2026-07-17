/* eslint-disable camelcase */

exports.up = (pgm) => {
  // id matches the Supabase Auth user id (JWT `sub` claim) — Supabase owns
  // the actual credential/auth.users record in its own project, this table
  // only mirrors the profile fields our app needs.
  pgm.createTable('users', {
    id: { type: 'uuid', primaryKey: true },
    email: { type: 'text', notNull: true },
    display_name: { type: 'text' },
    avatar_url: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('users', 'email', { unique: true });
};

exports.down = (pgm) => {
  pgm.dropTable('users');
};
