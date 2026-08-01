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
