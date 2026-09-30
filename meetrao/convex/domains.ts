import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { fail } from "./lib/errors";
import { requireProfile } from "./lib/auth";
import { requirePro } from "./lib/plan";

/* ─────────────────────────────────────────────────────────────────────────────
   A host's own domain.

   The row is the routing table: the proxy reads it on every request to an
   unknown hostname, and only a verified row resolves. Verification itself
   happens against Vercel, in src/lib/vercel-domains.ts — this file holds the
   claim and the flag, not the DNS.

   ONE HOST PER DOMAIN, product-wide. Two accounts claiming book.acme.com is
   not a conflict to resolve later: the second claim is refused.
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

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireProfile(ctx);
    return {
      domain: me.custom_domain ?? null,
      verified_at: me.custom_domain_verified_at ? new Date(me.custom_domain_verified_at).toISOString() : null,
    };
  },
});

export const claim = mutation({
  args: { domain: v.string() },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    requirePro(me, "A custom domain");

    const domain = normalise(a.domain);
    if (!looksLikeDomain(domain)) fail("That does not look like a domain.");
    if (domain.endsWith("meetrao.com")) fail("That one is ours.");

    const taken = await ctx.db
      .query("profiles")
      .withIndex("by_custom_domain", (q) => q.eq("custom_domain", domain))
      .unique();
    if (taken && taken.id !== me.id) fail("Another account has claimed that domain.");

    await ctx.db.patch(me._id, {
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
  args: { domain: v.string(), verified: v.boolean() },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    const domain = normalise(a.domain);
    // Only the claimant's own row, so a verification result for one domain
    // cannot be applied to another.
    if ((me.custom_domain ?? "") !== domain) return false;

    await ctx.db.patch(me._id, {
      custom_domain_verified_at: a.verified ? Date.now() : null,
      updated_at: Date.now(),
    });
    return true;
  },
});

export const release = mutation({
  args: {},
  handler: async (ctx) => {
    const me = await requireProfile(ctx);
    const had = me.custom_domain ?? null;
    await ctx.db.patch(me._id, { custom_domain: null, custom_domain_verified_at: null, updated_at: Date.now() });
    return had;
  },
});
