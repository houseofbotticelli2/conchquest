/* eslint-disable camelcase */

export const up = (pgm) => {
  pgm.addColumn('saved_locations', {
    city: { type: 'text' },
  });
};

export const down = (pgm) => {
  pgm.dropColumn('saved_locations', 'city');
};
