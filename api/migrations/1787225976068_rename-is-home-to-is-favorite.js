/* eslint-disable camelcase */

exports.up = (pgm) => {
  // "Home" was exclusive by design -- setting one cleared every other, because
  // you have one home. Favourites are plural: a sheller rotating between three
  // or four local beaches wants them grouped at the top, not to keep anointing
  // a different single beach. The exclusivity logic goes with the rename (see
  // routes/savedLocations.ts); nothing else depended on there being only one.
  pgm.renameColumn('saved_locations', 'is_home', 'is_favorite');
};

exports.down = (pgm) => {
  pgm.renameColumn('saved_locations', 'is_favorite', 'is_home');
};
