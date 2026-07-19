import { Router } from 'express';
import { getConfigNumber } from '../services/appConfig';

export const configRouter = Router();

configRouter.get('/', async (_req, res, next) => {
  try {
    const [recentFindsLimit, recentBeachesLimit] = await Promise.all([
      getConfigNumber('recent_finds_limit', 7),
      getConfigNumber('recent_beaches_limit', 3),
    ]);

    res.json({ recentFindsLimit, recentBeachesLimit });
  } catch (err) {
    next(err);
  }
});
