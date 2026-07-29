import { Router } from 'express';
import { getConditions } from '../services/conditionsAggregator';
import { computeShellingScore } from '../services/scoringEngine';
import { getMultiDayForecast } from '../services/multiDayForecast';
import { parseLatLon } from '../utils/coordinates';

export const scoreRouter = Router();

scoreRouter.get('/', async (req, res, next) => {
  const coords = parseLatLon(req);
  if (!coords) {
    res.status(400).json({ error: 'Query params lat and lon are required and must be valid coordinates' });
    return;
  }

  try {
    const conditions = await getConditions(coords.lat, coords.lon);
    const result = computeShellingScore(conditions);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

scoreRouter.get('/multi-day', async (req, res, next) => {
  const coords = parseLatLon(req);
  if (!coords) {
    res.status(400).json({ error: 'Query params lat and lon are required and must be valid coordinates' });
    return;
  }

  try {
    const days = await getMultiDayForecast(coords.lat, coords.lon);
    res.json({ days });
  } catch (err) {
    next(err);
  }
});
