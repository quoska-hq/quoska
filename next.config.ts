import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Avoid advertising implementation details in public responses.
  poweredByHeader: false,
  // Keep product captures and local demos visually identical to production.
  devIndicators: false,
  // Produce the minimal self-contained server copied into the production
  // Docker image. Static assets are added by the Dockerfile.
  output: "standalone",
  // DSGVO: no telemetry
  // typedRoutes disabled during scaffold; enable once all routes exist
  // Allow an isolated build dir for parallel dev servers (e.g. e2e runs that
  // must not share .next/ with another concurrently-running dev server).
  // Only active when E2E_DIST_DIR is set; otherwise the default .next is used.
  ...(process.env.E2E_DIST_DIR ? { distDir: process.env.E2E_DIST_DIR } : {}),
};

export default nextConfig;
