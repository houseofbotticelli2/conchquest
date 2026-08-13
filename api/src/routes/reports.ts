import { Router } from 'express';
import { pool } from '../config/db';

export const reportsRouter = Router();

const VALID_REASONS = ['inappropriate_content', 'harassment', 'spam', 'other'];

reportsRouter.post('/', async (req, res, next) => {
  try {
    const { findId, reason, notes } = (req.body ?? {}) as {
      findId?: string;
      reason?: string;
      notes?: string;
    };

    if (typeof findId !== 'string' || !findId.trim()) {
      res.status(400).json({ error: 'findId is required' });
      return;
    }
    if (typeof reason !== 'string' || !VALID_REASONS.includes(reason)) {
      res.status(400).json({ error: `reason must be one of: ${VALID_REASONS.join(', ')}` });
      return;
    }

    const find = await pool.query<{ user_id: string }>('SELECT user_id FROM shell_finds WHERE id = $1', [findId]);
    if (find.rows.length === 0) {
      res.status(404).json({ error: 'Find not found' });
      return;
    }
    const reportedUserId = find.rows[0].user_id;

    if (reportedUserId === req.user!.id) {
      res.status(400).json({ error: "You can't report your own find." });
      return;
    }

    await pool.query(
      `INSERT INTO content_reports (reporter_user_id, find_id, reported_user_id, reason, notes)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.user!.id, findId, reportedUserId, reason, notes?.trim() || null]
    );

    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});
