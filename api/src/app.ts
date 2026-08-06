import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { requireAuth, requireAdmin } from './middleware/auth';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { adminRouter } from './routes/admin';
import { adminSessionRouter } from './routes/adminSession';
import { cacheCleanupRunsRouter } from './routes/cacheCleanupRuns';
import { conditionsRouter } from './routes/conditions';
import { configRouter } from './routes/config';
import { findsRouter } from './routes/finds';
import { geocodeRouter } from './routes/geocode';
import { healthRouter } from './routes/health';
import { noaaFailuresRouter } from './routes/noaaFailures';
import { profileRouter } from './routes/profile';
import { pushTokenRouter } from './routes/pushToken';
import { savedLocationsRouter } from './routes/savedLocations';
import { scoreRouter } from './routes/score';
import { speciesRouter } from './routes/species';
import { uploadsRouter } from './routes/uploads';

export const app = express();

app.use(helmet());
// The mobile app's native fetch isn't subject to CORS at all (browsers are
// the only thing that enforce it), so this only ever gates browser-based
// callers -- the admin console (which needs credentials:true for its
// cookie session) and the mobile web preview. A wildcard origin can't be
// combined with credentialed requests, hence the explicit allowlist.
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.corsAllowedOrigins.includes(origin)) callback(null, true);
      else callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

app.use('/health', healthRouter);

app.use('/api/admin/session', adminSessionRouter);
app.use('/api/config', requireAuth, configRouter);
app.use('/api/conditions', requireAuth, conditionsRouter);
app.use('/api/score', requireAuth, scoreRouter);
app.use('/api/finds', requireAuth, findsRouter);
app.use('/api/geocode', requireAuth, geocodeRouter);
app.use('/api/species', requireAuth, speciesRouter);
app.use('/api/saved-locations', requireAuth, savedLocationsRouter);
app.use('/api/uploads', requireAuth, uploadsRouter);
app.use('/api/noaa-failures', requireAuth, requireAdmin, noaaFailuresRouter);
app.use('/api/cache-cleanup-runs', requireAuth, requireAdmin, cacheCleanupRunsRouter);
app.use('/api/admin', requireAuth, requireAdmin, adminRouter);
app.use('/api/profile', requireAuth, profileRouter);
app.use('/api/push-token', requireAuth, pushTokenRouter);

app.use(notFoundHandler);
app.use(errorHandler);
