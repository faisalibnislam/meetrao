import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { requirePublicEnv, serviceRoleKey } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Session-scoped server client. Use this everywhere a request is acting *as the
 * signed-in user* — RLS then does the authorisation work.
 */
export async function createClient() {
  const { supabaseUrl, supabaseAnonKey } = requirePublicEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only. The
          // middleware refreshes the session, so this is safe to swallow.
        }
      },
    },
  });
}

/**
 * Service-role client. Bypasses RLS entirely, so it is reserved for the three
 * places that genuinely need it:
 *
 *   1. Reading/writing calendar_connections (OAuth tokens).
 *   2. Creating a booking, where the slot must be validated in the same
 *      transaction as the insert.
 *   3. Serving a guest their own booking by unguessable reference.
 *
 * Never pass user-supplied filters to this client without validating them
 * first — there is no RLS behind it.
 */
export function createAdminClient() {
  const { supabaseUrl } = requirePublicEnv();
  const supabaseServiceRoleKey = serviceRoleKey();

  return createSupabaseClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
