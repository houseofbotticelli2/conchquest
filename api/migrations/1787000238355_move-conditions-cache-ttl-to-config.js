/* eslint-disable camelcase */

exports.up = (pgm) => {
  // Moved out of CONDITIONS_CACHE_TTL_MINUTES so it can be changed without a
  // redeploy. It governs how often we call NOAA, Open-Meteo, OpenWeather and
  // OpenAI, so it's the lever you want during an upstream outage or a rate
  // limit -- and waiting on a Railway restart is exactly when you don't want
  // to be waiting. The env var still wins when explicitly set, which is how a
  // developer overrides it locally without changing it for production (we all
  // share one database).
  pgm.sql(`
    INSERT INTO app_config (key, value, description) VALUES
      ('conditions_cache_ttl_minutes', '20', 'How long cached conditions and multi-day forecasts stay fresh, in minutes. Raise it to cut calls to NOAA/Open-Meteo/OpenWeather/OpenAI during an outage, rate limit, or cost spike; lower it for fresher data at higher cost.')
  `);

  // Every existing row already has a description, and the admin console
  // renders it under each field -- an undescribed key would show up there as a
  // bare name nobody can safely change. Make that a guarantee rather than a
  // habit, so the next person to add a key can't quietly skip it.
  pgm.sql(`ALTER TABLE app_config ALTER COLUMN description SET NOT NULL`);
  pgm.sql(`ALTER TABLE app_config ADD CONSTRAINT app_config_description_not_blank CHECK (btrim(description) <> '')`);
};

exports.down = (pgm) => {
  pgm.sql(`ALTER TABLE app_config DROP CONSTRAINT IF EXISTS app_config_description_not_blank`);
  pgm.sql(`ALTER TABLE app_config ALTER COLUMN description DROP NOT NULL`);
  pgm.sql(`DELETE FROM app_config WHERE key = 'conditions_cache_ttl_minutes'`);
};
