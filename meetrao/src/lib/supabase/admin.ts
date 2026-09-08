import "server-only";

import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Service-role client. Reaches past RLS, so it is confined to the three jobs
 * that genuinely need it:
 *
 *   · reading and writing `calendar_connections` (OAuth tokens, which no
 *     browser session may ever see — that table deliberately has no policy)
 *   · the public booking path, which runs with no session at all
 *   · account removal, which deletes from `auth.users`
 *
 * Never import this into a Client Component.
 */
export function supabaseAdmin() {
  const e = env();
  return createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
