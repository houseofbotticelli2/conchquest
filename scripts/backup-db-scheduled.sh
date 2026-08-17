#!/usr/bin/env bash
#
# launchd wrapper: backs up both halves of the app's state -- the Postgres
# database and the photo bucket. Not meant to be run by hand; run
# ./scripts/backup-db.sh or api/scripts/backup-photos.mjs directly for that.
#
# Exists for three reasons launchd doesn't handle on its own:
#
#  1. launchd gives a job a nearly empty PATH, so `railway`, `nc`, the pinned
#     pg_dump, and `node` aren't findable unless we set it up here.
#  2. A scheduled backup that has been silently failing for three months is
#     worse than no backup, because you'd think you had one. On failure this
#     posts a macOS notification so it can't rot unnoticed.
#  3. The two backups are independent -- one failing must not skip the other.

export PATH="/opt/homebrew/bin:/opt/homebrew/opt/postgresql@17/bin:/usr/bin:/bin:/usr/sbin:/sbin"

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# node comes from nvm, not Homebrew, so it isn't on the PATH above and its
# path contains a version number that changes on every upgrade. Ask nvm where
# its default is rather than hardcoding a version that will quietly go stale.
if ! command -v node >/dev/null 2>&1; then
  # shellcheck disable=SC1091
  [ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1
fi

# iCloud Drive, so the dump leaves this Mac. Railway holds the live database
# and this holds the copy -- keeping both on the same laptop would mean one
# lost machine takes the only backup with it.
DEST="$HOME/Library/Mobile Documents/com~apple~CloudDocs/Conchquest Backups"

echo "=== $(date '+%Y-%m-%d %H:%M:%S') starting scheduled backup ==="

FAILED=""

# Run both regardless of the other's outcome: a database that won't dump says
# nothing about whether the photos are reachable, and half a backup is still
# worth having.
"$REPO/scripts/backup-db.sh" "$DEST" || FAILED="$FAILED database"

echo "--- photos ---"
node "$REPO/api/scripts/backup-photos.mjs" "$DEST/photos" || FAILED="$FAILED photos"

# Accounts live in Supabase, not in the database dump above, and the free plan
# backs up nothing. Without this the dump restores to finds owned by nobody.
echo "--- auth ---"
node "$REPO/api/scripts/backup-auth.mjs" "$DEST/auth" || FAILED="$FAILED auth"

if [ -z "$FAILED" ]; then
  echo "=== $(date '+%Y-%m-%d %H:%M:%S') OK ==="
  exit 0
fi

echo "=== $(date '+%Y-%m-%d %H:%M:%S') FAILED:$FAILED ==="

# Notification rather than just a log line -- nobody reads a log they have no
# reason to suspect. Best-effort: this fails harmlessly if no GUI session.
osascript -e "display notification \"Failed:$FAILED. See ~/Library/Logs/conchquest-backup.log\" with title \"Conchquest backup failed\" sound name \"Basso\"" 2>/dev/null || true

exit 1
