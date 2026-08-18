/* eslint-disable camelcase */

exports.up = (pgm) => {
  // Lists show a photo at ~64px; the originals average 1.3MB and run to 2.9MB,
  // so every list was downloading full-resolution photos to render thumbnails.
  // Originals stay untouched -- PhotoViewer genuinely uses them for zooming
  // into a shell's sculpture, which is the point of the app.
  //
  // Nullable on purpose: finds logged before this shipped have no thumbnail,
  // and a null says so honestly. Deriving the name by convention would mean
  // guessing and 404ing on every old find.
  pgm.addColumn('shell_finds', {
    thumb_key: {
      type: 'text',
      notNull: false,
      comment: 'Small variant for list views. Null for finds logged before thumbnails existed -- callers fall back to photo_key.',
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('shell_finds', 'thumb_key');
};
