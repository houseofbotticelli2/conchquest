/* eslint-disable camelcase */

// Expo push token per user (one device at a time -- re-registering overwrites
// the previous token, matching the "log in on a new phone" case) and a
// cooldown timestamp per saved beach so the alert job doesn't re-notify every
// cycle while a beach's score stays above its threshold.
export const up = (pgm) => {
  pgm.addColumn('users', {
    push_token: { type: 'text' },
  });
  pgm.addColumn('saved_locations', {
    last_alerted_at: { type: 'timestamptz' },
  });
};

export const down = (pgm) => {
  pgm.dropColumn('saved_locations', 'last_alerted_at');
  pgm.dropColumn('users', 'push_token');
};
