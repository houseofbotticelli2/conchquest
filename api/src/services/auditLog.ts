import { pool } from '../config/db';
import { AuthenticatedUser } from '../types';

export async function logAdminAction(admin: AuthenticatedUser, action: string, target?: string): Promise<void> {
  await pool.query(`INSERT INTO admin_audit_log (admin_id, admin_email, action, target) VALUES ($1, $2, $3, $4)`, [
    admin.id,
    admin.email,
    action,
    target ?? null,
  ]);
}

/**
 * Records something the system did on its own, with no admin behind it.
 *
 * Used for account deletion, which needs care: `admin_email` is NOT NULL and
 * holds a plain text copy, so it survives the account being purged. Writing
 * the departing user's email here would mean retaining their identity forever
 * as a side effect of honouring their erasure request -- the opposite of what
 * they asked for. So the actor is recorded as 'system' and the subject as a
 * bare user id: enough to show a deletion request was received and fulfilled,
 * which is the compliance question, without keeping who they were. Once their
 * rows are gone that UUID links to nothing.
 */
export async function logSystemAction(action: string, target?: string): Promise<void> {
  await pool.query(`INSERT INTO admin_audit_log (admin_id, admin_email, action, target) VALUES (NULL, $1, $2, $3)`, [
    'system',
    action,
    target ?? null,
  ]);
}
