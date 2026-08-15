/* eslint-disable camelcase */

// Map screen currently caps the community-finds radius at ~30mi
// (MAX_NEARBY_RADIUS_FEET), which was a legibility cap -- zooming out
// further would just mean a wall of overlapping pins. Replacing that with
// real clustering (grouping nearby finds into a count bubble once an area
// gets dense) removes the need for a legibility cap entirely; these two
// values control when/how that grouping kicks in.
export const shorthands = undefined;

export const up = (pgm) => {
  pgm.sql(`
    INSERT INTO app_config (key, value, description) VALUES
      ('map_cluster_threshold', '60', 'If more than this many finds match a /api/finds/nearby request, return grouped clusters (with a count) instead of individual finds.'),
      ('map_cluster_grid_divisions', '20', 'When clustering, the visible radius is divided into a grid this many cells wide/tall -- higher means finer-grained (smaller, more numerous) clusters.')
  `);
};

export const down = (pgm) => {
  pgm.sql(`DELETE FROM app_config WHERE key IN ('map_cluster_threshold', 'map_cluster_grid_divisions')`);
};
