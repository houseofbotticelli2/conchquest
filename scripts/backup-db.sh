#!/usr/bin/env bash
#
# Dumps the shared Conchquest Postgres database to a local file.
#
# This is currently the ONLY backup of the database, not merely the offsite
# layer of a larger story -- Railway's own scheduled backups need the Pro
# plan and we're on Hobby (docs/TODO.md #101). So a dump that silently stops
# happening, or that lives only on this Mac, is a real single point of
# failure. Both are handled by running it on a schedule and writing to
# iCloud; see scripts/backup-db-scheduled.sh.
#
# Usage:
#   ./scripts/backup-db.sh              # writes to ./backups/ (gitignored)
#   ./scripts/backup-db.sh ~/Dropbox/cq # writes to a directory you choose
#
# The daily launchd job runs the wrapper, not this file directly.
#
# Requires: railway CLI (logged in), pg_dump 17+, and the SSH key registered
# with Railway -- see docs/TABLEPLUS_DATABASE_ACCESS.md for that setup.

set -euo pipefail

OUT_DIR="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/backups}"
TUNNEL_PORT=5433
SERVICE=conchquest-postgres
KEEP=14  # local dumps to retain; Railway keeps its own separate history

# Must match the server's major version -- an older pg_dump refuses to dump
# a newer server outright, so don't silently fall back to whatever is on PATH.
PG_DUMP=/opt/homebrew/opt/postgresql@17/bin/pg_dump
[ -x "$PG_DUMP" ] || PG_DUMP=$(command -v pg_dump)
# pg_restore must match too -- an older pg_restore can't even *read* a newer
# archive ("unsupported version in file header"), which would make the
# verify step below fail on a perfectly good dump.
PG_RESTORE=/opt/homebrew/opt/postgresql@17/bin/pg_restore
[ -x "$PG_RESTORE" ] || PG_RESTORE=$(command -v pg_restore)

cd "$(dirname "${BASH_SOURCE[0]}")/../api"   # railway CLI needs the linked dir

mkdir -p "$OUT_DIR"
STAMP=$(date +%Y-%m-%d_%H%M%S)
OUT_FILE="$OUT_DIR/conchquest_$STAMP.dump"

# The database has no public host (see docs/TODO.md #79) -- everything goes
# through an SSH tunnel that only exists while this process is alive.
echo "Opening tunnel on port $TUNNEL_PORT..."
railway connect "$SERVICE" --tunnel-only --ssh -P "$TUNNEL_PORT" >/tmp/cq-backup-tunnel.log 2>&1 &
TUNNEL_PID=$!

cleanup() {
  rc=$?
  # Kill the whole tree: the railway CLI spawns its own ssh child, and
  # killing only the parent leaves the port held open.
  pkill -P "$TUNNEL_PID" 2>/dev/null || true
  kill "$TUNNEL_PID" 2>/dev/null || true
  # pg_dump creates its output file before writing anything to it, so any
  # failure mid-dump leaves a truncated or 0-byte file sitting in the backup
  # directory looking like a real backup. Bin it. (A dump that completed but
  # failed verification has already been renamed .SUSPECT, so it survives
  # this -- that one is worth keeping to look at.)
  if [ "$rc" -ne 0 ] && [ -f "$OUT_FILE" ]; then
    echo "Removing incomplete dump: $(basename "$OUT_FILE")" >&2
    rm -f "$OUT_FILE"
  fi
  exit "$rc"
}
trap cleanup EXIT

# Wait for the password line, not just for the port. The port opens a moment
# before the CLI prints credentials, and an open port is a weak signal anyway
# -- a stale tunnel from a previous run would satisfy it. Reading the password
# out of this run's freshly-truncated log proves *this* tunnel is up.
PASSWORD=""
for _ in $(seq 1 30); do
  if nc -z 127.0.0.1 "$TUNNEL_PORT" 2>/dev/null; then
    # `|| true` is load-bearing: under `set -e -o pipefail` a grep that matches
    # nothing fails the pipeline and kills the script outright, so the error
    # messages below would never print and the failure would look silent.
    PASSWORD=$(grep -o 'Password: .*' /tmp/cq-backup-tunnel.log 2>/dev/null | head -1 | awk '{print $2}' || true)
    [ -n "$PASSWORD" ] && break
  fi
  sleep 1
done

if ! nc -z 127.0.0.1 "$TUNNEL_PORT" 2>/dev/null; then
  echo "ERROR: tunnel never came up. Last output:" >&2
  cat /tmp/cq-backup-tunnel.log >&2
  exit 1
fi

if [ -z "$PASSWORD" ]; then
  echo "ERROR: tunnel is up but never printed a password. Last output:" >&2
  cat /tmp/cq-backup-tunnel.log >&2
  exit 1
fi

echo "Dumping to $OUT_FILE ..."
# Custom format (-Fc): compressed, and restorable selectively with pg_restore.
PGPASSWORD="$PASSWORD" "$PG_DUMP" \
  -h 127.0.0.1 -p "$TUNNEL_PORT" -U postgres -d railway \
  -Fc --no-owner --no-privileges \
  -f "$OUT_FILE"

SIZE=$(du -h "$OUT_FILE" | cut -f1)

# A dump that silently wrote 0 rows is worse than no dump, because you'd
# trust it. Verify it's readable and actually contains the finds table.
if ! "$PG_RESTORE" --list "$OUT_FILE" 2>/dev/null | grep -q "shell_finds"; then
  echo "ERROR: dump wrote but does not contain shell_finds -- treating as failed." >&2
  mv "$OUT_FILE" "$OUT_FILE.SUSPECT"
  exit 1
fi

echo "OK: $OUT_FILE ($SIZE)"

# Prune old local dumps. Railway's retention is separate and unaffected.
ls -1t "$OUT_DIR"/conchquest_*.dump 2>/dev/null | tail -n +$((KEEP + 1)) | while read -r old; do
  echo "Pruning old dump: $(basename "$old")"
  rm -f "$old"
done

echo
echo "Restore with:"
echo "  $PG_RESTORE -h 127.0.0.1 -p $TUNNEL_PORT -U postgres -d railway --clean --no-owner \"$OUT_FILE\""
