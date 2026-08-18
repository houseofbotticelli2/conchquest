import { Router } from 'express';
import { pool } from '../config/db';
import { getDownloadUrl, isOwnUploadKey } from '../services/storage';
import { DELETION_GRACE_DAYS, scheduledPurgeDate } from '../services/accountDeletion';
import { logSystemAction } from '../services/auditLog';

export const profileRouter = Router();

interface UserRow {
  email: string;
  display_name: string | null;
  shelling_since_year: number | null;
  avatar_key: string | null;
  deletion_requested_at: Date | null;
  created_at: Date;
  restrict_shelling_to_daylight: boolean;
}

async function toResponse(row: UserRow) {
  return {
    email: row.email,
    displayName: row.display_name,
    shellingSinceYear: row.shelling_since_year ?? row.created_at.getFullYear(),
    avatarUrl: row.avatar_key ? await getDownloadUrl(row.avatar_key) : null,
    // Non-null means a deletion is pending; the app uses this to show the
    // "scheduled for deletion" banner and its restore button.
    deletionRequestedAt: row.deletion_requested_at?.toISOString() ?? null,
    deletionScheduledFor: row.deletion_requested_at ? scheduledPurgeDate(row.deletion_requested_at).toISOString() : null,
    restrictShellingToDaylight: row.restrict_shelling_to_daylight,
  };
}

const SELECT_COLUMNS = `email, display_name, shelling_since_year, avatar_key, created_at, restrict_shelling_to_daylight, deletion_requested_at`;

profileRouter.get('/', async (req, res, next) => {
  try {
    const result = await pool.query<UserRow>(`SELECT ${SELECT_COLUMNS} FROM users WHERE id = $1`, [req.user!.id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(await toResponse(result.rows[0]));
  } catch (err) {
    next(err);
  }
});

profileRouter.patch('/', async (req, res, next) => {
  try {
    const { displayName, shellingSinceYear, avatarKey, restrictShellingToDaylight } = req.body ?? {};

    if (displayName !== undefined && (typeof displayName !== 'string' || !displayName.trim())) {
      res.status(400).json({ error: 'displayName must be a non-empty string' });
      return;
    }
    if (
      shellingSinceYear !== undefined &&
      shellingSinceYear !== null &&
      (typeof shellingSinceYear !== 'number' || shellingSinceYear < 1900 || shellingSinceYear > new Date().getFullYear())
    ) {
      res.status(400).json({ error: 'shellingSinceYear must be a valid year' });
      return;
    }
    if (avatarKey !== undefined && avatarKey !== null) {
      // Same ownership rule as a find's photo: an unchecked key here would be
      // served back as a presigned avatar URL for someone else's object.
      if (typeof avatarKey !== 'string' || !isOwnUploadKey(avatarKey, req.user!.id, 'avatar')) {
        res.status(400).json({ error: 'avatarKey does not belong to this user' });
        return;
      }
    }
    if (restrictShellingToDaylight !== undefined && typeof restrictShellingToDaylight !== 'boolean') {
      res.status(400).json({ error: 'restrictShellingToDaylight must be a boolean' });
      return;
    }

    const result = await pool.query<UserRow>(
      `UPDATE users
       SET display_name = COALESCE($1, display_name),
           shelling_since_year = COALESCE($2, shelling_since_year),
           avatar_key = COALESCE($3, avatar_key),
           restrict_shelling_to_daylight = COALESCE($4, restrict_shelling_to_daylight),
           updated_at = now()
       WHERE id = $5
       RETURNING ${SELECT_COLUMNS}`,
      [
        displayName?.trim() ?? null,
        shellingSinceYear ?? null,
        avatarKey ?? null,
        restrictShellingToDaylight ?? null,
        req.user!.id,
      ]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(await toResponse(result.rows[0]));
  } catch (err) {
    next(err);
  }
});

// Apple 5.1.1(v) requires account deletion to be available inside the app.
// This marks the account rather than purging it: the finds disappear from the
// community straight away, and the real purge runs after the grace period
// (accountDeletion.ts) unless the user cancels.
profileRouter.post('/delete', async (req, res, next) => {
  try {
    const result = await pool.query<{ deletion_requested_at: Date }>(
      `UPDATE users
       SET deletion_requested_at = COALESCE(deletion_requested_at, now()), updated_at = now()
       WHERE id = $1
       RETURNING deletion_requested_at`,
      [req.user!.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    const requestedAt = result.rows[0].deletion_requested_at;
    await logSystemAction('Account deletion requested by user', req.user!.id);
    res.json({
      deletionRequestedAt: requestedAt.toISOString(),
      deletionScheduledFor: scheduledPurgeDate(requestedAt).toISOString(),
      graceDays: DELETION_GRACE_DAYS,
    });
  } catch (err) {
    next(err);
  }
});

// Changed their mind, within the grace period.
profileRouter.post('/delete/cancel', async (req, res, next) => {
  try {
    await pool.query(
      `UPDATE users SET deletion_requested_at = NULL, updated_at = now() WHERE id = $1`,
      [req.user!.id]
    );
    await logSystemAction('Account deletion cancelled by user', req.user!.id);
    res.json({ deletionRequestedAt: null, deletionScheduledFor: null });
  } catch (err) {
    next(err);
  }
});
