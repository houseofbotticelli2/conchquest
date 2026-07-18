import { Router } from 'express';
import { pool } from '../config/db';

export const speciesRouter = Router();

interface SpeciesRow {
  id: string;
  common_name: string;
  scientific_name: string;
  family: string | null;
  genus: string | null;
  rarity: string;
  description: string | null;
  habitat: string | null;
  regional_occurrence: string[] | null;
  seasonality: string | null;
  image_url: string | null;
}

function toResponse(row: SpeciesRow) {
  return {
    id: row.id,
    commonName: row.common_name,
    scientificName: row.scientific_name,
    family: row.family,
    genus: row.genus,
    rarity: row.rarity,
    description: row.description,
    habitat: row.habitat,
    regionalOccurrence: row.regional_occurrence ?? [],
    seasonality: row.seasonality,
    imageUrl: row.image_url,
  };
}

const SELECT_COLUMNS = `
  id, common_name, scientific_name, family, genus, rarity, description, habitat, regional_occurrence, seasonality, image_url
`;

speciesRouter.get('/', async (req, res, next) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const rarity = typeof req.query.rarity === 'string' ? req.query.rarity : null;
    const region = typeof req.query.region === 'string' ? req.query.region : null;

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(common_name ILIKE $${params.length} OR scientific_name ILIKE $${params.length})`);
    }
    if (rarity) {
      params.push(rarity);
      conditions.push(`rarity = $${params.length}`);
    }
    if (region) {
      params.push(region);
      conditions.push(`$${params.length} = ANY(regional_occurrence)`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query<SpeciesRow>(
      `SELECT ${SELECT_COLUMNS} FROM shell_species ${where} ORDER BY common_name ASC`,
      params
    );

    res.json(result.rows.map(toResponse));
  } catch (err) {
    next(err);
  }
});

speciesRouter.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query<SpeciesRow>(`SELECT ${SELECT_COLUMNS} FROM shell_species WHERE id = $1`, [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Species not found' });
      return;
    }

    res.json(toResponse(result.rows[0]));
  } catch (err) {
    next(err);
  }
});
