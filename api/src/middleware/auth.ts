import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
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

interface SupabaseJwtPayload {
  sub: string;
  email?: string;
}

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
    const payload = jwt.verify(token, env.supabaseJwtSecret, { algorithms: ['HS256'] }) as SupabaseJwtPayload;
    if (!payload.sub) {
      res.status(401).json({ error: 'Token missing subject claim' });
      return;
    }

    const user: AuthenticatedUser = { id: payload.sub, email: payload.email ?? '' };
    await upsertUserRecord(user);
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
