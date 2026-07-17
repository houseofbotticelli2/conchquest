import { Router } from 'express';
import { getConditions } from '../services/conditionsAggregator';
import { parseLatLon } from '../utils/coordinates';

export const conditionsRouter = Router();

conditionsRouter.get('/', async (req, res, next) => {
  const coords = parseLatLon(req);
  if (!coords) {
    res.status(400).json({ error: 'Query params lat and lon are required and must be valid coordinates' });
    return;
  }

  try {
    const conditions = await getConditions(coords.lat, coords.lon);
    res.json(conditions);
  } catch (err) {
    next(err);
  }
});
