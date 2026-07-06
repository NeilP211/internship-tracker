#!/usr/bin/env bash
# Builds the static GitHub Pages bundle into out/.
#
# Next's output:'export' refuses to build dynamic API route handlers, so the
# api/ directory is moved aside for the duration of the build and restored
# after (even on failure). Run scripts/export-static.ts first so the JSON
# snapshots in public/data/ get copied into out/data/.
set -euo pipefail
cd "$(dirname "$0")/.."

API_DIR=src/app/api
STASH=.api-stash

restore() {
  if [ -d "$STASH" ] && [ ! -d "$API_DIR" ]; then
    mv "$STASH" "$API_DIR"
  fi
}
trap restore EXIT

[ -d "$API_DIR" ] && mv "$API_DIR" "$STASH"

STATIC_EXPORT=1 npx next build

touch out/.nojekyll
echo "[build-static] out/ ready"
