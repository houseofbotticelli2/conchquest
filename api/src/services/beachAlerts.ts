import { pool } from '../config/db';
import { getConditions } from './conditionsAggregator';
import { computeShellingScore } from './scoringEngine';
import { sendPushNotification } from './pushNotifications';

// Once a beach's score clears its threshold, don't re-notify again until this
// much time has passed -- otherwise a beach sitting above threshold would
// re-alert every single job run.
const ALERT_COOLDOWN_HOURS = 12;

interface AlertCandidateRow {
  id: string;
  name: string;
  lat: number;
  lon: number;
  alert_threshold_score: number;
  push_token: string;
}

async function fetchAlertCandidates(): Promise<AlertCandidateRow[]> {
  const result = await pool.query<AlertCandidateRow>(
    `SELECT sl.id, sl.name, ST_Y(sl.geog::geometry) AS lat, ST_X(sl.geog::geometry) AS lon,
            sl.alert_threshold_score, u.push_token
     FROM saved_locations sl
     JOIN users u ON u.id = sl.user_id
     WHERE sl.alert_threshold_score IS NOT NULL
       AND u.push_token IS NOT NULL
       AND (sl.last_alerted_at IS NULL OR sl.last_alerted_at < now() - ($1 || ' hours')::interval)`,
    [ALERT_COOLDOWN_HOURS]
  );
  return result.rows;
}

export async function checkBeachAlerts(): Promise<void> {
  const candidates = await fetchAlertCandidates();

  for (const beach of candidates) {
    try {
      const conditions = await getConditions(beach.lat, beach.lon);
      const { score } = computeShellingScore(conditions);

      if (score >= beach.alert_threshold_score) {
        await sendPushNotification(
          beach.push_token,
          '🐚 Great shelling conditions!',
          `${beach.name} just hit a Shellcast score of ${score} -- time to go check it out.`
        );
        await pool.query(`UPDATE saved_locations SET last_alerted_at = now() WHERE id = $1`, [beach.id]);
      }
    } catch (err) {
      console.error(`Failed to check alert for saved location ${beach.id}:`, err);
    }
  }
}
