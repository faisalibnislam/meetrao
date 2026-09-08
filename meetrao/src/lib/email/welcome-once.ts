import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendWelcome } from "./send";

/**
 * Sends welcome.html the first time, and never again.
 *
 * The design's trigger is "Email confirmed, or Google sign-up" — not the end of
 * onboarding, which is where this used to live and which a host who abandons
 * setup never reaches.
 *
 * Email confirmation happens once because the token is single-use, but
 * /auth/callback runs on every Google sign-in. So the send is claimed: one
 * UPDATE, with `welcomed_at is null` in the WHERE. Postgres settles the race —
 * two concurrent callbacks cannot both update the row, and whichever loses gets
 * no row back and sends nothing.
 *
 * The flag is set before the send rather than after. A welcome email that goes
 * missing is a small thing; one that arrives every time a host signs in is the
 * kind of bug people unsubscribe over.
 *
 * Never throws. Nothing here is worth blocking a sign-in for.
 */
export async function sendWelcomeOnce(userId: string): Promise<void> {
  try {
    const { data } = await supabaseAdmin()
      .from("profiles")
      .update({ welcomed_at: new Date().toISOString() })
      .eq("id", userId)
      .is("welcomed_at", null)
      .select("id, username, full_name, email")
      .maybeSingle();

    // No row: already welcomed, or the profile trigger has not run yet.
    if (!data?.email) return;

    await sendWelcome(data as Parameters<typeof sendWelcome>[0]);
  } catch {
    // Deliberately swallowed — see above.
  }
}
