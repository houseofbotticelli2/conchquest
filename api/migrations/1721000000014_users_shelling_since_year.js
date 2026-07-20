/* eslint-disable camelcase */

// User-editable "shelling since" year, shown on Profile. Distinct from
// created_at (when their Conchquest account was made) since someone may
// have been shelling long before they joined the app -- defaults to their
// account creation year until they set their own value.
exports.up = (pgm) => {
  pgm.addColumn('users', {
    shelling_since_year: { type: 'integer' },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('users', 'shelling_since_year');
};
