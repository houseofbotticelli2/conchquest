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

async function upsertUserRecord(user: AuthenticatedUser): Promise<void> {
  await pool.query(
    `INSERT INTO users (id, email)
     VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = now()`,
    [user.id, user.email]
  );
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

    const user: AuthenticatedUser = { id: payload.sub, email: typeof payload.email === 'string' ? payload.email : '' };
    await upsertUserRecord(user);
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
