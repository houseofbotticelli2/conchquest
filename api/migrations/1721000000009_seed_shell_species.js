/* eslint-disable camelcase */

const SPECIES = [
  {
    common_name: 'Junonia',
    scientific_name: 'Scaphella junonia',
    family: 'Volutidae',
    genus: 'Scaphella',
    rarity: 'rare',
    description:
      'One of the most sought-after shells on the Gulf Coast. White with distinctive rows of brown spots. ' +
      'Lives offshore in deep sand and is usually only found washed ashore after storms.',
    habitat: 'Offshore, deep sand, 30-60ft',
    regional_occurrence: ['Gulf'],
    seasonality: 'Post-storm, winter',
  },
  {
    common_name: 'Lightning Whelk',
    scientific_name: 'Sinistrofulgur perversum',
    family: 'Busyconidae',
    genus: 'Sinistrofulgur',
    rarity: 'uncommon',
    description:
      'A large left-handed (sinistral) whelk with brown streak markings resembling lightning bolts on younger shells. ' +
      'Common on Gulf beaches, especially after cold fronts.',
    habitat: 'Intertidal sand flats and nearshore waters',
    regional_occurrence: ['Gulf', 'Atlantic'],
    seasonality: 'Year-round, best after cold fronts',
  },
  {
    common_name: 'Sand Dollar',
    scientific_name: 'Mellita quinquiesperforata',
    family: 'Mellitidae',
    genus: 'Mellita',
    rarity: 'common',
    description:
      'A flattened sea urchin relative with a five-petal pattern on its top surface. Live sand dollars are covered ' +
      'in short purple-brown spines; bleached white "skeletons" are what most collectors find.',
    habitat: 'Shallow sandy nearshore bottoms',
    regional_occurrence: ['Gulf', 'Atlantic'],
    seasonality: 'Year-round, best at low tide',
  },
  {
    common_name: 'Florida Horse Conch',
    scientific_name: 'Triplofusus giganteus',
    family: 'Fasciolariidae',
    genus: 'Triplofusus',
    rarity: 'uncommon',
    description:
      "Florida's official state shell, and one of the largest gastropods in the world, reaching over 2 feet. " +
      'Orange-red in juveniles, fading to gray-brown with age.',
    habitat: 'Seagrass beds and nearshore sand',
    regional_occurrence: ['Gulf'],
    seasonality: 'Year-round',
  },
  {
    common_name: 'Lettered Olive',
    scientific_name: 'Americoliva sayana',
    family: 'Olividae',
    genus: 'Americoliva',
    rarity: 'common',
    description:
      "Florida's state shell — a glossy, cylindrical shell with zigzag brown markings resembling handwriting. " +
      'Often found alive, plowing just beneath the sand surface at the waterline.',
    habitat: 'Intertidal sand, just below the surface',
    regional_occurrence: ['Gulf', 'Atlantic'],
    seasonality: 'Year-round, best at low tide',
  },
  {
    common_name: 'Scotch Bonnet',
    scientific_name: 'Semicassis granulata',
    family: 'Cassidae',
    genus: 'Semicassis',
    rarity: 'uncommon',
    description:
      'A round, helmet-shaped shell with a tan-and-orange checkerboard pattern reminiscent of tartan. ' +
      'North Carolina\'s state shell, also found in the Gulf.',
    habitat: 'Sandy nearshore and offshore bottoms',
    regional_occurrence: ['Atlantic', 'Gulf'],
    seasonality: 'Post-storm',
  },
  {
    common_name: 'Fighting Conch',
    scientific_name: 'Strombus alatus',
    family: 'Strombidae',
    genus: 'Strombus',
    rarity: 'common',
    description:
      'A thick, sturdy shell with a flared, ridged outer lip and a mottled orange-brown interior. Frequently found ' +
      'alive, using its clawed foot to hop across the sand.',
    habitat: 'Seagrass beds and sandy shallows',
    regional_occurrence: ['Gulf'],
    seasonality: 'Year-round',
  },
  {
    common_name: 'Angel Wing',
    scientific_name: 'Cyrtopleura costata',
    family: 'Pholadidae',
    genus: 'Cyrtopleura',
    rarity: 'rare',
    description:
      'A fragile, pure-white bivalve with delicate rib patterns resembling feathered wings. Burrows deep in mud ' +
      'and sand, so intact matched pairs washed ashore are a prized find.',
    habitat: 'Deep burrows in mud and sand flats',
    regional_occurrence: ['Gulf', 'Atlantic'],
    seasonality: 'Post-storm',
  },
];

exports.up = async (pgm) => {
  for (const s of SPECIES) {
    await pgm.db.query(
      `INSERT INTO shell_species (common_name, scientific_name, family, genus, rarity, description, habitat, regional_occurrence, seasonality)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (scientific_name) DO UPDATE
       SET common_name = EXCLUDED.common_name,
           family = EXCLUDED.family,
           genus = EXCLUDED.genus,
           rarity = EXCLUDED.rarity,
           description = EXCLUDED.description,
           habitat = EXCLUDED.habitat,
           regional_occurrence = EXCLUDED.regional_occurrence,
           seasonality = EXCLUDED.seasonality,
           updated_at = now()`,
      [
        s.common_name,
        s.scientific_name,
        s.family,
        s.genus,
        s.rarity,
        s.description,
        s.habitat,
        s.regional_occurrence,
        s.seasonality,
      ]
    );
  }
};

// Not reversed: this upserts by scientific_name, so some of these rows may
// have pre-existed this migration (e.g. manually seeded test data) with
// shell_finds already referencing them. Deleting by scientific_name on down
// would destroy data this migration didn't create.
exports.down = () => {};
