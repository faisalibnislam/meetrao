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
 * This is the CLIENT half. It has to sit inside `ConvexAuthNextjsServerProvider`
 * (see src/app/layout.tsx), on its own it throws, because `useAuth()` comes
 * back undefined with nothing above it to supply the state.
 */
export function ConvexClientProvider({ children }: { children: React.ReactNode }) {
  return <ConvexAuthNextjsProvider client={client()}>{children}</ConvexAuthNextjsProvider>;
}
