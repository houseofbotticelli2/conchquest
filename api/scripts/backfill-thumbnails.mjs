#!/usr/bin/env node
//
// One-off: generate thumbnails for finds logged before thumbnails existed.
//
// New finds get one automatically (routes/finds.ts calls generateThumbnail
// after responding). This catches the backlog. Safe to re-run -- it only picks
// up rows where thumb_key is still null, so a partial run just resumes.
//
// Usage, from api/ with a tunnel open (see docs/TABLEPLUS_DATABASE_ACCESS.md):
//   npx tsx scripts/backfill-thumbnails.mjs          # generate
//   npx tsx scripts/backfill-thumbnails.mjs --dry    # just report what's missing

import 'dotenv/config';

const dryRun = process.argv.includes('--dry');

const { pool } = await import('../src/config/db.ts');
const { generateThumbnail } = await import('../src/services/thumbnails.ts');

const { rows } = await pool.query(
  `SELECT id, photo_key FROM shell_finds
   WHERE thumb_key IS NULL AND photo_key IS NOT NULL
   ORDER BY created_at`
);

console.log(`${rows.length} find(s) without a thumbnail`);
if (dryRun || rows.length === 0) {
  for (const r of rows) console.log(`  ${r.id}  ${r.photo_key}`);
  await pool.end();
  process.exit(0);
}

let done = 0;
for (const row of rows) {
  // Sequential on purpose: this is a one-off against a live database, and a
  // burst of parallel image processing is not worth the risk of competing with
  // real traffic for connections or memory.
  await generateThumbnail(row.id, row.photo_key);
  const check = await pool.query('SELECT thumb_key FROM shell_finds WHERE id = $1', [row.id]);
  const key = check.rows[0]?.thumb_key;
  if (key) {
    done++;
    console.log(`  ok   ${row.id} -> ${key}`);
  } else {
    // generateThumbnail logs the reason; it never throws, so a failure here
    // means this find simply keeps falling back to its original.
    console.log(`  FAIL ${row.id} (${row.photo_key}) -- left falling back to the original`);
  }
}

console.log(`\n${done}/${rows.length} thumbnails generated`);
await pool.end();
