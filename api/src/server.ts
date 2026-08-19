import cron from 'node-cron';
import { app } from './app';
import { env } from './config/env';
import { checkBeachAlerts } from './services/beachAlerts';
import { cleanExpiredCaches } from './services/cacheCleanup';
import { purgeExpiredAccounts } from './services/accountDeletion';
import { sweepOrphanedObjects } from './services/orphanSweeper';

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

// Daily, permanently remove accounts whose deletion grace period has run out.
// Deliberately a scheduled job rather than something a request triggers: the
// user's part finished when they tapped the button, and this must still happen
// even if they never open the app again. 4am, well outside any usage window.
cron.schedule('0 4 * * *', () => {
  purgeExpiredAccounts().catch((err) => console.error('Account purge failed:', err));
});

// Weekly, delete bucket objects nothing references -- photos replaced during
// an edit before that was fixed at the source, and uploads for finds the user
// abandoned. Only touches objects older than a day, since a fresh upload
// legitimately has no row yet. Sunday 4:30am, after the cache cleanup.
cron.schedule('30 4 * * 0', () => {
  sweepOrphanedObjects().catch((err) => console.error('Orphan sweep failed:', err));
});
