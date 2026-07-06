// Exports the JSON snapshots the static (GitHub Pages) build serves in
// place of the live API routes. Written to public/data/ so `next build`
// with output:'export' copies them into out/data/.
//
// Each file mirrors its API route's response shape exactly:
//   internships.json    GET /api/internships (owner view: hidden included)
//   stats.json          GET /api/internships/stats
//   sources.json        GET /api/internships/sources
//   source-health.json  GET /api/internships/source-health
//
// Usage: npx tsx scripts/export-static.ts
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { getInternships, getStats, closeDb } from '../src/lib/store';
import { pickListFields } from '../src/app/_lib/list-item';
import { loadATSTargets } from '../src/lib/utils/ats-discovery';
import { buildSourceHealth } from '../src/lib/source-health';

const OUT_DIR = path.join(process.cwd(), 'public', 'data');

async function main(): Promise<void> {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Owner view: hidden rows ship with their hidden flag and the client
  // filters them, same as the live UI does for the owner. The Pages site is
  // single-user so there is no non-owner audience to strip them for.
  const internships = (await getInternships({ sort: 'score', includeHidden: true }))
    .map(pickListFields);

  const stats = await getStats();

  const targets = loadATSTargets();
  const byType: Record<string, number> = {};
  for (const t of targets) {
    const key = t.ats ?? 'other';
    byType[key] = (byType[key] ?? 0) + 1;
  }
  const sources = { total: targets.length, byType };

  const sourceHealth = await buildSourceHealth();

  const files: Record<string, unknown> = {
    'internships.json': internships,
    'stats.json': stats,
    'sources.json': sources,
    'source-health.json': sourceHealth,
  };
  for (const [name, body] of Object.entries(files)) {
    const p = path.join(OUT_DIR, name);
    fs.writeFileSync(p, JSON.stringify(body));
    console.log(`[export-static] wrote ${p} (${(fs.statSync(p).size / 1024).toFixed(0)} KB)`);
  }
}

main()
  .then(async () => { await closeDb(); process.exit(0); })
  .catch(async (err) => {
    console.error('[export-static] Fatal:', err);
    try { await closeDb(); } catch {}
    process.exit(1);
  });
