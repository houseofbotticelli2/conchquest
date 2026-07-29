/* eslint-disable camelcase */

// How many hours before a beach's best shelling window the alert should
// fire, so a sheller has time to prepare instead of getting notified once
// the window has already started.
export const up = (pgm) => {
  pgm.sql(`
    INSERT INTO app_config (key, value, description) VALUES
      ('beach_alert_lead_time_hours', '3', 'Hours of lead time before a beach''s best shelling window that alert notifications should fire.')
  `);
};

export const down = (pgm) => {
  pgm.sql(`DELETE FROM app_config WHERE key = 'beach_alert_lead_time_hours'`);
};
