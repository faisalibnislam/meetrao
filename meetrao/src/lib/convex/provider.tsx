"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";

let cached: ConvexReactClient | null = null;
function client() {
  if (!cached) cached = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  return cached;
}

/**
 * Mounted at the root so the auth forms can reach `useAuthActions`.
 *
 * When Convex Auth is off this renders NOTHING of its own — no provider, no
 * client connection, no behaviour change. That is deliberate: the Supabase
 * path is still what production runs, and it should not start paying for a
 * Convex websocket to support a feature that is switched off.
 *
 * `convexAuth` is decided on the server and passed down rather than read from
 * a NEXT_PUBLIC variable, so the browser cannot disagree with the backend
 * about who issues sessions.
 */
export function ConvexClientProvider({
  children,
  convexAuth,
}: {
  children: React.ReactNode;
  convexAuth: boolean;
}) {
  if (!convexAuth) return <>{children}</>;
  return <ConvexAuthNextjsProvider client={client()}>{children}</ConvexAuthNextjsProvider>;
}
