import { Router } from 'express';
import { pool } from '../config/db';
import { env } from '../config/env';
import { testStrategyPrompt, TEST_SCENARIO_KEYS, type TestScenario } from '../services/shellingStrategy';
import { logAdminAction } from '../services/auditLog';
import { getDownloadUrl, deleteUserPhotos, deleteObject } from '../services/storage';

export const adminRouter = Router();

// Confirms admin access and returns basic identity -- the admin console calls
// this right after login to decide whether to show the app or an
// unauthorized screen. Mounted under requireAuth + requireAdmin, so simply
// reaching this handler at all already proves both.
adminRouter.get('/me', (req, res) => {
  res.json({ id: req.user!.id, email: req.user!.email, displayName: req.user!.displayName, role: req.user!.role });
});

adminRouter.get('/dashboard-stats', async (req, res, next) => {
  try {
    const [members, finds, beaches] = await Promise.all([
      pool.query<{ count: string }>('SELECT count(*) FROM users'),
      pool.query<{ count: string }>('SELECT count(*) FROM shell_finds'),
      pool.query<{ count: string }>('SELECT count(*) FROM saved_locations'),
    ]);
    res.json({
      memberCount: Number(members.rows[0].count),
      findsCount: Number(finds.rows[0].count),
      beachesCount: Number(beaches.rows[0].count),
    });
  } catch (err) {
    next(err);
  }
});

interface AdminUserRow {
  id: string;
  email: string;
  display_name: string | null;
  role: 'user' | 'admin';
  created_at: Date;
  finds_count: string;
  beaches_count: string;
}

