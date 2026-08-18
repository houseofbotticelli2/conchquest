/* eslint-disable camelcase */

exports.up = (pgm) => {
  // Soft delete rather than an immediate purge. Apple 5.1.1(v) requires the
  // user to be able to delete their account from inside the app, but a
  // one-tap irreversible wipe of someone's entire shelling history is a bad
  // trade: a mis-tap destroys years of finds with no recovery. Marking the
  // account instead gives a grace period to change their mind, while the
  // deletion still happens automatically and without us doing anything.
  pgm.addColumn('users', {
    deletion_requested_at: {
      type: 'timestamptz',
      notNull: false,
      comment: 'When the user asked us to delete their account. Their finds are hidden from the community immediately; the purge runs after the grace period unless they cancel.',
    },
  });

  // The purge job scans for accounts past the grace period. Partial index --
  // the overwhelming majority of rows are NULL and never need looking at.
  pgm.createIndex('users', 'deletion_requested_at', {
    name: 'users_deletion_requested_at_idx',
    where: 'deletion_requested_at IS NOT NULL',
  });
};

exports.down = (pgm) => {
  pgm.dropIndex('users', 'deletion_requested_at', { name: 'users_deletion_requested_at_idx' });
  pgm.dropColumn('users', 'deletion_requested_at');
};
