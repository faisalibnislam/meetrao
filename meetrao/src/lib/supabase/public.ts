import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requirePublicEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * An anonymous, session-less client for the public booking surface.
 *
 * The `get_public_*` and `get_busy_intervals` RPCs are granted to `anon` and
 * return a deliberately narrow column set, so rendering a booking page needs no
 * service-role privileges at all. Keeping it that way means a bug in the public
 * path cannot read anybody's tokens or guest lists.
 */
export function createPublicClient() {
  const { supabaseUrl, supabaseAnonKey } = requirePublicEnv();
  return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
