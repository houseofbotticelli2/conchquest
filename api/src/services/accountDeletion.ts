import { pool } from '../config/db';
import { env } from '../config/env';
import { deleteUserPhotos } from './storage';

// Long enough that someone who deleted in frustration (or by accident) can
// come back, short enough that "delete my account" still means something.
export const DELETION_GRACE_DAYS = 14;

export function scheduledPurgeDate(requestedAt: Date): Date {
  return new Date(requestedAt.getTime() + DELETION_GRACE_DAYS * 86_400_000);
}

/**
 * Removes the Supabase auth user. Deleting only our own `users` row leaves an
 * orphan: the account can still sign in, and the first authenticated request
 * recreates the row (see requireAuth's upsert). Both sides have to go -- this
 * is the two-sided teardown documented in CLAUDE.md.
 */
async function deleteSupabaseAuthUser(userId: string): Promise<void> {
  if (!env.supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured -- cannot delete the Supabase auth user');
  }
  const response = await fetch(`${env.supabaseUrl}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: {
      apikey: env.supabaseServiceRoleKey,
      Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
    },
  });
  // 404 means it's already gone -- fine, we want it absent, not necessarily
  // to be the one who removed it.
  if (!response.ok && response.status !== 404) {
    throw new Error(`Supabase Admin API delete failed: ${response.status} ${await response.text()}`);
  }
}

/**
 * Irreversible. Supabase first: if that fails we abort with our data intact
 * and can retry, whereas dropping our row first could leave a signed-in
 * account whose data we'd already destroyed.
 */
export async function purgeAccount(userId: string): Promise<void> {
  await deleteSupabaseAuthUser(userId);
  // Cascades to shell_finds, saved_locations, content_reports, user_blocks.
  await pool.query('DELETE FROM users WHERE id = $1', [userId]);
  try {
    await deleteUserPhotos(userId);
  } catch (err) {
    // The rows are already gone, which is the part that matters. Orphaned
    // objects are cleaned by prefix later rather than failing the purge.
    console.error(`Failed to delete photos for purged account ${userId}:`, err);
  }
}

/** Runs on a schedule; purges every account past its grace period. */
export async function purgeExpiredAccounts(): Promise<void> {
  const due = await pool.query<{ id: string }>(
    `SELECT id FROM users
     WHERE deletion_requested_at IS NOT NULL
       AND deletion_requested_at < now() - ($1 || ' days')::interval`,
    [DELETION_GRACE_DAYS]
  );
  if (due.rows.length === 0) return;

  console.log(`Account purge: ${due.rows.length} account(s) past the ${DELETION_GRACE_DAYS}-day grace period.`);
  for (const row of due.rows) {
    try {
      await purgeAccount(row.id);
      console.log(`Account purge: removed ${row.id}`);
    } catch (err) {
      // One bad account must not stop the rest; it'll be retried tomorrow.
      console.error(`Account purge failed for ${row.id}:`, err);
    }
  }
}
