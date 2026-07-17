import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { requireAuth } from './middleware/auth';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { conditionsRouter } from './routes/conditions';
import { findsRouter } from './routes/finds';
import { healthRouter } from './routes/health';
import { scoreRouter } from './routes/score';

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/health', healthRouter);

app.use('/api/conditions', requireAuth, conditionsRouter);
app.use('/api/score', requireAuth, scoreRouter);
app.use('/api/finds', requireAuth, findsRouter);

app.use(notFoundHandler);
app.use(errorHandler);
