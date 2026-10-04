import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { fail } from "./lib/errors";
import { requireProfile, assertOwnerOrAdmin, AuthError } from "./lib/auth";
import { uuid } from "./lib/ids";
import { planOf } from "./lib/plan";
import { limitsFor } from "./lib/limits";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

/* ─────────────────────────────────────────────────────────────────────────────
   Companies: a domain, a brand, and the people whose links live on it.

   WHAT DECIDES WHAT. The OWNER's plan decides how many companies may exist
   and how many people each may hold. A member's own plan decides nothing
   here: a free account added to a Business company gets a branded page on
   that domain, paid for by the owner, and its own meetrao.com link stays
   exactly as free as it was.

   That is also why every public read of a company resolves the owner's plan
   rather than the member's, and why nothing is deleted when a plan lapses.
   Rows survive so that returning costs nothing, which is precisely why the
   gate has to be on the way out and not only on the way in.

   MEMBERS MUST ALREADY HAVE AN ACCOUNT, as with teams. An invitation to an
   address that has never signed up would mean a pending state, an expiry, and
   a company page that quietly lists somebody who never arrived.

   THE SLUG IS PRODUCT-WIDE. A company shares a namespace with hosts and teams
   because a guest reads meetrao.com/<anything> as one namespace and so does a
   search engine.
   ───────────────────────────────────────────────────────────────────────────── */

const MAX_NAME = 60;
const MAX_HANDLE = 40;

function normaliseSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

/** Every member of a company, owner first, with the profile behind each. */
export async function membersOf(ctx: QueryCtx | MutationCtx, companyId: string) {
  const rows = await ctx.db
    .query("company_members")
    .withIndex("by_company", (q) => q.eq("company_id", companyId))
    .collect();

  const out: { member: Doc<"company_members">; profile: Doc<"profiles"> }[] = [];
  for (const row of rows) {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_uuid", (q) => q.eq("id", row.user_id))
      .unique();
    // A suspended host is not offered to guests, on a company domain or their own.
    if (!profile || profile.is_suspended) continue;
    out.push({ member: row, profile });
  }

  return out.sort(
    (a, b) =>
      Number(b.member.role === "owner") - Number(a.member.role === "owner") ||
      a.member.created_at - b.member.created_at,
  );
}

/** The owner's profile, which is what every entitlement question resolves to. */
export async function ownerOf(ctx: QueryCtx | MutationCtx, company: Doc<"companies">) {
  return await ctx.db
    .query("profiles")
    .withIndex("by_uuid", (q) => q.eq("id", company.owner_id))
    .unique();
}

async function requireOwner(ctx: MutationCtx, companyId: string) {
  const me = await requireProfile(ctx);
  const company = await ctx.db
    .query("companies")
    .withIndex("by_uuid", (q) => q.eq("id", companyId))
    .unique();
  if (!company) AuthError("No such company.", "NOT_FOUND");
  assertOwnerOrAdmin(me, company.owner_id);
  return { me, company };
}

/** A name nobody else holds: not a host, not a team, not another company. */
async function slugIsFree(ctx: MutationCtx, slug: string, exceptCompanyId?: string): Promise<boolean> {
  const host = await ctx.db
    .query("profiles")
    .withIndex("by_username_lower", (q) => q.eq("username_lower", slug))
    .unique();
  if (host) return false;

  const team = await ctx.db
    .query("teams")
    .withIndex("by_slug_lower", (q) => q.eq("slug_lower", slug))
    .unique();
  if (team) return false;

  const company = await ctx.db
    .query("companies")
    .withIndex("by_slug_lower", (q) => q.eq("slug_lower", slug))
    .unique();
  return !company || company.id === exceptCompanyId;
}

/* ── reading ───────────────────────────────────────────────────────────────── */