adminRouter.get('/users', async (req, res, next) => {
  try {
    const result = await pool.query<AdminUserRow>(
      `SELECT u.id, u.email, u.display_name, u.role, u.created_at,
              count(DISTINCT sf.id) AS finds_count,
              count(DISTINCT sl.id) AS beaches_count
       FROM users u
       LEFT JOIN shell_finds sf ON sf.user_id = u.id
       LEFT JOIN saved_locations sl ON sl.user_id = u.id
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    );

    res.json(
      result.rows.map((row) => ({
        id: row.id,
        email: row.email,
        displayName: row.display_name,
        role: row.role,
        createdAt: row.created_at,
        findsCount: Number(row.finds_count),
        beachesCount: Number(row.beaches_count),
      }))
    );
  } catch (err) {
    next(err);
  }
});

interface MemberProfileRow {
  id: string;
  email: string;
  display_name: string | null;
  role: 'user' | 'admin';
  shelling_since_year: number | null;
  created_at: Date;
  updated_at: Date;
}

interface MemberFindRow {
  id: string;
  found_at: Date;
  condition: string | null;
  notes: string | null;
  is_private: boolean;
  photo_key: string | null;
  lat: number;
  lon: number;
  common_name: string | null;
  rarity: string | null;
}

interface MemberBeachRow {
  id: string;
  name: string;
  city: string | null;
  is_home: boolean;
  alert_threshold_score: number | null;
  created_at: Date;
}

// updated_at on `users` gets bumped by requireAuth's upsert on every request
// this person makes (see middleware/auth.ts) -- there's no separate
// "last active" tracking, but this column ends up serving as exactly that.
adminRouter.get('/users/:id', async (req, res, next) => {
  try {
    const targetId = req.params.id;

    const profileResult = await pool.query<MemberProfileRow>(
      `SELECT id, email, display_name, role, shelling_since_year, created_at, updated_at FROM users WHERE id = $1`,
      [targetId]
    );
    if (profileResult.rows.length === 0) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }
    const profile = profileResult.rows[0];

    const [findsResult, beachesResult, statsResult] = await Promise.all([
      pool.query<MemberFindRow>(
        `SELECT sf.id, sf.found_at, sf.condition, sf.notes, sf.is_private, sf.photo_key,
                ST_Y(sf.geog::geometry) AS lat, ST_X(sf.geog::geometry) AS lon,
                ss.common_name, ss.rarity
         FROM shell_finds sf
         LEFT JOIN shell_species ss ON ss.id = sf.species_id
         WHERE sf.user_id = $1
         ORDER BY sf.found_at DESC
         LIMIT 100`,
        [targetId]
      ),
      pool.query<MemberBeachRow>(
        `SELECT id, name, city, is_home, alert_threshold_score, created_at
         FROM saved_locations
         WHERE user_id = $1
         ORDER BY is_home DESC, created_at DESC`,
        [targetId]
      ),
      pool.query<{ total_finds_count: string; rare_finds_count: string; species_count: string }>(
        `SELECT count(sf.id) AS total_finds_count,
                count(sf.id) FILTER (WHERE ss.rarity IN ('rare', 'very_rare')) AS rare_finds_count,
                count(DISTINCT sf.species_id) AS species_count
         FROM shell_finds sf
         LEFT JOIN shell_species ss ON ss.id = sf.species_id
         WHERE sf.user_id = $1`,
        [targetId]
      ),
    ]);

    const finds = await Promise.all(
      findsResult.rows.map(async (row) => ({
        id: row.id,
        foundAt: row.found_at,
        condition: row.condition,
        notes: row.notes,
        isPrivate: row.is_private,
        photoUrl: row.photo_key ? await getDownloadUrl(row.photo_key) : null,
        location: { lat: row.lat, lon: row.lon },
        speciesName: row.common_name,
        rarity: row.rarity,
      }))
    );

    res.json({
      profile: {
        id: profile.id,
        email: profile.email,
        displayName: profile.display_name,
        role: profile.role,
        shellingSinceYear: profile.shelling_since_year,
        createdAt: profile.created_at,
        lastActiveAt: profile.updated_at,
      },
      stats: {
        findsCount: Number(statsResult.rows[0]?.total_finds_count ?? 0),
        rareFindsCount: Number(statsResult.rows[0]?.rare_finds_count ?? 0),
        speciesCount: Number(statsResult.rows[0]?.species_count ?? 0),
        beachesCount: beachesResult.rows.length,
      },
      finds,
      beaches: beachesResult.rows.map((row) => ({
        id: row.id,
        name: row.name,
        city: row.city,
        isHome: row.is_home,
        alertThresholdScore: row.alert_threshold_score,
        createdAt: row.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// Removes the Supabase Auth account itself -- our mirrored `users` row alone
// isn't the login, and requireAuth would just recreate it (with a fresh
// row) the next time this person's existing JWT is used, so a "delete" that
// only touched our DB wouldn't actually stop them from signing back in.
async function deleteSupabaseAuthUser(userId: string): Promise<void> {
  if (!env.supabaseServiceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not configured -- cannot delete the Supabase Auth account. ' +
        'Add it from Supabase dashboard -> Settings -> API -> service_role key.'
    );
  }

  const response = await fetch(`${env.supabaseUrl}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: {
      apikey: env.supabaseServiceRoleKey,
      Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
    },
  });

  // 404 just means the auth account was already gone (e.g. a retry after a
  // partial failure) -- treat that as success rather than blocking the DB
  // cleanup that still needs to happen.
  if (!response.ok && response.status !== 404) {
    const body = await response.text();
    throw new Error(`Supabase Admin API delete failed: ${response.status} ${body}`);
  }
}

adminRouter.delete('/users/:id', async (req, res, next) => {
  try {
    const targetId = req.params.id;

    if (targetId === req.user!.id) {
      res.status(400).json({ error: "You can't delete your own account through this tool." });
      return;
    }

    const existing = await pool.query<{ id: string; email: string }>('SELECT id, email FROM users WHERE id = $1', [targetId]);
    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    // Auth deletion first: if this fails (e.g. missing service key), nothing
    // in our own database has been touched yet.
    await deleteSupabaseAuthUser(targetId);

    // shell_finds and saved_locations both cascade on user deletion (see
    // their migrations), so this one statement removes everything --
    // finds, saved beaches, alert settings, and the push token column.
    await pool.query('DELETE FROM users WHERE id = $1', [targetId]);

    // Bucket cleanup last and best-effort: the account and DB rows are
    // already gone at this point (the part that matters for "delete this
    // person"), so an R2 hiccup here shouldn't turn into a failed request --
    // it just leaves orphaned photos for a future manual/cron sweep.
    try {
      await deleteUserPhotos(targetId);
    } catch (err) {
      console.error(`Failed to delete R2 photos for user ${targetId}:`, err);
    }

    await logAdminAction(req.user!, 'Deleted member and all data', existing.rows[0].email);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

interface AppConfigRow {
  key: string;
  value: unknown;
  description: string | null;
  updated_at: Date;
}

adminRouter.get('/config', async (req, res, next) => {
  try {
    const result = await pool.query<AppConfigRow>('SELECT key, value, description, updated_at FROM app_config ORDER BY key ASC');
    res.json(
      result.rows.map((row) => ({ key: row.key, value: row.value, description: row.description, updatedAt: row.updated_at }))
    );
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/config/:key', async (req, res, next) => {
  try {
    const { value } = req.body ?? {};
    if (value === undefined) {
      res.status(400).json({ error: 'Body must include "value"' });
      return;
    }

    const before = await pool.query<{ value: unknown }>('SELECT value FROM app_config WHERE key = $1', [req.params.key]);

    const result = await pool.query<AppConfigRow>(
      `UPDATE app_config SET value = $1, updated_at = now() WHERE key = $2 RETURNING key, value, description, updated_at`,
      [JSON.stringify(value), req.params.key]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Config key not found' });
      return;
    }

    const oldValue = before.rows[0]?.value;
    await logAdminAction(req.user!, `Updated config ${req.params.key}`, `${JSON.stringify(oldValue)} → ${JSON.stringify(value)}`);

    res.json({ key: result.rows[0].key, value: result.rows[0].value, description: result.rows[0].description, updatedAt: result.rows[0].updated_at });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/prompt-test', async (req, res, next) => {
  try {
    const { systemPrompt, scenario } = req.body ?? {};

    if (typeof systemPrompt !== 'string' || !systemPrompt.trim()) {
      res.status(400).json({ error: 'systemPrompt is required' });
      return;
    }
    if (!TEST_SCENARIO_KEYS.includes(scenario)) {
      res.status(400).json({ error: `scenario must be one of: ${TEST_SCENARIO_KEYS.join(', ')}` });
      return;
    }

    const strategy = await testStrategyPrompt(systemPrompt, scenario as TestScenario);
    res.json({ strategy });
  } catch (err) {
    next(err);
  }
});

interface AdminSpeciesRow {
  id: string;
  common_name: string;
  scientific_name: string;
  family: string | null;
  genus: string | null;
  rarity: string;
  description: string | null;
  habitat: string | null;
  regional_occurrence: string[] | null;
  seasonality: string | null;
  image_url: string | null;
}

const SPECIES_COLUMNS = `
  id, common_name, scientific_name, family, genus, rarity, description, habitat, regional_occurrence, seasonality, image_url
`;
const VALID_RARITIES = ['common', 'uncommon', 'rare', 'very_rare'];

function toSpeciesResponse(row: AdminSpeciesRow) {
  return {
    id: row.id,
    commonName: row.common_name,
    scientificName: row.scientific_name,
    family: row.family,
    genus: row.genus,
    rarity: row.rarity,
    description: row.description,
    habitat: row.habitat,
    regionalOccurrence: row.regional_occurrence ?? [],
    seasonality: row.seasonality,
    imageUrl: row.image_url,
  };
}

// Reading the catalog reuses the existing public GET /api/species (any
// authenticated user, including admins, can already read it) -- these are
// only the mutation endpoints, since editing the catalog is admin-only.
adminRouter.post('/species', async (req, res, next) => {
  try {
    const { commonName, scientificName, family, genus, rarity, description, habitat, regionalOccurrence, seasonality, imageUrl } =
      req.body ?? {};

    if (typeof commonName !== 'string' || !commonName.trim()) {
      res.status(400).json({ error: 'commonName is required' });
      return;
    }
    if (typeof scientificName !== 'string' || !scientificName.trim()) {
      res.status(400).json({ error: 'scientificName is required' });
      return;
    }
    if (rarity !== undefined && !VALID_RARITIES.includes(rarity)) {
      res.status(400).json({ error: `rarity must be one of: ${VALID_RARITIES.join(', ')}` });
      return;
    }

    const result = await pool.query<AdminSpeciesRow>(
      `INSERT INTO shell_species (common_name, scientific_name, family, genus, rarity, description, habitat, regional_occurrence, seasonality, image_url)
       VALUES ($1, $2, $3, $4, COALESCE($5, 'common'), $6, $7, $8, $9, $10)
       RETURNING ${SPECIES_COLUMNS}`,
      [
        commonName.trim(),
        scientificName.trim(),
        family ?? null,
        genus ?? null,
        rarity ?? null,
        description ?? null,
        habitat ?? null,
        regionalOccurrence ?? null,
        seasonality ?? null,
        imageUrl ?? null,
      ]
    );

    await logAdminAction(req.user!, 'Created species', result.rows[0].common_name);

    res.status(201).json(toSpeciesResponse(result.rows[0]));
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/species/:id', async (req, res, next) => {
  try {
    const { commonName, scientificName, family, genus, rarity, description, habitat, regionalOccurrence, seasonality, imageUrl } =
      req.body ?? {};

    if (rarity !== undefined && rarity !== null && !VALID_RARITIES.includes(rarity)) {
      res.status(400).json({ error: `rarity must be one of: ${VALID_RARITIES.join(', ')}` });
      return;
    }

    const result = await pool.query<AdminSpeciesRow>(
      `UPDATE shell_species
       SET common_name = COALESCE($1, common_name),
           scientific_name = COALESCE($2, scientific_name),
           family = COALESCE($3, family),
           genus = COALESCE($4, genus),
           rarity = COALESCE($5, rarity),
           description = COALESCE($6, description),
           habitat = COALESCE($7, habitat),
           regional_occurrence = COALESCE($8, regional_occurrence),
           seasonality = COALESCE($9, seasonality),
           image_url = COALESCE($10, image_url),
           updated_at = now()
       WHERE id = $11
       RETURNING ${SPECIES_COLUMNS}`,
      [
        commonName?.trim() ?? null,
        scientificName?.trim() ?? null,
        family ?? null,
        genus ?? null,
        rarity ?? null,
        description ?? null,
        habitat ?? null,
        regionalOccurrence ?? null,
        seasonality ?? null,
        imageUrl ?? null,
        req.params.id,
      ]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Species not found' });
      return;
    }

    await logAdminAction(req.user!, 'Updated species', result.rows[0].common_name);

    res.json(toSpeciesResponse(result.rows[0]));
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/species/:id', async (req, res, next) => {
  try {
    // shell_finds.species_id is ON DELETE SET NULL, so existing finds
    // referencing this species just lose the association -- they aren't
    // deleted themselves.
    const result = await pool.query<{ common_name: string }>('DELETE FROM shell_species WHERE id = $1 RETURNING common_name', [
      req.params.id,
    ]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Species not found' });
      return;
    }
    await logAdminAction(req.user!, 'Deleted species', result.rows[0].common_name);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

interface AuditLogRow {
  id: string;
  admin_email: string;
  action: string;
  target: string | null;
  created_at: Date;
}

adminRouter.get('/audit-log', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const result = await pool.query<AuditLogRow>(
      `SELECT id, admin_email, action, target, created_at FROM admin_audit_log ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    res.json(
      result.rows.map((row) => ({
        id: row.id,
        adminEmail: row.admin_email,
        action: row.action,
        target: row.target,
        createdAt: row.created_at,
      }))
    );
  } catch (err) {
    next(err);
  }
});

interface LeaderboardRow {
  id: string;
  display_name: string | null;
  email: string;
  finds_count: string;
  rare_finds_count: string;
  species_count: string;
  home_beach_name: string | null;
}

adminRouter.get('/leaderboard', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const result = await pool.query<LeaderboardRow>(
      `SELECT u.id, u.display_name, u.email,
              count(sf.id) AS finds_count,
              count(sf.id) FILTER (WHERE ss.rarity IN ('rare', 'very_rare')) AS rare_finds_count,
              count(DISTINCT sf.species_id) AS species_count,
              (SELECT sl.name FROM saved_locations sl WHERE sl.user_id = u.id AND sl.is_home LIMIT 1) AS home_beach_name
       FROM users u
       LEFT JOIN shell_finds sf ON sf.user_id = u.id
       LEFT JOIN shell_species ss ON ss.id = sf.species_id
       GROUP BY u.id
       ORDER BY finds_count DESC, u.created_at ASC
       LIMIT $1`,
      [limit]
    );
    res.json(
      result.rows.map((row) => ({
        id: row.id,
        displayName: row.display_name,
        email: row.email,
        findsCount: Number(row.finds_count),
        rareFindsCount: Number(row.rare_finds_count),
        speciesCount: Number(row.species_count),
        homeBeachName: row.home_beach_name,
      }))
    );
  } catch (err) {
    next(err);
  }
});

interface FailingStationRow {
  station_id: string;
  source: string;
  error_message: string;
  count: string;
  first_seen: Date;
  last_seen: Date;
  station_name: string | null;
  lat: number | null;
  lon: number | null;
}

// Joins failure counts against the real station metadata (name + location)
// synced from NOAA/NDBC's own station lists, so a station id like "rkxf1"
// reads as an actual place instead of an opaque code.
adminRouter.get('/failing-stations', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const result = await pool.query<FailingStationRow>(
      `WITH agg AS (
         SELECT station_id, source, error_message, count(*) AS count, min(occurred_at) AS first_seen, max(occurred_at) AS last_seen
         FROM noaa_fetch_failures
         WHERE station_id IS NOT NULL
         GROUP BY station_id, source, error_message
       )
       SELECT a.*, COALESCE(b.name, t.name) AS station_name,
              COALESCE(ST_Y(b.geog::geometry), ST_Y(t.geog::geometry)) AS lat,
              COALESCE(ST_X(b.geog::geometry), ST_X(t.geog::geometry)) AS lon
       FROM agg a
       LEFT JOIN ndbc_buoy_stations b ON b.station_id = a.station_id AND a.source = 'buoy'
       LEFT JOIN noaa_tide_stations t ON t.station_id = a.station_id AND a.source = 'tide'
       ORDER BY a.count DESC
       LIMIT $1`,
      [limit]
    );

    res.json(
      result.rows.map((row) => ({
        stationId: row.station_id,
        source: row.source,
        errorMessage: row.error_message,
        count: Number(row.count),
        firstSeen: row.first_seen,
        lastSeen: row.last_seen,
        stationName: row.station_name,
        lat: row.lat,
        lon: row.lon,
      }))
    );
  } catch (err) {
    next(err);
  }
});

interface ReportRow {
  id: string;
  reason: string;
  notes: string | null;
  status: string;
  created_at: Date;
  reviewed_at: Date | null;
  reporter_email: string;
  reported_user_id: string;
  reported_email: string;
  reported_display_name: string | null;
  find_id: string | null;
  find_notes: string | null;
  find_photo_key: string | null;
  species_name: string | null;
}

adminRouter.get('/reports', async (req, res, next) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : 'pending';
    const result = await pool.query<ReportRow>(
      `SELECT cr.id, cr.reason, cr.notes, cr.status, cr.created_at, cr.reviewed_at,
              reporter.email AS reporter_email,
              cr.reported_user_id, reported.email AS reported_email, reported.display_name AS reported_display_name,
              cr.find_id, sf.notes AS find_notes, sf.photo_key AS find_photo_key, ss.common_name AS species_name
       FROM content_reports cr
       JOIN users reporter ON reporter.id = cr.reporter_user_id
       JOIN users reported ON reported.id = cr.reported_user_id
       LEFT JOIN shell_finds sf ON sf.id = cr.find_id
       LEFT JOIN shell_species ss ON ss.id = sf.species_id
       WHERE cr.status = $1
       ORDER BY cr.created_at DESC`,
      [status]
    );

    res.json(
      await Promise.all(
        result.rows.map(async (row) => ({
          id: row.id,
          reason: row.reason,
          notes: row.notes,
          status: row.status,
          createdAt: row.created_at,
          reviewedAt: row.reviewed_at,
          reporterEmail: row.reporter_email,
          reportedUserId: row.reported_user_id,
          reportedEmail: row.reported_email,
          reportedDisplayName: row.reported_display_name,
          find: row.find_id
            ? {
                id: row.find_id,
                speciesName: row.species_name,
                notes: row.find_notes,
                photoUrl: row.find_photo_key ? await getDownloadUrl(row.find_photo_key) : null,
              }
            : null,
        }))
      )
    );
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/reports/:id', async (req, res, next) => {
  try {
    const { action } = (req.body ?? {}) as { action?: 'dismiss' | 'remove_find' };
    if (action !== 'dismiss' && action !== 'remove_find') {
      res.status(400).json({ error: 'action must be "dismiss" or "remove_find"' });
      return;
    }

    const report = await pool.query<{ id: string; find_id: string | null }>(
      'SELECT id, find_id FROM content_reports WHERE id = $1',
      [req.params.id]
    );
    if (report.rows.length === 0) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    if (action === 'remove_find') {
      const findId = report.rows[0].find_id;
      if (findId) {
        const find = await pool.query<{ photo_key: string | null }>('SELECT photo_key FROM shell_finds WHERE id = $1', [
          findId,
        ]);
        // Deleting the find first cascades find_id -> NULL on this (and any
        // other) report referencing it, matching account deletion's pattern:
        // the DB row is the part that matters, R2 cleanup is best-effort and
        // shouldn't fail the request if it hiccups.
        await pool.query('DELETE FROM shell_finds WHERE id = $1', [findId]);
        if (find.rows[0]?.photo_key) {
          try {
            await deleteObject(find.rows[0].photo_key);
          } catch (err) {
            console.error(`Failed to delete R2 photo for removed find ${findId}:`, err);
          }
        }
      }
    }

    const status = action === 'dismiss' ? 'dismissed' : 'find_removed';
    await pool.query(
      `UPDATE content_reports SET status = $1, reviewed_at = now(), reviewed_by_admin_id = $2 WHERE id = $3`,
      [status, req.user!.id, req.params.id]
    );

    await logAdminAction(req.user!, action === 'dismiss' ? 'Dismissed content report' : 'Removed reported find', req.params.id);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
