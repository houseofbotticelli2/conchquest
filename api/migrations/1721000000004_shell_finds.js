/* eslint-disable camelcase */

exports.up = (pgm) => {
  pgm.createTable('shell_finds', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    species_id: {
      type: 'uuid',
      references: 'shell_species',
      onDelete: 'SET NULL',
    },
    geog: { type: 'geography(Point,4326)', notNull: true },
    found_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    condition: {
      type: 'text',
      check: "condition in ('pristine', 'good', 'fair', 'poor', 'fragment')",
    },
    notes: { type: 'text' },
    photo_url: { type: 'text' },
    // Exact location is private by default per PRD privacy requirements;
    // fuzzing/approximate sharing for the social feed is a later phase.
    is_private: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('shell_finds', 'user_id');
  pgm.createIndex('shell_finds', 'species_id');
  pgm.createIndex('shell_finds', 'found_at');
  pgm.createIndex('shell_finds', 'geog', { method: 'gist' });
};

exports.down = (pgm) => {
  pgm.dropTable('shell_finds');
};
