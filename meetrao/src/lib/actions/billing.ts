"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/data/session";
import { convexServer } from "@/lib/convex/server";
import { convexMessage } from "@/lib/convex/error";
import { createCheckout, customerPortalUrl, type Cadence, type Tier } from "@/lib/polar";
import { attachDomain, checkDomain, detachDomain, type DomainState } from "@/lib/vercel-domains";
import { api } from "@/convex/_generated/api";
import { env, siteUrl } from "@/lib/env";
import { activeContext } from "@/lib/data/context";

/* Billing and custom domains. The plan itself is never written here, only
   Polar's webhook does that. These actions start a checkout, open the portal,
   and hold a domain claim while Vercel is asked about its DNS. */

export type BillingResult = { error?: string; url?: string };

export async function startCheckout(cadence: Cadence, tier: Tier = "pro"): Promise<BillingResult> {
  const session = await requireSession();

  if (!env().POLAR_ACCESS_TOKEN) {
    return { error: "Billing is not configured yet." };
  }

  const convex = await convexServer();
  const products = await convex.query(api.platformSettings.productsForCheckout, {});

  try {
    const businessId = cadence === "yearly" ? products.businessYearly : products.businessMonthly;
    const proId = cadence === "yearly" ? products.yearly : products.monthly;

    const checkout = await createCheckout({
      tier,
      cadence,
      productId: tier === "business" ? businessId : proId,
      profileId: session.profile.id,
      email: session.profile.email,
      // The plan is granted by the webhook, not by arriving here, this page
      // just says thank you and reloads it.
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

/* A domain belongs to the workspace in force: a company's own, or the
   profile's in Personal. The company id is read from the cookie on the server
   rather than taken from the caller, and Convex re-checks the membership. */

export async function claimDomain(domain: string): Promise<DomainResult> {
  await requireSession();
  const convex = await convexServer();
  const { companyId } = await activeContext();

  let claimed: string;
  try {
    claimed = companyId
      ? await convex.mutation(api.companyDomains.claim, { id: companyId, domain })
      : await convex.mutation(api.domains.claim, { domain });
  } catch (cause) {
    return { error: convexMessage(cause, "That domain could not be claimed.") };
  }

  const state = await attachDomain(claimed);
  if (state.status === "verified") {
    if (companyId) await convex.mutation(api.companyDomains.markVerified, { id: companyId, domain: claimed, verified: true });
    else await convex.mutation(api.domains.markVerified, { domain: claimed, verified: true });
  }

  revalidatePath("/settings", "layout");
  return { state };
}

/** Asks Vercel again. Pressed after adding the DNS record. */
export async function verifyDomain(domain: string): Promise<DomainResult> {
  await requireSession();
  const convex = await convexServer();
  const { companyId } = await activeContext();

  const state = await checkDomain(domain);
  const verified = state.status === "verified";
  if (companyId) await convex.mutation(api.companyDomains.markVerified, { id: companyId, domain, verified });
  else await convex.mutation(api.domains.markVerified, { domain, verified });

  revalidatePath("/settings", "layout");
  return { state };
}

export async function removeDomain(): Promise<DomainResult> {
  await requireSession();
  const convex = await convexServer();
  const { companyId } = await activeContext();

  if (companyId) {
    /* The company query is the only thing that knows which hostname this was,
       and Vercel has to be told to let it go or the certificate stays. */
    const current = await convex.query(api.companyDomains.get, { id: companyId });
    await convex.mutation(api.companyDomains.release, { id: companyId });
    if (current?.domain) await detachDomain(current.domain);
  } else {
    const had = await convex.mutation(api.domains.release, {});
    if (had) await detachDomain(had);
  }

  revalidatePath("/settings", "layout");
  return {};
}
