#!/usr/bin/env bash
#
# organize-apple-photos-to-dropbox.sh
#
# Copies photos from your macOS Apple Photos library that were taken in a
# given year or earlier (default: 2022) into your Dropbox, organized as:
#
#     Dropbox/Apple Photos/<Location> <Year>/<photo files>
#
# e.g.  Dropbox/Apple Photos/San Francisco 2021/IMG_4032.HEIC
#       Dropbox/Apple Photos/No Location 2019/IMG_0011.JPG
#
# "Location" is the place name Apple already stores for each photo (reverse
# geocoded from the photo's GPS data). Photos with no location go into a
# "No Location <Year>" folder so nothing is dropped.
#
# It exports into your *local* Dropbox folder, and the Dropbox desktop app
# syncs it to the cloud — so you do NOT need a Dropbox API token.
#
# ── Requirements (macOS only) ─────────────────────────────────────────────
#   • The Apple Photos library on this Mac (or signed in to iCloud Photos)
#   • The Dropbox desktop app installed and signed in
#   • osxphotos  ->  the script installs it for you via pipx/pip if missing
#
# ── Usage ─────────────────────────────────────────────────────────────────
#   ./organize-apple-photos-to-dropbox.sh                 # 2022 and older
#   ./organize-apple-photos-to-dropbox.sh --year 2020     # 2020 and older
#   ./organize-apple-photos-to-dropbox.sh --dry-run       # preview only
#   ./organize-apple-photos-to-dropbox.sh --dropbox ~/Dropbox\ \(Personal\)
#   ./organize-apple-photos-to-dropbox.sh --nested        # Location/Year subfolders
#
set -euo pipefail

# ── Defaults (override with flags above) ───────────────────────────────────
YEAR_MAX=2022
DROPBOX_DIR="${HOME}/Dropbox"
TOP_FOLDER="Apple Photos"
DRY_RUN=0
NESTED=0

# ── Parse arguments ─────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --year)     YEAR_MAX="$2"; shift 2 ;;
    --dropbox)  DROPBOX_DIR="$2"; shift 2 ;;
    --top)      TOP_FOLDER="$2"; shift 2 ;;
    --dry-run)  DRY_RUN=1; shift ;;
    --nested)   NESTED=1; shift ;;
    -h|--help)
      grep '^#' "$0" | tail -n +2 | sed 's/^#\s\?//'; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
done

# ── Sanity checks ────────────────────────────────────────────────────────────
if [[ "$(uname)" != "Darwin" ]]; then
  echo "❌ This script must run on macOS (it reads your Apple Photos library)." >&2
  exit 1
fi

if [[ ! -d "$DROPBOX_DIR" ]]; then
  echo "❌ Dropbox folder not found at: $DROPBOX_DIR" >&2
  echo "   Install the Dropbox desktop app, or pass --dropbox /path/to/Dropbox" >&2
  exit 1
fi

# ── Ensure osxphotos is available ────────────────────────────────────────────
if ! command -v osxphotos >/dev/null 2>&1; then
  echo "ℹ️  osxphotos is not installed — installing it now…"
  if command -v pipx >/dev/null 2>&1; then
    pipx install osxphotos
  elif command -v pip3 >/dev/null 2>&1; then
    pip3 install --user osxphotos
  else
    echo "❌ Could not find pipx or pip3 to install osxphotos." >&2
    echo "   Install Python 3 from https://www.python.org/ then re-run." >&2
    exit 1
  fi
fi

DEST="${DROPBOX_DIR%/}/${TOP_FOLDER}"
mkdir -p "$DEST"

# Folder template: "Location Year" (default) or "Location/Year" (--nested).
# {place.name,No Location} = Apple's reverse-geocoded place, with a fallback.
# {created.year}           = the year the photo was taken.
if [[ "$NESTED" -eq 1 ]]; then
  DIR_TEMPLATE='{place.name,No Location}/{created.year}'
else
  DIR_TEMPLATE='{place.name,No Location} {created.year}'
fi

echo "────────────────────────────────────────────────────────"
echo " Source       : Apple Photos library on this Mac"
echo " Keeping      : photos taken in ${YEAR_MAX} and earlier"
echo " Destination  : ${DEST}/<Location> <Year>/"
echo " Folder style : ${DIR_TEMPLATE}"
[[ "$DRY_RUN" -eq 1 ]] && echo " Mode         : DRY RUN (nothing will be copied)"
echo "────────────────────────────────────────────────────────"

# Build the osxphotos command.
#   --to-date           : only photos on or before 23:59:59 on Dec 31 of YEAR_MAX
#   --directory         : the per-photo subfolder template described above
#   --skip-original-if-exists : makes re-runs fast and idempotent
#   --download-missing  : pull originals that live only in iCloud
#   --retry             : retry transient export errors
#   --report            : write a CSV log of everything exported
ARGS=(
  export "$DEST"
  --to-date "${YEAR_MAX}-12-31T23:59:59"
  --directory "$DIR_TEMPLATE"
  --skip-original-if-exists
  --download-missing
  --retry 3
  --report "${DEST}/_export-report.csv"
)
[[ "$DRY_RUN" -eq 1 ]] && ARGS+=(--dry-run)

echo "Running: osxphotos ${ARGS[*]}"
echo
osxphotos "${ARGS[@]}"

echo
if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "✅ Dry run complete — no files were copied. Re-run without --dry-run to do it for real."
else
  echo "✅ Done. Your photos are in: ${DEST}"
  echo "   Dropbox will now sync them to the cloud. A log was saved to ${DEST}/_export-report.csv"
fi
