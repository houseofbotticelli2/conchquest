/* eslint-disable camelcase */

exports.up = (pgm) => {
  pgm.addColumn('saved_locations', {
    city: { type: 'text' },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('saved_locations', 'city');
};
