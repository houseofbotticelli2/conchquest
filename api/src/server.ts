import cron from 'node-cron';
import { app } from './app';
import { env } from './config/env';
import { checkBeachAlerts } from './services/beachAlerts';

app.listen(env.port, () => {
  console.log(`Conchquest API listening on port ${env.port} (${env.nodeEnv})`);
});

// Every 30 minutes, re-score saved beaches with an alert threshold set and
// push a notification to anyone whose beach just cleared it.
cron.schedule('*/30 * * * *', () => {
  checkBeachAlerts().catch((err) => console.error('Beach alert check failed:', err));
});
