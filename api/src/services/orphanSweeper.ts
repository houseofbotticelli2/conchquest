import { pool } from '../config/db';
import { listAllObjects, deleteObject } from './storage';

/**
 * How old an unreferenced object must be before we'll delete it.
 *
 * This is the whole safety of the job. The app presigns and uploads a photo
 * *before* the find is created, so between those two steps a perfectly good
 * upload legitimately has no row pointing at it. Sweeping eagerly would delete
 * photos out from under someone mid-log. A day is far longer than any upload
 * takes and short enough that abandoned bytes don't linger.
 */
const MIN_AGE_HOURS = 24;

/**
 * Deletes bucket objects nothing in the database references.
 *
 * Two things produce them: replacing a find's photo (fixed at the source in
 * routes/finds.ts, but historical ones remain), and uploads that completed
 * for a find the user then abandoned. Neither is visible to anyone -- they
 * just cost storage, and they end up in the nightly photo backup too.
 */
export async function sweepOrphanedObjects(): Promise<void> {
  // Every key the database considers live. Read first, so anything created
  // during the sweep is compared against a *newer* snapshot rather than an
  // older one -- the safe direction to be wrong in.
  const { rows } = await pool.query<{ key: string }>(
    `SELECT photo_key AS key FROM shell_finds WHERE photo_key IS NOT NULL
     UNION SELECT thumb_key FROM shell_finds WHERE thumb_key IS NOT NULL
     UNION SELECT avatar_key FROM users WHERE avatar_key IS NOT NULL`
  );
  const referenced = new Set(rows.map((r) => r.key));

  // A database that returned nothing is far more likely to be a broken query
  // than a service with no photos at all -- and acting on it would delete the
  // entire bucket. Refuse.
  if (referenced.size === 0) {
    console.error('Orphan sweep: database reported zero referenced keys; refusing to sweep.');
    return;
  }

  const cutoff = Date.now() - MIN_AGE_HOURS * 3_600_000;
  const objects = await listAllObjects();

  let deleted = 0;
  let bytes = 0;
  for (const obj of objects) {
    if (!obj.key || referenced.has(obj.key)) continue;
    if (!obj.lastModified || obj.lastModified.getTime() > cutoff) continue; // too new to judge
    try {
      await deleteObject(obj.key);
      deleted++;
      bytes += obj.size ?? 0;
    } catch (err) {
      console.error(`Orphan sweep: failed to delete ${obj.key}:`, err);
    }
  }

  if (deleted > 0) {
    console.log(`Orphan sweep: removed ${deleted} unreferenced object(s), ${Math.round(bytes / 1024)}KB.`);
  }
}
