/* eslint-disable camelcase */

exports.up = (pgm) => {
  pgm.createTable('shell_species', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    common_name: { type: 'text', notNull: true },
    scientific_name: { type: 'text', notNull: true },
    family: { type: 'text' },
    genus: { type: 'text' },
    rarity: {
      type: 'text',
      notNull: true,
      default: 'common',
      check: "rarity in ('common', 'uncommon', 'rare', 'very_rare')",
    },
    description: { type: 'text' },
    habitat: { type: 'text' },
    regional_occurrence: { type: 'text[]' },
    seasonality: { type: 'text' },
    image_url: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('shell_species', 'scientific_name', { unique: true });
  pgm.createIndex('shell_species', 'common_name');
};

exports.down = (pgm) => {
  pgm.dropTable('shell_species');
};
