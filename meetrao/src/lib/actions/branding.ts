"use server";

import { revalidatePath } from "next/cache";
import { convexServer } from "@/lib/convex/server";
import { convexMessage } from "@/lib/convex/error";
import { api } from "@/convex/_generated/api";

/* ─────────────────────────────────────────────────────────────────────────────
   Branding and the custom domain, from the host's settings screen.

   Every one of these is a thin wrapper: the Convex mutation holds the Pro
   gate and the validation, and these exist to turn a thrown Convex error into
   a sentence a panel can show. Putting the rules here instead would put them
   behind a server action, which anything with a session can call.

   The custom domain is NOT here. It is the other half of the same Pro
   feature, but its actions already live in src/lib/actions/billing.ts beside
   the checkout — a second set of claim/verify/release actions would be two
   code paths writing one row.
   ───────────────────────────────────────────────────────────────────────────── */

function refreshBookingPages() {
  // The booking pages are force-dynamic, so this is for the settings screen's
  // own copy of the brand — and for the dashboard, which shows the plan.
  revalidatePath("/settings", "layout");
}

/** The one-time URL the browser posts the logo to. */
export async function logoUploadUrl(): Promise<{ url?: string; error?: string }> {
  try {
    const convex = await convexServer();
    return { url: await convex.mutation(api.branding.generateUploadUrl, {}) };
  } catch (cause) {
    return { error: convexMessage(cause, "Could not start the upload.") };
  }
}

/**
 * Records a freshly uploaded logo.
 *
 * The argument is an opaque storage id, never a path: the client does not
 * choose where the bytes land, so there is nothing to forge. Size and format
 * are checked in the mutation, after the file exists — see convex/branding.ts
 * for why that is the only place it can be done honestly.
 */
export async function saveLogo(storageId: string): Promise<{ url?: string | null; error?: string }> {
  try {
    const convex = await convexServer();
    const url = await convex.mutation(api.branding.saveLogo, { storageId: storageId as never });
    refreshBookingPages();
    return { url };
  } catch (cause) {
    return { error: convexMessage(cause, "That logo could not be saved.") };
  }
}

export async function removeLogo(): Promise<{ error?: string }> {
  try {
    await (await convexServer()).mutation(api.branding.removeLogo, {});
  } catch (cause) {
    return { error: convexMessage(cause, "That logo could not be removed.") };
  }
  refreshBookingPages();
  return {};
}

/** An empty string clears it. The contrast rules live in convex/lib/brand.ts. */
export async function setBrandColor(color: string): Promise<{ color?: string | null; error?: string }> {
  try {
    const convex = await convexServer();
    const saved = await convex.mutation(api.branding.setColor, { color });
    refreshBookingPages();
    return { color: saved };
  } catch (cause) {
    return { error: convexMessage(cause, "That colour could not be saved.") };
  }
}
