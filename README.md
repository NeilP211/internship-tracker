# internship-tracker

**Live: https://neilp211.github.io/internship-tracker/**

Personal internship tracker, originally built by [cx18121](https://github.com/cx18121/internship-tracker) and deployed on Railway. This fork runs it two ways with no paid services:

- **GitHub Pages (the link above)**: self-updating. A GitHub Actions cron polls all sources every 3 hours on GitHub's servers, carries the database between runs as a dump on the `data` branch, and publishes a static build plus JSON snapshots. Marking postings applied/hidden persists in your browser (localStorage).
- **Locally on a Mac**: the full live app (Next.js dashboard + always-on poller + Homebrew Postgres), instructions below.

It aggregates SWE/ML internship postings from many sources (SimplifyJobs, Greenhouse/Lever/Ashby/Workday/iCIMS/SmartRecruiters/Rippling/Workable ATS boards, YC Work at a Startup, LinkedIn via JobSpy, Handshake), dedupes them across sources, scores each posting against the preferences in `data/scoring-config.json`, and gives you a fast triage UI.

## One-time setup

```sh
./scripts/setup-local.sh
```

That script is idempotent and does everything: installs/starts Postgres 16 (Homebrew), creates the `internship_tracker` database, applies migrations, installs npm deps, Playwright Firefox, and the JobSpy Python venv, writes `.env` with a generated `OWNER_TOKEN`, and builds the app.

## Running it

```sh
npm run serve
```

That starts both processes under the supervisor: the web UI on http://localhost:3000 and the poller. The poller runs a full scrape immediately on startup, then SimplifyJobs every 15 minutes and the slower sources (ATS boards, YC, JobSpy) every hour. Postings show up in the UI as they land; refresh the page.

Stop it with Ctrl-C. Nothing runs when it is not open in a terminal; leave it running while you are job hunting.

### Owner mode (marking applied / hiding postings)

The UI is read-only until the browser knows your owner token. One time, on http://localhost:3000, open the devtools console and run:

```js
localStorage.ownerToken = "<the OWNER_TOKEN value from .env>"
```

After a refresh you can mark postings applied, hide them, and edit notification settings.

## Optional extras

- **Handshake**: needs a one-time login: `npm run handshake:login` opens a Firefox window; log in with your school SSO, then press Enter in the terminal. The session is saved to `data/handshake-auth.json` and the poller picks it up. Without it, Handshake is skipped cleanly.
- **Discord alerts**: set `DISCORD_BOT_TOKEN` and `DISCORD_CHANNEL_INTERNSHIPS` in `.env`. Unset, alerts are skipped with a log line.
- **Email/SMS alerts**: Resend and Twilio keys in `.env`, plus enabling the channel in the UI settings. Off by default.
- **Scoring**: tune `data/scoring-config.json` (keywords, company tiers, salary weighting) to your own preferences, then restart. It currently carries the original author's preferences.

## Development

- `npm run dev`: web UI only, port 3001, hot reload. Nothing polls in this mode.
- `npm run poller`: run the poller once-and-forever in a terminal (no supervisor restarts).
- `npm run test:ci`: applies migrations, seeds fixtures, and runs the full suite against `DATABASE_URL`. Point it at a throwaway database, never the real one:

```sh
DATABASE_URL=postgresql://localhost:5432/internship_tracker_test npm run test:ci
```

Note: `npm install` arms a pre-push git hook that runs the full test suite; bypass with `SKIP_TESTS=1 git push` if needed.

## How the GitHub Pages deploy works

`.github/workflows/pages.yml` runs every 3 hours (and on push to main):

1. Restores the Postgres state from the single-commit `data` branch (`db.dump` + runtime sidecar JSONs) into a `postgres:16` service container.
2. Runs one full poll cycle (`scripts/poll-once.ts`). The 03:23 UTC run also does the daily dead-link revalidation sweep.
3. Exports the API responses as static JSON (`scripts/export-static.ts` writes `public/data/*.json`).
4. Force-pushes the refreshed dump back to `data` (kept at one commit so the branch never accretes history).
5. Builds the static bundle (`scripts/build-static.sh`: `next build` with `output: "export"` and basePath `/internship-tracker`, with `src/app/api/` stashed aside during the build) and deploys it to Pages.

In the static build the UI runs in "static mode" (`src/app/_lib/static-mode.ts`): it fetches the JSON snapshots instead of the API routes, applied/hidden toggles persist to localStorage, and the notification-settings modal is hidden. Handshake never runs in CI (its auth session stays on your machine and out of the public repo); LinkedIn via JobSpy may yield little from datacenter IPs. Both still work in the local full app.

To enable Discord alerts from the cron, add `DISCORD_BOT_TOKEN` and `DISCORD_CHANNEL_INTERNSHIPS` as repo secrets.

## How it differs from the original deployment

- `scripts/supervisor.cjs` resolves the repo root instead of the Docker path `/app`, so `npm run serve` works outside the container.
- `scripts/setup-local.sh` replaces the Dockerfile + Railway volume + manual `psql` migration flow.
- The GitHub Pages pipeline above replaces the Railway always-on deployment.
- `railway.json`, `Dockerfile`, and `docker-entrypoint.sh` are kept but unused.
