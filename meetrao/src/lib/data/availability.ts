import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Seeds the design's default week the first time onboarding step 4 is opened,
 * so the host edits a sensible schedule rather than an empty one.
 *
 * Runs through the service role deliberately. `seed_default_availability` is
 * SECURITY DEFINER and takes the user id as an argument, so granting EXECUTE to
 * `authenticated` would let any signed-in user seed any other user's
 * availability. It is granted to service_role only — which meant the previous
 * caller, using the host's own session, was rejected by PostgREST every time.
 * The result was ignored, so step 4 silently showed an empty week instead of
 * the seeded one.
 *
 * The SQL is itself a no-op when rules already exist, so calling this on every
 * visit to step 4 is safe and idempotent.
 *
 * Returns whether the seed ran cleanly. Never throws: an empty week is a poor
 * step 4, but it is not a reason to fail the page.
 */
export async function ensureDefaultAvailability(userId: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin().rpc("seed_default_availability", { p_user_id: userId });
    if (error) {
      console.error("seed_default_availability failed", { userId, error: error.message });
      return false;
    }
    return true;
  } catch (cause) {
    console.error("seed_default_availability threw", {
      userId,
      error: cause instanceof Error ? cause.message : String(cause),
    });
    return false;
  }
}
