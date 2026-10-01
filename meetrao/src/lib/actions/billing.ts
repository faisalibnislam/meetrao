"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/data/session";
import { convexServer } from "@/lib/convex/server";
import { convexMessage } from "@/lib/convex/error";
import { createCheckout, customerPortalUrl, type Cadence } from "@/lib/polar";
import { attachDomain, checkDomain, detachDomain, type DomainState } from "@/lib/vercel-domains";
import { api } from "@/convex/_generated/api";
import { env, siteUrl } from "@/lib/env";

/* Billing and custom domains. The plan itself is never written here — only
   Polar's webhook does that. These actions start a checkout, open the portal,
   and hold a domain claim while Vercel is asked about its DNS. */

export type BillingResult = { error?: string; url?: string };

export async function startCheckout(cadence: Cadence): Promise<BillingResult> {
  const session = await requireSession();

  if (!env().POLAR_ACCESS_TOKEN) {
    return { error: "Billing is not configured yet." };
  }

  const convex = await convexServer();
  const products = await convex.query(api.platformSettings.productsForCheckout, {});

  try {
    const checkout = await createCheckout({
      cadence,
      productId: cadence === "yearly" ? products.yearly : products.monthly,
      profileId: session.profile.id,
      email: session.profile.email,
      // Pro is granted by the webhook, not by arriving here — this page just
      // says thank you and reloads the plan.
      successUrl: `${siteUrl()}/settings/billing?welcome=1`,
    });
    return { url: checkout.url };
  } catch (cause) {
    return { error: cause instanceof Error ? cause.message : "Could not start checkout." };
  }
}

export async function openPortal(): Promise<BillingResult> {
  const session = await requireSession();
  if (!env().POLAR_ACCESS_TOKEN) return { error: "Billing is not configured yet." };

  try {
    return { url: await customerPortalUrl(session.profile.id) };
  } catch (cause) {
    return { error: cause instanceof Error ? cause.message : "Could not open the billing portal." };
  }
}

export type DomainResult = { error?: string; state?: DomainState };

export async function claimDomain(domain: string): Promise<DomainResult> {
  await requireSession();
  const convex = await convexServer();

  let claimed: string;
  try {
    claimed = await convex.mutation(api.domains.claim, { domain });
  } catch (cause) {
    return { error: convexMessage(cause, "That domain could not be claimed.") };
  }

  const state = await attachDomain(claimed);
  if (state.status === "verified") {
    await convex.mutation(api.domains.markVerified, { domain: claimed, verified: true });
  }

  revalidatePath("/settings/billing");
  return { state };
}

/** Asks Vercel again. The host presses this after adding the DNS record. */
export async function verifyDomain(domain: string): Promise<DomainResult> {
  await requireSession();
  const convex = await convexServer();

  const state = await checkDomain(domain);
  await convex.mutation(api.domains.markVerified, { domain, verified: state.status === "verified" });

  revalidatePath("/settings/billing");
  return { state };
}

export async function removeDomain(): Promise<DomainResult> {
  await requireSession();
  const convex = await convexServer();

  const had = await convex.mutation(api.domains.release, {});
  if (had) await detachDomain(had);

  revalidatePath("/settings/billing");
  return {};
}
