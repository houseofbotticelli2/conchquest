/* eslint-disable camelcase */

exports.up = (pgm) => {
  pgm.createTable('saved_locations', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    name: { type: 'text', notNull: true },
    geog: { type: 'geography(Point,4326)', notNull: true },
    notes: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('saved_locations', 'user_id');
  pgm.createIndex('saved_locations', 'geog', { method: 'gist' });
};

exports.down = (pgm) => {
  pgm.dropTable('saved_locations');
};
