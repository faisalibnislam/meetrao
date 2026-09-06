"use client";

import { createBrowserClient } from "@supabase/ssr";
import { requirePublicEnv } from "@/lib/env";
import type { Database } from "./database.types";

/** Browser client. Carries only the anon key; every read is RLS-bounded. */
export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = requirePublicEnv();
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
