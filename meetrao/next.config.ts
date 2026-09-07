import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * The six email templates in `src/emails/` are read from disk at request time
   * (`src/lib/email/render.ts`). Next traces static imports, not `readFileSync`
   * paths, so without this they exist in the repo, work locally, and are simply
   * absent from the serverless bundle in production — where every send would
   * fail with ENOENT.
   *
   * Keys are route globs; `/**` covers every route, because sends happen from
   * a route handler (bookings), a server action (support, cancel) and the auth
   * callback alike.
   */
  outputFileTracingIncludes: {
    "/**": ["./src/emails/**"],
  },
};

export default nextConfig;
