import { NextFunction, Request, Response } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { env } from '../config/env';
import { pool } from '../config/db';
import { AuthenticatedUser } from '../types';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// Supabase signs access tokens with a per-project asymmetric key (ES256),
// not a shared HS256 secret — verifying against its published JWKS (with
// jose's built-in caching/rotation handling) is the current recommended
// approach, not the legacy shared-secret one.
const issuer = `${env.supabaseUrl}/auth/v1`;
const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));

// Role is intentionally never written here -- it's granted out-of-band
// (directly in the database), not derived from anything in the JWT, so this
// upsert must never touch it on conflict or every request would silently
// reset an admin back to 'user'.
async function upsertUserRecord(user: Omit<AuthenticatedUser, 'role'>): Promise<'user' | 'admin'> {
  const result = await pool.query<{ role: 'user' | 'admin' }>(
    `INSERT INTO users (id, email, display_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (id) DO UPDATE
     SET email = EXCLUDED.email,
         display_name = COALESCE(EXCLUDED.display_name, users.display_name),
         updated_at = now()
     RETURNING role`,
    [user.id, user.email, user.displayName]
  );
  return result.rows[0].role;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing bearer token' });
    return;
  }

  const token = header.slice('Bearer '.length);

  try {
    const { payload } = await jwtVerify(token, jwks, { issuer });
    if (typeof payload.sub !== 'string') {
      res.status(401).json({ error: 'Token missing subject claim' });
      return;
    }

    const userMetadata = payload.user_metadata;
    const displayName =
      typeof userMetadata === 'object' && userMetadata !== null && typeof (userMetadata as Record<string, unknown>).display_name === 'string'
        ? ((userMetadata as Record<string, unknown>).display_name as string)
        : null;

    const baseUser = {
      id: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : '',
      displayName,
    };
    const role = await upsertUserRecord(baseUser);
    req.user = { ...baseUser, role };
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Runs after requireAuth (depends on req.user being set). Rejects anyone
// who isn't role='admin' -- authentication alone (requireAuth) only proves
// "a real logged-in Conchquest account," not "allowed to see admin data."
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}
