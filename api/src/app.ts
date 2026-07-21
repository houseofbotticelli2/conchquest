import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { requireAuth } from './middleware/auth';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { conditionsRouter } from './routes/conditions';
import { configRouter } from './routes/config';
import { findsRouter } from './routes/finds';
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
app.use(cors());
app.use(express.json());

app.use('/health', healthRouter);

app.use('/api/config', requireAuth, configRouter);
app.use('/api/conditions', requireAuth, conditionsRouter);
app.use('/api/score', requireAuth, scoreRouter);
app.use('/api/finds', requireAuth, findsRouter);
app.use('/api/species', requireAuth, speciesRouter);
app.use('/api/saved-locations', requireAuth, savedLocationsRouter);
app.use('/api/uploads', requireAuth, uploadsRouter);
app.use('/api/noaa-failures', requireAuth, noaaFailuresRouter);
app.use('/api/profile', requireAuth, profileRouter);
app.use('/api/push-token', requireAuth, pushTokenRouter);

app.use(notFoundHandler);
app.use(errorHandler);
