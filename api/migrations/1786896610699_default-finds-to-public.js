/* eslint-disable camelcase */

// Purely a schema-default correctness fix, not a behavior change -- the app
// already always sends isPrivate explicitly on create (defaulting new finds
// to public, per product decision), so this default was never actually
// hit in practice. Aligning it anyway so the schema's own default matches
// what the app actually does.
export const shorthands = undefined;

export const up = (pgm) => {
  pgm.alterColumn('shell_finds', 'is_private', { default: false });
};

export const down = (pgm) => {
  pgm.alterColumn('shell_finds', 'is_private', { default: true });
};
