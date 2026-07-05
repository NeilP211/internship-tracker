#!/usr/bin/env bash
# One-time local setup for macOS (Homebrew). Idempotent: safe to re-run.
# Stands up everything the tracker needs to run on this machine:
#   Postgres 16 + database + migrations, npm deps, Playwright Firefox,
#   the JobSpy Python venv, a .env file, and a production build.
set -euo pipefail

cd "$(dirname "$0")/.."
REPO_ROOT="$(pwd)"
PGBIN=/opt/homebrew/opt/postgresql@16/bin
DB_NAME=internship_tracker

step() { printf '\n\033[1;36m== %s\033[0m\n' "$1"; }

step "Postgres 16"
if [ ! -x "$PGBIN/psql" ]; then
  echo "postgresql@16 not found; installing via Homebrew..."
  brew install postgresql@16
fi
brew services start postgresql@16 >/dev/null 2>&1 || true
for i in $(seq 1 15); do
  "$PGBIN/pg_isready" -q && break
  sleep 1
done
"$PGBIN/pg_isready" || { echo "Postgres did not come up"; exit 1; }

step "Database + migrations"
"$PGBIN/psql" -d postgres -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 \
  || "$PGBIN/createdb" "$DB_NAME"
for f in migrations/*.sql; do
  echo "applying $f"
  "$PGBIN/psql" -q -d "$DB_NAME" -f "$f"
done

step "Node dependencies"
npm ci --no-audit --no-fund

step "Playwright Firefox (YC WaaS, Workday, Handshake pollers)"
npx playwright install firefox

step "Python venv for JobSpy (LinkedIn scraping)"
if [ ! -x .venv/bin/python3 ]; then
  python3 -m venv .venv
fi
.venv/bin/pip install --quiet --upgrade pip
.venv/bin/pip install --quiet python-jobspy
.venv/bin/python -c "import jobspy" && echo "jobspy OK"

step ".env"
if [ ! -f .env ]; then
  TOKEN="$(openssl rand -hex 16)"
  cat > .env <<EOF
DATABASE_URL=postgresql://localhost:5432/$DB_NAME
OWNER_TOKEN=$TOKEN
EOF
  echo "wrote .env with a fresh OWNER_TOKEN"
else
  echo ".env already exists; leaving it alone"
fi

step "Production build"
npm run build

step "Done"
TOKEN_LINE="$(grep '^OWNER_TOKEN=' .env | cut -d= -f2)"
cat <<EOF

Run the tracker (web on http://localhost:3000 + poller):
  npm run serve

One-time, in the browser console at http://localhost:3000, unlock owner mode:
  localStorage.ownerToken = "$TOKEN_LINE"
EOF
