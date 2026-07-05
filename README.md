# internship-tracker (local)

Personal internship tracker, originally built by [cx18121](https://github.com/cx18121/internship-tracker) and deployed on Railway. This fork runs the whole thing locally on a Mac: same Next.js dashboard, same poller, but backed by Homebrew Postgres instead of a hosted database, with no Docker and no paid services.

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

## How it differs from the original deployment

- `scripts/supervisor.cjs` resolves the repo root instead of the Docker path `/app`, so `npm run serve` works outside the container.
- `scripts/setup-local.sh` replaces the Dockerfile + Railway volume + manual `psql` migration flow.
- `railway.json`, `Dockerfile`, and `docker-entrypoint.sh` are kept but unused locally.
