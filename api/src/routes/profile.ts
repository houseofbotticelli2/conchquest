import { Router } from 'express';
import { pool } from '../config/db';
import { getDownloadUrl } from '../services/storage';

export const profileRouter = Router();

interface UserRow {
  email: string;
  display_name: string | null;
  shelling_since_year: number | null;
  avatar_key: string | null;
  created_at: Date;
}

async function toResponse(row: UserRow) {
  return {
    email: row.email,
    displayName: row.display_name,
    shellingSinceYear: row.shelling_since_year ?? row.created_at.getFullYear(),
    avatarUrl: row.avatar_key ? await getDownloadUrl(row.avatar_key) : null,
  };
}

const SELECT_COLUMNS = `email, display_name, shelling_since_year, avatar_key, created_at`;

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
    const { displayName, shellingSinceYear, avatarKey } = req.body ?? {};

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
    if (avatarKey !== undefined && typeof avatarKey !== 'string') {
      res.status(400).json({ error: 'avatarKey must be a string' });
      return;
    }

    const result = await pool.query<UserRow>(
      `UPDATE users
       SET display_name = COALESCE($1, display_name),
           shelling_since_year = COALESCE($2, shelling_since_year),
           avatar_key = COALESCE($3, avatar_key),
           updated_at = now()
       WHERE id = $4
       RETURNING ${SELECT_COLUMNS}`,
      [displayName?.trim() ?? null, shellingSinceYear ?? null, avatarKey ?? null, req.user!.id]
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
