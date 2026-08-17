#!/usr/bin/env node
//
// Downloads every object in the Railway Bucket (find photos + profile avatars)
// to a local directory. Companion to scripts/backup-db.sh -- the database holds
// the rows, this holds the pixels they point at, and neither is much use alone.
//
// Lives under api/ rather than the top-level scripts/ so it can use the
// @aws-sdk/client-s3 that's already a dependency here, and read the same
// api/.env the server does. No extra tooling, no second copy of the bucket
// credentials in an rclone config.
//
// ADDITIVE ONLY -- this deliberately never deletes local files. Deleting a
// find deletes its object from the bucket (see storage.ts), so a true mirror
// would dutifully propagate an accidental deletion and wipe out the last
// remaining copy. Extra files piling up locally is the failure mode we want.
//
// Usage:
//   node api/scripts/backup-photos.mjs                 # -> ./backups/photos
//   node api/scripts/backup-photos.mjs /path/to/dir

import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { createWriteStream } from 'node:fs';
import { mkdir, stat, readFile } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_DIR = path.resolve(API_DIR, '..');
const OUT_DIR = process.argv[2] || path.join(REPO_DIR, 'backups', 'photos');

// Read api/.env directly rather than importing config/env.ts -- this runs as
// plain node with no ts build step, and pulling in the app's config would drag
// along every unrelated required var (database, Supabase, OpenAI) just to
// reach four bucket keys.
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
for (const key of ['BUCKET_ENDPOINT', 'RAILWAY_BUCKET_NAME', 'ACCESS_KEY_ID', 'SECRET_ACCESS_KEY']) {
  if (!env[key]) {
    console.error(`ERROR: ${key} missing from api/.env -- cannot reach the bucket.`);
    process.exit(1);
  }
}

const client = new S3Client({
  endpoint: env.BUCKET_ENDPOINT,
  region: 'auto',
  forcePathStyle: true,
  credentials: { accessKeyId: env.ACCESS_KEY_ID, secretAccessKey: env.SECRET_ACCESS_KEY },
});

async function listAll() {
  const objects = [];
  let token;
  do {
    const res = await client.send(new ListObjectsV2Command({
      Bucket: env.RAILWAY_BUCKET_NAME,
      ContinuationToken: token,
      MaxKeys: 1000,
    }));
    objects.push(...(res.Contents ?? []));
    token = res.NextContinuationToken;
  } while (token);
  return objects;
}

async function alreadyHave(dest, size) {
  try {
    // Size match is the whole check: these objects are immutable once written
    // (every upload gets a fresh randomUUID key), so a key that exists locally
    // at the right size is the same bytes. No need to fetch an ETag.
    return (await stat(dest)).size === size;
  } catch {
    // Missing, or an iCloud-evicted placeholder. Either way, re-download --
    // at this scale that costs seconds and removes a class of doubt.
    return false;
  }
}

console.log(`Backing up bucket "${env.RAILWAY_BUCKET_NAME}" to ${OUT_DIR}`);

const objects = await listAll();
if (objects.length === 0) {
  // An empty listing is ambiguous: a genuinely empty bucket looks exactly like
  // credentials pointed at the wrong place. Refuse to call that a success --
  // it would leave a green log line over a backup of nothing.
  console.error('ERROR: bucket listing returned zero objects. Treating as failure,');
  console.error('       since wrong/expired credentials look identical to an empty bucket.');
  process.exit(1);
}

let downloaded = 0, skipped = 0, failed = 0, bytes = 0;

for (const obj of objects) {
  const dest = path.join(OUT_DIR, obj.Key);

  if (await alreadyHave(dest, obj.Size)) {
    skipped++;
    continue;
  }

  try {
    await mkdir(path.dirname(dest), { recursive: true });
    const res = await client.send(new GetObjectCommand({
      Bucket: env.RAILWAY_BUCKET_NAME,
      Key: obj.Key,
    }));
    // Write to .part first so an interrupted run can't leave a truncated file
    // that the next run's size check would have to catch after the fact.
    await pipeline(res.Body, createWriteStream(`${dest}.part`));
    const { rename } = await import('node:fs/promises');
    await rename(`${dest}.part`, dest);
    downloaded++;
    bytes += obj.Size ?? 0;
    console.log(`  + ${obj.Key} (${Math.round((obj.Size ?? 0) / 1024)} KB)`);
  } catch (err) {
    failed++;
    console.error(`  ! ${obj.Key}: ${err.message}`);
  }
}

console.log(
  `Done: ${downloaded} new (${(bytes / 1024 / 1024).toFixed(1)} MB), ` +
  `${skipped} already present, ${failed} failed, ${objects.length} in bucket.`
);

// Partial success is still failure for a backup -- surface it so the launchd
// wrapper notifies rather than logging a cheerful summary nobody reads.
process.exit(failed > 0 ? 1 : 0);
