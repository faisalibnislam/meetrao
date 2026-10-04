"use server";

import { revalidatePath } from "next/cache";
import { convexServer } from "@/lib/convex/server";
import { convexMessage } from "@/lib/convex/error";
import { api } from "@/convex/_generated/api";
import { activeContext } from "@/lib/data/context";

/* ─────────────────────────────────────────────────────────────────────────────
   Branding and the custom domain, from the host's settings screen.

   Every one of these is a thin wrapper: the Convex mutation holds the Pro
   gate and the validation, and these exist to turn a thrown Convex error into
   a sentence a panel can show. Putting the rules here instead would put them
   behind a server action, which anything with a session can call.

   The custom domain is NOT here. It is the other half of the same Pro
   feature, but its actions already live in src/lib/actions/billing.ts beside
   the checkout. A second set of claim/verify/release actions would be two
   code paths writing one row.

   EVERY ONE OF THESE WRITES TO THE WORKSPACE IN FORCE. In a company that is
   the company's brand, which is what its domain serves; in Personal it is the
   profile's. The company id comes from the cookie on the server rather than
   from the caller, so a panel cannot be made to write somebody else's brand,
   and Convex re-checks the membership regardless.
   ───────────────────────────────────────────────────────────────────────────── */

function refreshBookingPages() {
  // The booking pages are force-dynamic, so this is for the settings screen's
  // own copy of the brand, and for the dashboard, which shows the plan.
  revalidatePath("/settings", "layout");
}

/** The one-time URL the browser posts the logo to. */
export async function logoUploadUrl(): Promise<{ url?: string; error?: string }> {
  try {
    const convex = await convexServer();
    const { companyId } = await activeContext();
    return {
      url: companyId
        ? await convex.mutation(api.companyBranding.generateUploadUrl, { id: companyId })
        : await convex.mutation(api.branding.generateUploadUrl, {}),
    };
  } catch (cause) {
    return { error: convexMessage(cause, "Could not start the upload.") };
  }
}

/**
 * Records a freshly uploaded logo.
 *
 * The argument is an opaque storage id, never a path: the client does not
 * choose where the bytes land, so there is nothing to forge. Size and format
 * are checked in the mutation, after the file exists, see convex/branding.ts
 * for why that is the only place it can be done honestly.
 */
export async function saveLogo(storageId: string): Promise<{ url?: string | null; error?: string }> {
  try {
    const convex = await convexServer();
    const { companyId } = await activeContext();
    const url = companyId
      ? await convex.mutation(api.companyBranding.saveLogo, { id: companyId, storageId: storageId as never })
      : await convex.mutation(api.branding.saveLogo, { storageId: storageId as never });
    refreshBookingPages();
    return { url };
  } catch (cause) {
    return { error: convexMessage(cause, "That logo could not be saved.") };
  }
}

export async function removeLogo(): Promise<{ error?: string }> {
  try {
    const { companyId } = await activeContext();
    const convex = await convexServer();
    if (companyId) await convex.mutation(api.companyBranding.removeLogo, { id: companyId });
    else await convex.mutation(api.branding.removeLogo, {});
  } catch (cause) {
    return { error: convexMessage(cause, "That logo could not be removed.") };
  }
  refreshBookingPages();
  return {};
}

/** An empty string clears it. The contrast rules live in convex/lib/brand.ts. */
/** The page background. Empty clears it, back to a wash of the accent. */
export async function setBrandBackground(color: string): Promise<{ color?: string | null; error?: string }> {
  try {
    const convex = await convexServer();
    const { companyId } = await activeContext();
    const saved = companyId
      ? await convex.mutation(api.companyBranding.setBackground, { id: companyId, color })
      : await convex.mutation(api.branding.setBackground, { color });
    refreshBookingPages();
    return { color: saved };
  } catch (cause) {
    return { error: convexMessage(cause, "That background could not be saved.") };
  }
}

export async function setBrandColor(color: string): Promise<{ color?: string | null; error?: string }> {
  try {
    const convex = await convexServer();
    const { companyId } = await activeContext();
    const saved = companyId
      ? await convex.mutation(api.companyBranding.setColor, { id: companyId, color })
      : await convex.mutation(api.branding.setColor, { color });
    refreshBookingPages();
    return { color: saved };
  } catch (cause) {
    return { error: convexMessage(cause, "That colour could not be saved.") };
  }
}
