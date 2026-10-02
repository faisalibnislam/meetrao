import "server-only";

import { convexServer } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";

/**
 * Seeds the design's default week the first time onboarding step 4 is opened,
 * so the host edits a sensible schedule rather than an empty one.
 *
 * Idempotent: the mutation returns early when the host already has a schedule,
 * so calling this on every visit to step 4 is safe.
 *
 * Scoped to the caller's own account, which is a quiet improvement on what it
 * replaced. `seed_default_availability` was SECURITY DEFINER and took the user
 * id as an argument, so it could only be granted to the service role, and the
 * previous caller used the host's own session, was rejected by PostgREST every
 * time, ignored the result, and silently showed an empty week. There is no
 * user id to pass here, so that class of mistake cannot recur.
 *
 * Returns whether the seed ran cleanly. Never throws: an empty week is a poor
 * step 4, but it is not a reason to fail the page.
 */
export async function ensureDefaultAvailability(userId: string): Promise<boolean> {
  try {
    const convex = await convexServer();
    await convex.mutation(api.availability.seed, {});
    return true;
  } catch (cause) {
    console.error("seeding default availability failed", {
      userId,
      error: cause instanceof Error ? cause.message : String(cause),
    });
    return false;
  }
}
