import { Router } from 'express';
import { getReverseGeocode } from '../services/openWeather';
import { parseLatLon } from '../utils/coordinates';

export const geocodeRouter = Router();

geocodeRouter.get('/reverse', async (req, res, next) => {
  const coords = parseLatLon(req);
  if (!coords) {
    res.status(400).json({ error: 'Query params lat and lon are required and must be valid coordinates' });
    return;
  }

  try {
    const city = await getReverseGeocode(coords.lat, coords.lon);
    res.json({ city });
  } catch (err) {
    next(err);
  }
});
