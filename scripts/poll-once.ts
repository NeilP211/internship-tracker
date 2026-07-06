// One-shot poll for CI (the GitHub Pages cron): run a single 'all' cycle,
// optionally the daily revalidation passes, then exit. The long-running
// daemon (src/poller/index.ts) stays as-is for local `npm run serve`.
//
// Usage:
//   npx tsx scripts/poll-once.ts                # one 'all' cycle
//   REVALIDATE=1 npx tsx scripts/poll-once.ts   # cycle + link revalidation
//
// Exit codes: 0 on success (individual sources failing is fine, they are
// fail-soft inside runCycle), 1 on a wedged/thrown cycle so the workflow
// run shows red and the previous Pages deploy stays live.
import 'dotenv/config';
import { runCycle } from '../src/poller/agent';
import { revalidateLinks, closeDb } from '../src/lib/store';
import { revalidateLinkedIn } from '../src/poller/linkedin-revalidate';
import { withTimeout } from '../src/poller/utils/with-timeout';

const WATCHDOG_MS_CYCLE = parseInt(process.env.WATCHDOG_MS_INITIAL || String(25 * 60 * 1000), 10);
const WATCHDOG_MS_REVALIDATE = parseInt(process.env.WATCHDOG_MS_REVALIDATE || String(30 * 60 * 1000), 10);

async function main(): Promise<void> {
  console.log('[poll-once] Running one full cycle');
  await withTimeout(runCycle({ tier: 'all' }), WATCHDOG_MS_CYCLE, 'poll-once cycle');

  if (process.env.REVALIDATE === '1') {
    console.log('[poll-once] Running link revalidation');
    try {
      await withTimeout(revalidateLinks(), WATCHDOG_MS_REVALIDATE, 'link revalidation');
    } catch (err) {
      console.error('[poll-once] Link revalidation threw:', err);
    }
    try {
      await withTimeout(revalidateLinkedIn(), WATCHDOG_MS_REVALIDATE, 'linkedin revalidation');
    } catch (err) {
      console.error('[poll-once] LinkedIn revalidation threw:', err);
    }
  }
}

main()
  .then(async () => {
    await closeDb();
    console.log('[poll-once] Done');
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('[poll-once] Fatal:', err);
    try { await closeDb(); } catch {}
    process.exit(1);
  });
