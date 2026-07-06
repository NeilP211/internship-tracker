import type { NextConfig } from "next";

// STATIC_EXPORT=1 (set by scripts/build-static.sh) produces the GitHub Pages
// bundle: a fully static export under the /internship-tracker project path,
// with NEXT_PUBLIC_* flags baked in so the client fetches the exported JSON
// snapshots instead of the API routes (see src/app/_lib/static-mode.ts).
const isStaticExport = process.env.STATIC_EXPORT === "1";
const basePath = "/internship-tracker";

const nextConfig: NextConfig = {
  transpilePackages: ["@base-ui/react"],
  // Default is true, but Next.js 16 has been inconsistent about applying it
  // to dynamic API routes. Setting explicitly so prod always gzips the big
  // /api/internships payload (~2.1MB raw → ~410KB gzip) without needing a
  // reverse-proxy or per-route plumbing.
  compress: true,
  ...(isStaticExport
    ? {
        output: "export" as const,
        basePath,
        trailingSlash: true,
        env: {
          NEXT_PUBLIC_STATIC: "1",
          NEXT_PUBLIC_BASE_PATH: basePath,
        },
      }
    : {}),
};

export default nextConfig;
