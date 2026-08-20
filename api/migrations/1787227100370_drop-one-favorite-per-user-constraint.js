/* eslint-disable camelcase */

exports.up = (pgm) => {
  // A partial unique index enforced "one home per user" at the database level.
  // Renaming the column to is_favorite left it in place, so a second favourite
  // still failed with a duplicate-key error even after the API stopped clearing
  // the previous one -- favourites are plural, so the constraint has to go too.
  pgm.dropIndex('saved_locations', 'user_id', { name: 'saved_locations_one_home_per_user' });

  // Favourites are still queried and sorted on, so keep an index -- just a
  // non-unique one.
  pgm.createIndex('saved_locations', ['user_id', 'is_favorite'], {
    name: 'saved_locations_user_favorite_idx',
  });
};

exports.down = (pgm) => {
  pgm.dropIndex('saved_locations', ['user_id', 'is_favorite'], { name: 'saved_locations_user_favorite_idx' });
  // Reverting means going back to one per user, which only works if no user
  // has more than one by then.
  pgm.createIndex('saved_locations', 'user_id', {
    name: 'saved_locations_one_home_per_user',
    unique: true,
    where: 'is_favorite = true',
  });
};
