import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { fail } from "./lib/errors";
import { requireProfile, AuthError } from "./lib/auth";
import { isPro } from "./lib/plan";
import { ownerOf, roleIn } from "./companies";
import type { MutationCtx } from "./_generated/server";

/* ─────────────────────────────────────────────────────────────────────────────
   A company's own domain.

   The row is the routing table: the proxy reads it on every request to an
   unknown hostname, and only a verified row resolves. Verification happens
   against Vercel, in src/lib/vercel-domains.ts. This file holds the claim and
   the flag, not the DNS.

   ONE HOLDER PER DOMAIN, PRODUCT-WIDE, and that now spans two tables. Until
   the migration has run, a hostname may be held by a profile (the old
   per-host domain) or by a company, and a claim has to be refused if EITHER
   holds it. Checking only companies would let a new claim shadow a live
   customer's domain, which is the one failure here that takes somebody's
   booking page down rather than merely refusing them.

   THE OWNER'S PLAN DECIDES, not the caller's, exactly as with branding.
   ───────────────────────────────────────────────────────────────────────────── */

/** A hostname, lowercased, with no scheme, port, path or trailing dot. */
function normalise(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .replace(/\.$/, "");
}

function looksLikeDomain(value: string): boolean {
  // At least one dot, no spaces, and nothing that is obviously a path.
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(value);
}

/**
 * Owner or admin of this company, plus the owner's profile.
 *
 * TWO DIFFERENT PEOPLE, and keeping them apart is the whole point of this
 * helper. WHO may act is the caller's role here: an admin was given the
 * company's face to look after, which is this file. WHAT they may set is the
 * OWNER's plan, because the owner is who pays. Reading the caller's plan
 * would let an admin on Free strip a paying customer's branding, or a
 * Business admin set branding on a Free account's company.
 */
async function requireCompanyManager(ctx: MutationCtx, companyId: string) {
  const me = await requireProfile(ctx);
  const company = await ctx.db
    .query("companies")
    .withIndex("by_uuid", (q) => q.eq("id", companyId))
    .unique();
  if (!company) AuthError("No such company.", "NOT_FOUND");

  const role = await roleIn(ctx, company, me);
  /* NOT_FOUND, not a refusal: somebody outside this company should not learn
     from the error that it exists. */
  if (!role) AuthError("No such company.", "NOT_FOUND");
  if (role === "member") fail("Only an owner or admin of this company can do that.", "FORBIDDEN");

  const owner = company.owner_id === me.id ? me : await ownerOf(ctx, company);
  if (!owner) fail("That company has no owner.");
  return { me, company, owner };
}

/** Whether anybody other than this company already holds the hostname. */
async function heldByAnotherHolder(
  ctx: MutationCtx,
  domain: string,
  companyId: string,
): Promise<boolean> {
  const byProfile = await ctx.db
    .query("profiles")
    .withIndex("by_custom_domain", (q) => q.eq("custom_domain", domain))
    .unique();
  if (byProfile) return true;

  const byCompany = await ctx.db
    .query("companies")
    .withIndex("by_custom_domain", (q) => q.eq("custom_domain", domain))
    .unique();
  return Boolean(byCompany && byCompany.id !== companyId);
}

export const get = query({
  args: { id: v.string() },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    const company = await ctx.db
      .query("companies")
      .withIndex("by_uuid", (q) => q.eq("id", a.id))
      .unique();
    if (!company) return null;

    const rows = await ctx.db
      .query("company_members")
      .withIndex("by_company", (q) => q.eq("company_id", company.id))
      .collect();
    if (!me.is_admin && !rows.some((r) => r.user_id === me.id)) return null;

    return {
      domain: company.custom_domain ?? null,
      verified_at: company.custom_domain_verified_at
        ? new Date(company.custom_domain_verified_at).toISOString()
        : null,
    };
  },
});

export const claim = mutation({
  args: { id: v.string(), domain: v.string() },
  handler: async (ctx, a) => {
    const { company, owner } = await requireCompanyManager(ctx, a.id);
    if (!isPro(owner)) fail("A custom domain is part of Pro.", "PRO_REQUIRED");

    const domain = normalise(a.domain);
    if (!looksLikeDomain(domain)) fail("That does not look like a domain.");
    if (domain.endsWith("meetrao.com")) fail("That one is ours.");

    if (await heldByAnotherHolder(ctx, domain, company.id)) {
      fail("Another account has claimed that domain.");
    }

    await ctx.db.patch(company._id, {
      custom_domain: domain,
      // Claiming is not proving. The flag is set by `markVerified`, after
      // Vercel says it can see the DNS record.
      custom_domain_verified_at: null,
      updated_at: Date.now(),
    });
    return domain;
  },
});

export const markVerified = mutation({
  args: { id: v.string(), domain: v.string(), verified: v.boolean() },
  handler: async (ctx, a) => {
    const { company } = await requireCompanyManager(ctx, a.id);

    /* Only for the domain this company currently claims. Without this, a
       verification result for a hostname somebody has since changed would
       flip the flag on whatever is there now. */
    if (company.custom_domain !== normalise(a.domain)) return false;

    await ctx.db.patch(company._id, {
      custom_domain_verified_at: a.verified ? Date.now() : null,
      updated_at: Date.now(),
    });
    return true;
  },
});

export const release = mutation({
  args: { id: v.string() },
  handler: async (ctx, a) => {
    const { company } = await requireCompanyManager(ctx, a.id);
    /* No plan check. Releasing a domain is not a paid feature, and an owner
       whose plan has lapsed must still be able to take their own name back. */
    await ctx.db.patch(company._id, {
      custom_domain: null,
      custom_domain_verified_at: null,
      updated_at: Date.now(),
    });
    return true;
  },
});