/** Companies I own, and the ones I have been added to. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireProfile(ctx);
    const limits = limitsFor(planOf(me));

    const memberships = await ctx.db
      .query("company_members")
      .withIndex("by_user", (q) => q.eq("user_id", me.id))
      .collect();

    const rows = [];
    for (const m of memberships) {
      const company = await ctx.db
        .query("companies")
        .withIndex("by_uuid", (q) => q.eq("id", m.company_id))
        .unique();
      if (!company) continue;

      const owner = await ownerOf(ctx, company);
      const members = await membersOf(ctx, company.id);

      rows.push({
        id: company.id,
        name: company.name,
        slug: company.slug,
        handle: m.handle,
        role: m.role,
        is_owner: company.owner_id === me.id,
        domain: company.custom_domain ?? null,
        domain_verified: Boolean(company.custom_domain_verified_at),
        /* The square mark the workspace menu draws, not the wordmark its
           booking pages wear. Ungated on purpose: this is the company shown
           back to its own people inside the app, not a public page, so the
           plan gate that decides what GUESTS see does not apply. A company
           whose plan lapsed still looks like itself to the people in it. */
        avatar_url: company.brand_avatar_url ?? null,
        brand_color: company.brand_color ?? null,
        member_count: members.length,
        /* The owner's plan, because that is what entitles every page on this
           company's domain. A member looking at this sees what the company
           can do, not what their own account can. */
        owner_plan: owner ? planOf(owner) : "free",
        member_limit: owner ? limitsFor(planOf(owner)).membersPerCompany : 0,
      });
    }

    const owned = rows.filter((r) => r.is_owner).length;
    return {
      companies: rows.sort((a, b) => Number(b.is_owner) - Number(a.is_owner) || a.name.localeCompare(b.name)),
      owned,
      company_limit: limits.companies,
      can_create: owned < limits.companies,
      plan: planOf(me),
    };
  },
});

/**
 * One company's people.
 *
 * Separate from `mine` so that query stays cheap for somebody in ten
 * companies: the settings panel only ever shows the people of the company it
 * is looking at.
 *
 * Readable by any MEMBER, not only the owner. Somebody added to a company can
 * see who else is in it, which is the same thing their own page on the domain
 * tells a guest anyway.
 */
export const members = query({
  args: { id: v.string() },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    const company = await ctx.db
      .query("companies")
      .withIndex("by_uuid", (q) => q.eq("id", a.id))
      .unique();
    if (!company) return [];

    const rows = await membersOf(ctx, company.id);
    if (!me.is_admin && !rows.some((r) => r.profile.id === me.id)) {
      AuthError("That company is not yours.", "NOT_FOUND");
    }

    return rows.map(({ member, profile }) => ({
      user_id: profile.id,
      name: profile.full_name || profile.username,
      email: profile.email,
      handle: member.handle,
      role: member.role,
    }));
  },
});

/* ── writing ───────────────────────────────────────────────────────────────── */

export const create = mutation({
  args: { name: v.string(), slug: v.string() },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    const limits = limitsFor(planOf(me));

    /* The cap IS the gate. Free's limit is zero, so a free account is refused
       here without a separate plan check, and the message says the number
       rather than naming a plan, because the number is what changed. */
    if (limits.companies < 1) fail("Companies are part of Pro.", "PRO_REQUIRED");

    const owned = await ctx.db
      .query("companies")
      .withIndex("by_owner", (q) => q.eq("owner_id", me.id))
      .collect();
    if (owned.length >= limits.companies) {
      fail(
        limits.companies === 1
          ? "Pro covers one company. Business covers ten."
          : `Your plan covers ${limits.companies} companies.`,
        "LIMIT_REACHED",
      );
    }

    const name = a.name.trim();
    if (!name) fail("Give the company a name.");
    if (name.length > MAX_NAME) fail(`Keep the name under ${MAX_NAME} characters.`);

    const slug = normaliseSlug(a.slug || name);
    if (slug.length < 3) fail("That link is too short.");
    if (!(await slugIsFree(ctx, slug))) fail("That name is taken.");

    const id = uuid();
    const now = Date.now();
    await ctx.db.insert("companies", {
      id,
      owner_id: me.id,
      name,
      slug,
      slug_lower: slug,
      custom_domain: null,
      custom_domain_verified_at: null,
      brand_color: null,
      brand_background: null,
      brand_logo_url: null,
      brand_logo_storage_id: null,
      created_at: now,
      updated_at: now,
    });

    /* The owner is a member, not a special case beside the list. Everything
       that renders a company iterates members, and an owner who is not one
       would be absent from their own domain. */
    await ctx.db.insert("company_members", {
      id: uuid(),
      company_id: id,
      user_id: me.id,
      role: "owner",
      handle: me.username,
      handle_lower: me.username.toLowerCase(),
      created_at: now,
    });

    return { id, slug };
  },
});

