#!/usr/bin/env bash
#
# Dumps Supabase's own `auth` schema -- the real account records, password
# hashes included.
#
# This is the completing half of api/scripts/backup-auth.mjs. That script asks
# Supabase's Admin API for the user list, which is readable and needs no
# database credential, but the API refuses to return password hashes at any
# privilege level. This goes to the database directly, so a restore can bring
# accounts back exactly as they were instead of forcing everyone through a
# password reset. Both are kept: the JSON still works if this credential ever
# rotates or the connection string changes.
#
# TREAT THE OUTPUT AS A SECRET. It contains every user's password hash. The
# file is written 0600. Don't move it anywhere less private than the rest of
# the backups.
#
# SETUP -- needs SUPABASE_DB_URL in api/.env, which is not there by default:
#   Supabase dashboard -> Project Settings -> Database -> Connection string
#   Use the **Session pooler** (port 5432) or the direct connection. Do NOT use
#   the transaction pooler on port 6543 -- it can't hold the session state
#   pg_dump needs and will fail partway through.
#     SUPABASE_DB_URL=postgresql://postgres.<ref>:<password>@<host>:5432/postgres
#
# Usage:
#   ./scripts/backup-supabase-auth.sh              # -> ./backups/supabase-auth
#   ./scripts/backup-supabase-auth.sh /path/to/dir

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${1:-$REPO/backups/supabase-auth}"
KEEP=14

# v17 pg_dump talks to older servers fine; the broken direction is an older
# pg_dump against a newer server. Supabase's version is theirs to choose and
# can change under us, so pin to the newest we have rather than PATH's default.
PG_DUMP=/opt/homebrew/opt/postgresql@17/bin/pg_dump
[ -x "$PG_DUMP" ] || PG_DUMP=$(command -v pg_dump)
PG_RESTORE=/opt/homebrew/opt/postgresql@17/bin/pg_restore
[ -x "$PG_RESTORE" ] || PG_RESTORE=$(command -v pg_restore)

# The `|| true` matters: with `set -e -o pipefail`, grep finding nothing is a
# failed pipeline, which would kill the script here and turn "not configured
# yet" into a nightly failure instead of the quiet skip below.
DB_URL=$(grep -E '^SUPABASE_DB_URL=' "$REPO/api/.env" 2>/dev/null | head -1 | cut -d= -f2- | sed 's/^["'"'"']//; s/["'"'"']$//' || true)

if [ -z "${DB_URL:-}" ]; then
  # Not an error. This is shipped ahead of the credential so the nightly job
  # picks it up automatically once SUPABASE_DB_URL is filled in -- until then
  # it must stay quiet rather than failing the whole backup run every day.
  echo "SKIP: SUPABASE_DB_URL not set in api/.env -- see this script's header."
  exit 0
fi

mkdir -p "$OUT_DIR"
STAMP=$(date +%Y-%m-%d_%H%M%S)
OUT_FILE="$OUT_DIR/supabase_auth_$STAMP.dump"

# pg_dump creates the output file before it has written anything useful, so a
# connection failure leaves a 0-byte file sitting in the backup directory
# looking like a backup. Bin it on any non-zero exit.
trap 'rc=$?; if [ "$rc" -ne 0 ] && [ -f "$OUT_FILE" ]; then rm -f "$OUT_FILE"; fi; exit "$rc"' EXIT

echo "Dumping Supabase auth schema to $OUT_FILE ..."
umask 077   # hashes: never group- or world-readable, not even briefly

"$PG_DUMP" "$DB_URL" \
  --schema=auth \
  -Fc --no-owner --no-privileges \
  -f "$OUT_FILE"

# A dump that ran clean but captured no users is the dangerous case: it looks
# like a backup and restores to an empty auth system. Match on TABLE DATA, not
# just the table -- a schema-only dump (or one taken by a role that can see the
# table definition but not its rows) still lists `TABLE auth users` and would
# sail past a looser check while containing not a single account.
if ! "$PG_RESTORE" --list "$OUT_FILE" 2>/dev/null | grep -qE 'TABLE DATA +auth +users'; then
  echo "ERROR: dump has no data for auth.users -- treating as failed." >&2
  mv "$OUT_FILE" "$OUT_FILE.SUSPECT"
  exit 1
fi

chmod 600 "$OUT_FILE"
echo "OK: $OUT_FILE ($(du -h "$OUT_FILE" | cut -f1))"

ls -1t "$OUT_DIR"/supabase_auth_*.dump 2>/dev/null | tail -n +$((KEEP + 1)) | while read -r old; do
  echo "Pruning old dump: $(basename "$old")"
  rm -f "$old"
done
