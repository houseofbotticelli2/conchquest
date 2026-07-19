/* eslint-disable camelcase */

// Renamed from photo_url: the bucket is private, so what's stored is the
// object key, not a usable URL -- a presigned GET URL is generated fresh on
// every read (see src/services/storage.ts).
exports.up = (pgm) => {
  pgm.renameColumn('shell_finds', 'photo_url', 'photo_key');
};

exports.down = (pgm) => {
  pgm.renameColumn('shell_finds', 'photo_key', 'photo_url');
};
