/* eslint-disable camelcase */

// Renamed from avatar_url, mirroring shell_finds' photo_url -> photo_key
// rename: the bucket is private, so what's stored is the object key, not a
// usable URL -- a presigned GET URL is generated fresh on every read.
exports.up = (pgm) => {
  pgm.renameColumn('users', 'avatar_url', 'avatar_key');
};

exports.down = (pgm) => {
  pgm.renameColumn('users', 'avatar_key', 'avatar_url');
};
