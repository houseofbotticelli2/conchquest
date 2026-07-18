/* eslint-disable camelcase */

exports.up = (pgm) => {
  pgm.addColumns('saved_locations', {
    alert_threshold_score: { type: 'integer' },
    is_home: { type: 'boolean', notNull: true, default: false },
  });

  // Only one home beach per user at a time.
  pgm.createIndex('saved_locations', ['user_id'], {
    name: 'saved_locations_one_home_per_user',
    unique: true,
    where: 'is_home = true',
  });
};

exports.down = (pgm) => {
  pgm.dropIndex('saved_locations', ['user_id'], { name: 'saved_locations_one_home_per_user' });
  pgm.dropColumns('saved_locations', ['alert_threshold_score', 'is_home']);
};
