import { buildSourceHealth } from "@/lib/source-health";

export const dynamic = "force-dynamic";

// Logic lives in src/lib/source-health.ts, shared with the static-export
// script (scripts/export-static.ts), which cannot import route files: the
// GitHub Pages build stashes src/app/api/ away for the duration of the build.
export async function GET() {
  return Response.json(await buildSourceHealth());
}