export const rename = mutation({
  args: { id: v.string(), name: v.string(), slug: v.string() },
  handler: async (ctx, a) => {
    const { company } = await requireOwner(ctx, a.id);

    const name = a.name.trim();
    if (!name) fail("Give the company a name.");
    if (name.length > MAX_NAME) fail(`Keep the name under ${MAX_NAME} characters.`);

    const slug = normaliseSlug(a.slug || name);
    if (slug.length < 3) fail("That link is too short.");
    if (!(await slugIsFree(ctx, slug, company.id))) fail("That name is taken.");

    await ctx.db.patch(company._id, { name, slug, slug_lower: slug, updated_at: Date.now() });
    return true;
  },
});

export const addMember = mutation({
  args: { id: v.string(), email: v.string(), handle: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const { me, company } = await requireOwner(ctx, a.id);

    /* The OWNER's plan decides, not the caller's. An admin acting on somebody
       else's company must not be able to exceed what that owner pays for. */
    const owner = company.owner_id === me.id ? me : await ownerOf(ctx, company);
    if (!owner) fail("That company has no owner.");
    const limit = limitsFor(planOf(owner)).membersPerCompany;

    if (limit <= 1) {
      fail("Adding people to a company is part of Business.", "BUSINESS_REQUIRED");
    }

    const email = a.email.trim().toLowerCase();
    const profile = await ctx.db.query("profiles").withIndex("by_email", (q) => q.eq("email", email)).unique();
    // Loud, rather than a pending invitation that silently never arrives.
    if (!profile) fail("Nobody with that address has a Meetrao account yet.");
    if (profile.is_suspended) fail("That account is suspended.");

    const existing = await ctx.db
      .query("company_members")
      .withIndex("by_company", (q) => q.eq("company_id", company.id))
      .collect();
    if (existing.some((m) => m.user_id === profile.id)) fail("They are already in this company.");
    if (existing.length >= limit) fail(`A company can hold ${limit} people.`);

    const handle = normaliseSlug(a.handle || profile.username);
    if (!handle) fail("Give them a handle for this company.");
    if (handle.length > MAX_HANDLE) fail(`Keep the handle under ${MAX_HANDLE} characters.`);
    if (existing.some((m) => m.handle_lower === handle)) fail("That handle is taken in this company.");

    await ctx.db.insert("company_members", {
      id: uuid(),
      company_id: company.id,
      user_id: profile.id,
      role: "member",
      handle,
      handle_lower: handle,
      created_at: Date.now(),
    });

    return { userId: profile.id, name: profile.full_name || profile.username, handle };
  },
});

export const setHandle = mutation({
  args: { id: v.string(), userId: v.string(), handle: v.string() },
  handler: async (ctx, a) => {
    const { company } = await requireOwner(ctx, a.id);

    const rows = await ctx.db
      .query("company_members")
      .withIndex("by_company", (q) => q.eq("company_id", company.id))
      .collect();
    const row = rows.find((m) => m.user_id === a.userId);
    if (!row) fail("They are not in this company.");

    const handle = normaliseSlug(a.handle);
    if (!handle) fail("A handle cannot be empty.");
    if (handle.length > MAX_HANDLE) fail(`Keep the handle under ${MAX_HANDLE} characters.`);
    if (rows.some((m) => m.handle_lower === handle && m.user_id !== a.userId)) {
      fail("That handle is taken in this company.");
    }

    await ctx.db.patch(row._id, { handle, handle_lower: handle });
    return true;
  },
});

export const removeMember = mutation({
  args: { id: v.string(), userId: v.string() },
  handler: async (ctx, a) => {
    const { company } = await requireOwner(ctx, a.id);

    const rows = await ctx.db
      .query("company_members")
      .withIndex("by_company", (q) => q.eq("company_id", company.id))
      .collect();
    const row = rows.find((m) => m.user_id === a.userId);
    if (!row) return false;

    /* The owner is the one member who cannot leave. A company with a domain
       and nobody on it would keep answering and show no one. */
    if (row.role === "owner") fail("The owner cannot be removed. Delete the company instead.");

    await ctx.db.delete(row._id);
    return true;
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, a) => {
    const { company } = await requireOwner(ctx, a.id);

    for (const row of await ctx.db
      .query("company_members")
      .withIndex("by_company", (q) => q.eq("company_id", company.id))
      .collect()) {
      await ctx.db.delete(row._id);
    }
    await ctx.db.delete(company._id);
    return true;
  },
});
