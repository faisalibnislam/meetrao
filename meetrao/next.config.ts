import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The email templates are read from disk at send time so the design's
  // send-ready HTML stays the source of truth. Without this include they are
  // not traced into the deployment, and sending fails only in production.
  outputFileTracingIncludes: {
    "/**": ["./src/emails/**"],
  },
};

export default nextConfig;
