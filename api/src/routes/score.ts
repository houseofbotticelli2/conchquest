import { Router } from 'express';
import { getConditions } from '../services/conditionsAggregator';
import { computeShellingScore } from '../services/scoringEngine';
import { getMultiDayForecast } from '../services/multiDayForecast';
import { getHourlyTrend } from '../services/hourlyTrend';
import { getShellingStrategy } from '../services/shellingStrategy';
import { parseLatLon } from '../utils/coordinates';
import { ShellingScoreResult } from '../types';

export const scoreRouter = Router();

scoreRouter.get('/', async (req, res, next) => {
  const coords = parseLatLon(req);
  if (!coords) {
    res.status(400).json({ error: 'Query params lat and lon are required and must be valid coordinates' });
    return;
  }

  try {
    const conditions = await getConditions(coords.lat, coords.lon);
    const result = computeShellingScore(conditions, new Date(conditions.meta.referenceTime), req.user!.restrictShellingToDaylight);
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
    const days = await getMultiDayForecast(coords.lat, coords.lon, req.user!.restrictShellingToDaylight);
    res.json({ days });
  } catch (err) {
    next(err);
  }
});

scoreRouter.get('/hourly', async (req, res, next) => {
  const coords = parseLatLon(req);
  if (!coords) {
    res.status(400).json({ error: 'Query params lat and lon are required and must be valid coordinates' });
    return;
  }
  const dayOffset = Number(req.query.dayOffset ?? 0);
  if (!Number.isInteger(dayOffset) || dayOffset < 0) {
    res.status(400).json({ error: 'Query param dayOffset must be a non-negative integer' });
    return;
  }

  try {
    const blocks = await getHourlyTrend(coords.lat, coords.lon, dayOffset);
    res.json({ blocks });
  } catch (err) {
    next(err);
  }
});

scoreRouter.post('/strategy', async (req, res, next) => {
  const { result, beachLabel, dayLabel, bestWindowStart, bestWindowEnd, dayOffset, bestWindowAlreadyPassed } = (req.body ?? {}) as {
    result?: ShellingScoreResult;
    beachLabel?: string;
    dayLabel?: string;
    bestWindowStart?: string | null;
    bestWindowEnd?: string | null;
    dayOffset?: number;
    bestWindowAlreadyPassed?: boolean;
  };

  if (!result || typeof result !== 'object' || !Array.isArray(result.factors) || !result.conditions?.location) {
    res.status(400).json({ error: 'Body must include a valid "result" (ShellingScoreResult)' });
    return;
  }
  if (typeof beachLabel !== 'string' || typeof dayLabel !== 'string') {
    res.status(400).json({ error: 'Body must include string "beachLabel" and "dayLabel"' });
    return;
  }
  if (typeof dayOffset !== 'number' || !Number.isInteger(dayOffset) || dayOffset < 0) {
    res.status(400).json({ error: 'Body must include a non-negative integer "dayOffset"' });
    return;
  }

  try {
    const strategy = await getShellingStrategy(
      result,
      beachLabel,
      dayLabel,
      bestWindowStart ?? null,
      bestWindowEnd ?? null,
      dayOffset,
      bestWindowAlreadyPassed ?? false
    );
    res.json(strategy);
  } catch (err) {
    next(err);
  }
});
