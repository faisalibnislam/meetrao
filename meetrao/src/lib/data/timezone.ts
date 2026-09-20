import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { convexServes } from "@/lib/backend";
import { convexServer } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { supportedTimezone } from "@/lib/timezones";

/**
 * Records the zone a browser reported, while it is still ours to set.
 *
 * An email sign-up carries the detected zone in a hidden field and the profile
 * trigger writes it (migration 0008). A Google sign-up has no form, so the
 * zone travels on the OAuth return URL and lands here instead.
 *
 * `timezone_auto` is what keeps this honest. It is true only until the host
 * picks a zone in onboarding or Settings, so signing in again a month later
 * cannot quietly move a host who deliberately chose UTC back onto whatever
 * their laptop happens to say.
 *
 * Service role: `timezone_auto` is not something a browser session should be
 * able to set back to true.
 *
 * Never throws. A wrong timezone is worth fixing; it is not worth failing a
 * sign-in over.
 */
export async function applyDetectedTimezone(userId: string, detected: string | null): Promise<void> {
  if (!detected) return;

  const timezone = supportedTimezone(detected);
  if (timezone === "UTC") return; // nothing learned — that is already the default

  try {
    if (convexServes("session")) {
      // The guard moved into the mutation: it writes only when timezone_auto
      // is already true, so the rule holds whoever calls it.
      const convex = await convexServer();
      await convex.mutation(api.profiles.applyDetectedTimezone, { detected: timezone });
      return;
    }

    const { error } = await supabaseAdmin()
      .from("profiles")
      .update({ timezone, timezone_auto: true })
      .eq("id", userId)
      .eq("timezone_auto", true);

    if (error) console.error("applyDetectedTimezone failed", { userId, error: error.message });
  } catch (cause) {
    console.error("applyDetectedTimezone threw", {
      userId,
      error: cause instanceof Error ? cause.message : String(cause),
    });
  }
}
