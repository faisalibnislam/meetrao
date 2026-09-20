import "server-only";

import { convexServer } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { supportedTimezone } from "@/lib/timezones";

/**
 * Records the zone a browser reported, while it is still ours to set.
 *
 * A Google sign-up has no form to carry the detected zone, so it travels on
 * the OAuth return URL and lands here.
 *
 * `timezone_auto` is what keeps this honest. It is true only until the host
 * picks a zone in onboarding or Settings, so signing in again a month later
 * cannot quietly move a host who deliberately chose UTC back onto whatever
 * their laptop happens to say. The rule is enforced inside the mutation — it
 * writes only when the flag is already true — so it holds whoever calls it.
 *
 * Never throws. A wrong timezone is worth fixing; it is not worth failing a
 * sign-in over.
 */
export async function applyDetectedTimezone(userId: string, detected: string | null): Promise<void> {
  if (!detected) return;

  const timezone = supportedTimezone(detected);
  if (timezone === "UTC") return; // nothing learned — that is already the default

  try {
    const convex = await convexServer();
    await convex.mutation(api.profiles.applyDetectedTimezone, { detected: timezone });
  } catch (cause) {
    console.error("applyDetectedTimezone failed", {
      userId,
      error: cause instanceof Error ? cause.message : String(cause),
    });
  }
}
