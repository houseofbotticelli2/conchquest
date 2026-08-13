import { Router } from 'express';
import { pool } from '../config/db';

export const blocksRouter = Router();

blocksRouter.get('/', async (req, res, next) => {
  try {
    const result = await pool.query<{ blocked_user_id: string; display_name: string | null; email: string }>(
      `SELECT ub.blocked_user_id, u.display_name, u.email
       FROM user_blocks ub
       JOIN users u ON u.id = ub.blocked_user_id
       WHERE ub.blocker_user_id = $1
       ORDER BY ub.created_at DESC`,
      [req.user!.id]
    );
    res.json(
      result.rows.map((row) => ({
        userId: row.blocked_user_id,
        displayName: row.display_name ?? row.email.split('@')[0],
      }))
    );
  } catch (err) {
    next(err);
  }
});

blocksRouter.post('/', async (req, res, next) => {
  try {
    const { userId } = (req.body ?? {}) as { userId?: string };
    if (typeof userId !== 'string' || !userId.trim()) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }
    if (userId === req.user!.id) {
      res.status(400).json({ error: "You can't block yourself." });
      return;
    }

    await pool.query(
      `INSERT INTO user_blocks (blocker_user_id, blocked_user_id) VALUES ($1, $2)
       ON CONFLICT (blocker_user_id, blocked_user_id) DO NOTHING`,
      [req.user!.id, userId]
    );

    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

blocksRouter.delete('/:userId', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM user_blocks WHERE blocker_user_id = $1 AND blocked_user_id = $2', [
      req.user!.id,
      req.params.userId,
    ]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
