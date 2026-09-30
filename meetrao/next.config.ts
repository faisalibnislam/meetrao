import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The email templates are read from disk at send time so the design's
  // send-ready HTML stays the source of truth. Without this include they are
  // not traced into the deployment, and sending fails only in production.
  outputFileTracingIncludes: {
    "/**": ["./src/emails/**"],
  },

  /* ───────────────────────────────────────────────────────────────────────────
     Framing.

     Nothing set a policy before, which means every screen — the dashboard, the
     settings page, the sign-in form — could be put in an invisible iframe on
     somebody else's site and clicked through. The embed widget makes that
     worse, because it gives a real reason to allow framing somewhere, and a
     blanket allow is how that reason becomes a hole.

     So: denied everywhere, allowed on /embed alone. `frame-ancestors *` on the
     widget is deliberate — a host puts it on their own site and we cannot know
     the domain — and the widget shows only what the public booking page
     already shows to anyone with the link.

     X-Frame-Options has no "allow any origin" value, so the widget sends only
     the CSP; every other route sends both, because the old header is still
     what some corporate proxies enforce.
     ─────────────────────────────────────────────────────────────────────────── */
  async headers() {
    return [
      {
        source: "/embed/:path*",
        headers: [{ key: "Content-Security-Policy", value: "frame-ancestors *" }],
      },
      {
        source: "/((?!embed).*)",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
