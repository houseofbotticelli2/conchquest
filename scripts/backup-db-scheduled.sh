#!/usr/bin/env bash
#
# launchd wrapper around backup-db.sh. Not meant to be run by hand -- run
# ./scripts/backup-db.sh directly for that.
#
# Exists for two reasons launchd doesn't handle on its own:
#
#  1. launchd gives a job a nearly empty PATH, so `railway`, `nc`, and the
#     pinned pg_dump aren't findable unless we set it here.
#  2. A scheduled backup that has been silently failing for three months is
#     worse than no backup, because you'd think you had one. On failure this
#     posts a macOS notification so it can't rot unnoticed.

export PATH="/opt/homebrew/bin:/opt/homebrew/opt/postgresql@17/bin:/usr/bin:/bin:/usr/sbin:/sbin"

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# iCloud Drive, so the dump leaves this Mac. Railway holds the live database
# and this holds the copy -- keeping both on the same laptop would mean one
# lost machine takes the only backup with it.
DEST="$HOME/Library/Mobile Documents/com~apple~CloudDocs/Conchquest Backups"

echo "=== $(date '+%Y-%m-%d %H:%M:%S') starting scheduled backup ==="

if "$REPO/scripts/backup-db.sh" "$DEST"; then
  echo "=== $(date '+%Y-%m-%d %H:%M:%S') OK ==="
  exit 0
fi

STATUS=$?
echo "=== $(date '+%Y-%m-%d %H:%M:%S') FAILED (exit $STATUS) ==="

# Notification rather than just a log line -- nobody reads a log they have no
# reason to suspect. Best-effort: this fails harmlessly if no GUI session.
osascript -e 'display notification "Check ~/Library/Logs/conchquest-backup.log" with title "Conchquest DB backup failed" sound name "Basso"' 2>/dev/null || true

exit "$STATUS"
