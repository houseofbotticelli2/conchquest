#!/usr/bin/env node
//
// Exports the Supabase Auth user list to a timestamped JSON file.
//
// WHY THIS EXISTS: user accounts live in Supabase, which is a completely
// separate system from the Railway Postgres that backup-db.sh dumps. Restore
// that dump alone and you get every find, beach, and photo attached to user
// IDs that no longer resolve to anybody. The Supabase free plan includes no
// automated backups at all -- Supabase's own docs tell free-tier projects to
// export their data themselves -- so without this there is no copy anywhere.
//
// WHAT THIS DOES *NOT* CAPTURE: password hashes. The Admin API doesn't return
// them at any privilege level (verified against a real response, not assumed);
// reading them needs a direct pg_dump of Supabase's own `auth` schema, which
// needs the database password from their dashboard. See docs/TODO.md #101.
//
// That gap is deliberate and much smaller than it sounds. Passwords are the
// replaceable half -- recreate the accounts and everyone taps "forgot
// password" once. The user UUIDs are the irreplaceable half, because
// shell_finds.user_id points at them: lose those and there is no way to work
// out who logged what. This captures the half that can't be reconstructed.
//
// RESTORING: recreate each account at its original id via the Admin API's
// createUser (it accepts an explicit `id`), then every find reattaches on its
// own. Users set new passwords via the normal reset flow.
//
// Usage:
//   node api/scripts/backup-auth.mjs                 # -> ./backups/auth
//   node api/scripts/backup-auth.mjs /path/to/dir

import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_DIR = path.resolve(API_DIR, '..');
const OUT_DIR = process.argv[2] || path.join(REPO_DIR, 'backups', 'auth');
const KEEP = 14; // matches the database dump retention

async function loadEnv() {
  const raw = await readFile(path.join(API_DIR, '.env'), 'utf8');
  const out = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

const env = await loadEnv();
for (const key of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
  if (!env[key]) {
    console.error(`ERROR: ${key} missing from api/.env -- cannot reach Supabase Auth.`);
    process.exit(1);
  }
}

const headers = {
  apikey: env.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
};

// Must paginate through everything. Do NOT try to narrow this with a filter
// param -- the Admin API silently ignores ?email= and hands back page 1 of all
// users as though it had filtered (see CLAUDE.md).
const PER_PAGE = 1000;
const users = [];
for (let page = 1; ; page++) {
  const res = await fetch(
    `${env.SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=${PER_PAGE}`,
    { headers },
  );
  if (!res.ok) {
    console.error(`ERROR: Supabase returned HTTP ${res.status}: ${await res.text()}`);
    process.exit(1);
  }
  const batch = (await res.json()).users ?? [];
  users.push(...batch);
  if (batch.length < PER_PAGE) break;
}

// Zero users means something is wrong, not that the app has no accounts --
// a revoked service-role key or a wrong project URL can both return an empty
// list rather than an error. Writing that out would quietly replace a good
// export with an empty one and report success.
if (users.length === 0) {
  console.error('ERROR: Supabase returned zero users. Treating as failure --');
  console.error('       a wrong project URL or revoked key looks identical to an empty list.');
  process.exit(1);
}

await mkdir(OUT_DIR, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outFile = path.join(OUT_DIR, `supabase_auth_${stamp}.json`);

await writeFile(
  outFile,
  JSON.stringify(
    {
      exported_at: new Date().toISOString(),
      supabase_url: env.SUPABASE_URL,
      user_count: users.length,
      // Stored verbatim rather than reduced to the fields that look useful
      // today -- this file is only read during a restore, and that's a bad
      // moment to discover a field was filtered out years earlier.
      users,
      note:
        'Password hashes are NOT included; the Admin API does not expose them. ' +
        'Restore by recreating each user at its original `id` via the Admin API, ' +
        'then have users reset passwords through the normal flow.',
    },
    null,
    2,
  ),
  'utf8',
);

const confirmed = users.filter((u) => u.email_confirmed_at).length;
console.log(`Exported ${users.length} users (${confirmed} confirmed) -> ${outFile}`);

// Prune old exports, newest first. Filenames sort chronologically because the
// timestamp is ISO-ordered.
const existing = (await readdir(OUT_DIR))
  .filter((f) => f.startsWith('supabase_auth_') && f.endsWith('.json'))
  .sort()
  .reverse();
for (const stale of existing.slice(KEEP)) {
  await unlink(path.join(OUT_DIR, stale));
  console.log(`  pruned ${stale}`);
}
