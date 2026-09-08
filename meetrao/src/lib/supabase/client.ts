"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";

let cached: ReturnType<typeof createBrowserClient> | null = null;

/** Browser client. Only ever holds the publishable key. */
export function supabaseBrowser() {
  if (cached) return cached;
  const { url, key } = publicEnv();
  cached = createBrowserClient(url, key);
  return cached;
}
