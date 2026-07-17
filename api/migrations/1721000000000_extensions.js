/* eslint-disable camelcase */

exports.up = (pgm) => {
  pgm.createExtension('postgis', { ifNotExists: true });
  pgm.createExtension('pgcrypto', { ifNotExists: true });
};

exports.down = (pgm) => {
  pgm.dropExtension('pgcrypto', { ifExists: true });
  pgm.dropExtension('postgis', { ifExists: true });
};
