import { pool } from '../config/db';
import { getConditions } from './conditionsAggregator';
import { computeShellingScore } from './scoringEngine';
import { sendPushNotification } from './pushNotifications';
import { getConfigNumber } from './appConfig';

// Once a beach's score clears its threshold, don't re-notify again until this
// much time has passed -- otherwise a beach sitting above threshold would
// re-alert every single job run. Also comfortably covers the gap between a
// day's two low tides, so a single alert per window can't double-fire.
const DEFAULT_ALERT_COOLDOWN_HOURS = 12;

const DEFAULT_LEAD_TIME_HOURS = 3;

interface AlertCandidateRow {
  id: string;
  name: string;
  city: string | null;
  lat: number;
  lon: number;
  alert_threshold_score: number;
  push_token: string;
}

async function fetchAlertCandidates(cooldownHours: number): Promise<AlertCandidateRow[]> {
  const result = await pool.query<AlertCandidateRow>(
    `SELECT sl.id, sl.name, sl.city, ST_Y(sl.geog::geometry) AS lat, ST_X(sl.geog::geometry) AS lon,
            sl.alert_threshold_score, u.push_token
     FROM saved_locations sl
     JOIN users u ON u.id = sl.user_id
     WHERE sl.alert_threshold_score IS NOT NULL
       AND u.push_token IS NOT NULL
       AND (sl.last_alerted_at IS NULL OR sl.last_alerted_at < now() - ($1 || ' hours')::interval)`,
    [cooldownHours]
  );
  return result.rows;
}

export async function checkBeachAlerts(): Promise<void> {
  const [cooldownHours, leadTimeHours] = await Promise.all([
    getConfigNumber('beach_alert_cooldown_hours', DEFAULT_ALERT_COOLDOWN_HOURS),
    getConfigNumber('beach_alert_lead_time_hours', DEFAULT_LEAD_TIME_HOURS),
  ]);
  const candidates = await fetchAlertCandidates(cooldownHours);
  let sent = 0;

  for (const beach of candidates) {
    try {
      const conditions = await getConditions(beach.lat, beach.lon);
      const { score, bestWindow } = computeShellingScore(conditions);

      // Only alert ahead of today's actual shelling window, so a sheller has
      // time to prepare -- not the instant the live score clears threshold.
      if (!bestWindow) continue;
      const hoursUntilWindow = (new Date(bestWindow.start).getTime() - Date.now()) / 3_600_000;
      const withinLeadTime = hoursUntilWindow >= 0 && hoursUntilWindow <= leadTimeHours;

      if (withinLeadTime && score >= beach.alert_threshold_score) {
        const beachLabel = beach.city ? `${beach.name} (${beach.city})` : beach.name;
        const roundedHours = Math.max(1, Math.round(hoursUntilWindow));
        const hourWord = roundedHours === 1 ? 'hour' : 'hours';
        await sendPushNotification(
          beach.push_token,
          '🐚 Great shelling conditions coming up!',
          `${beachLabel} has a great shelling window coming up in about ${roundedHours} ${hourWord} (score ${score}) -- time to start getting ready.`,
          { beachId: beach.id }
        );
        await pool.query(`UPDATE saved_locations SET last_alerted_at = now() WHERE id = $1`, [beach.id]);
        sent += 1;
      }
    } catch (err) {
      console.error(`Failed to check alert for saved location ${beach.id}:`, err);
    }
  }

  console.log(`Beach alert check: ${candidates.length} beach(es) eligible, ${sent} notification(s) sent.`);
}
