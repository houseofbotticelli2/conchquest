import cron from 'node-cron';
import { app } from './app';
import { env } from './config/env';
import { checkBeachAlerts } from './services/beachAlerts';
import { cleanExpiredCaches } from './services/cacheCleanup';

app.listen(env.port, () => {
  console.log(`Conchquest API listening on port ${env.port} (${env.nodeEnv})`);
});

// Every 30 minutes, re-score saved beaches with an alert threshold set and
// push a notification to anyone whose beach just cleared it.
cron.schedule('*/30 * * * *', () => {
  checkBeachAlerts().catch((err) => console.error('Beach alert check failed:', err));
});

// Weekly, remove already-expired rows from the conditions/strategy/forecast
// cache tables -- reads already ignore expired rows via `expires_at > now()`,
// this just keeps the tables from growing forever. Sunday 3am, well outside
// any real usage window.
cron.schedule('0 3 * * 0', () => {
  cleanExpiredCaches().catch((err) => console.error('Cache cleanup failed:', err));
});
