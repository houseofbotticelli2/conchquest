import { Router } from 'express';
import { pool } from '../config/db';

export const pushTokenRouter = Router();

pushTokenRouter.put('/', async (req, res, next) => {
  try {
    const { token } = req.body ?? {};

    if (typeof token !== 'string' || !token.trim()) {
      res.status(400).json({ error: 'token is required' });
      return;
    }

    await pool.query(`UPDATE users SET push_token = $1, updated_at = now() WHERE id = $2`, [token.trim(), req.user!.id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

pushTokenRouter.delete('/', async (req, res, next) => {
  try {
    await pool.query(`UPDATE users SET push_token = NULL, updated_at = now() WHERE id = $1`, [req.user!.id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
