// Static (GitHub Pages) mode. scripts/build-static.sh builds with
// STATIC_EXPORT=1, which makes next.config.ts inject NEXT_PUBLIC_STATIC=1
// and NEXT_PUBLIC_BASE_PATH at build time. In this mode the UI fetches
// pre-exported JSON snapshots (written by scripts/export-static.ts) instead
// of the live API routes, and applied/hidden changes persist to
// localStorage instead of PATCHing a server that does not exist on Pages.

import { lsGet, lsSet } from "./storage";

export const STATIC_MODE = process.env.NEXT_PUBLIC_STATIC === "1";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export type StaticDataFile = "internships" | "stats" | "sources" | "source-health";

export function staticDataUrl(name: StaticDataFile): string {
  return `${BASE}/data/${name}.json`;
}

// Applied/hidden overrides, keyed by internship id. The snapshot re-exports
// every few hours with the server-side flags (false on Pages, since nothing
// writes them there), so the overlay is re-applied on every load.
export const LS_OVERRIDES_KEY = "internship-overrides";

export type RowOverride = { applied?: boolean; hidden?: boolean };

export function readOverrides(): Record<string, RowOverride> {
  return lsGet<Record<string, RowOverride>>(LS_OVERRIDES_KEY, {});
}

export function writeOverride(id: string, patch: RowOverride): void {
  const all = readOverrides();
  all[id] = { ...all[id], ...patch };
  // Drop entries that are back to the default (both flags falsy) so the
  // map does not grow forever as postings age out of the corpus.
  if (!all[id].applied && !all[id].hidden) delete all[id];
  lsSet(LS_OVERRIDES_KEY, all);
}

export function applyOverrides<T extends { id: string }>(rows: T[]): T[] {
  const all = readOverrides();
  if (Object.keys(all).length === 0) return rows;
  return rows.map((r) => (all[r.id] ? { ...r, ...all[r.id] } : r));
}
