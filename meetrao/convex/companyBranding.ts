import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { fail } from "./lib/errors";
import { requireProfile, assertOwnerOrAdmin, AuthError } from "./lib/auth";
import { isPro } from "./lib/plan";
import { normaliseHex, validateBrandColor } from "./lib/brand";
import { ownerOf } from "./companies";
import type { MutationCtx, QueryCtx } from "./_generated/server";

/* ─────────────────────────────────────────────────────────────────────────────
   A company's logo and colours.

   The same rules as convex/branding.ts, with one difference that is the whole
   point of companies: THE OWNER'S PLAN DECIDES, not the caller's. A member of
   a Business company is usually on Free, and the brand on that company's
   domain is paid for by whoever owns it.

   WRITES ARE GATED, AND SO ARE READS, IN DIFFERENT PLACES AND FOR DIFFERENT
   REASONS.

   · Writing is gated here, on the owner's plan.
   · SERVING is gated on the way out, in convex/publicBooking.ts. A company
     whose owner lapses keeps every row, so coming back costs nothing, and its
     pages go back to Meetrao's mark the moment the plan does.

   Gating only the write would mean branding set during a paid month stayed up
   forever after. Gating only the read would let a free account fill the table.
   Both, in both places.

   WHO MAY EDIT: only the owner. A member whose page wears the brand does not
   get to change it, which is the difference between being in somebody's
   company and running one.
   ───────────────────────────────────────────────────────────────────────────── */

/** A booking page is not a gallery. Big enough for a real logo, no bigger. */
const MAX_LOGO_BYTES = 1_000_000;

/* SVG is absent on purpose. An SVG is a document: it can carry <script>, and a
   host-supplied one served from our storage would run on our origin. The
   raster formats cannot. Somebody with only an SVG exports a PNG once. */
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];

async function requireCompanyOwner(ctx: MutationCtx, companyId: string) {
  const me = await requireProfile(ctx);
  const company = await ctx.db
    .query("companies")
    .withIndex("by_uuid", (q) => q.eq("id", companyId))
    .unique();
  if (!company) AuthError("No such company.", "NOT_FOUND");
  assertOwnerOrAdmin(me, company.owner_id);

  /* The OWNER, which may not be the caller when an admin is acting. Reading
     the caller's plan here would let an admin on Free strip a paying
     customer's branding, or a Business admin set it on a Free account. */
  const owner = company.owner_id === me.id ? me : await ownerOf(ctx, company);
  if (!owner) fail("That company has no owner.");
  return { me, company, owner };
}

async function readable(ctx: QueryCtx, companyId: string) {
  const me = await requireProfile(ctx);
  const company = await ctx.db
    .query("companies")
    .withIndex("by_uuid", (q) => q.eq("id", companyId))
    .unique();
  if (!company) return null;

  const rows = await ctx.db
    .query("company_members")
    .withIndex("by_company", (q) => q.eq("company_id", company.id))
    .collect();
  if (!me.is_admin && !rows.some((r) => r.user_id === me.id)) return null;

  return company;
}

export const get = query({
  args: { id: v.string() },
  handler: async (ctx, a) => {
    const company = await readable(ctx, a.id);
    if (!company) return null;

    const owner = await ownerOf(ctx, company);
    return {
      logo_url: company.brand_logo_url ?? null,
      color: company.brand_color ?? null,
      background: company.brand_background ?? null,
      /* So the panel can say "this is live" or "this is saved and will show
         again when the plan is back" rather than showing a lie either way.
         The owner's plan, because that is what serves it. */
      live: owner ? isPro(owner) : false,
    };
  },
});

export const generateUploadUrl = mutation({
  args: { id: v.string() },
  handler: async (ctx, a) => {
    const { owner } = await requireCompanyOwner(ctx, a.id);
    if (!isPro(owner)) fail("A company logo is part of Pro.", "PRO_REQUIRED");
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveLogo = mutation({
  args: { id: v.string(), storageId: v.id("_storage") },
  handler: async (ctx, a) => {
    const { company, owner } = await requireCompanyOwner(ctx, a.id);
    if (!isPro(owner)) fail("A company logo is part of Pro.", "PRO_REQUIRED");

    /* Checked HERE rather than in the browser, because the upload URL goes to
       the browser and anything can post to it. The file is already stored by
       the time this runs, so a refused one is deleted on the way out, not
       left behind to be paid for. */
    const meta = await ctx.db.system.get(a.storageId);
    if (!meta) fail("That upload could not be found.", "NOT_FOUND");

    if (meta.size > MAX_LOGO_BYTES) {
      await ctx.storage.delete(a.storageId);
      fail("That image is over 1 MB. A booking page logo is small, export it smaller.", "TOO_LARGE");
    }
    if (!meta.contentType || !LOGO_TYPES.includes(meta.contentType)) {
      await ctx.storage.delete(a.storageId);
      fail("Use a PNG, JPG or WEBP image.", "BAD_REQUEST");
    }

    const url = await ctx.storage.getUrl(a.storageId);
    if (!url) fail("That upload could not be found.", "NOT_FOUND");

    const previous = company.brand_logo_storage_id ?? null;
    await ctx.db.patch(company._id, {
      brand_logo_url: url,
      brand_logo_storage_id: a.storageId,
      updated_at: Date.now(),
    });
    // After the patch: a delete that runs first and a patch that then fails
    // leaves a row pointing at a file that is gone.
    if (previous && previous !== a.storageId) await ctx.storage.delete(previous);

    return url;
  },
});

export const removeLogo = mutation({
  args: { id: v.string() },
  handler: async (ctx, a) => {
    const { company } = await requireCompanyOwner(ctx, a.id);
    /* No plan check. Taking a logo down is not a paid feature, and an owner
       whose plan has lapsed must still be able to clear what they set. */
    const previous = company.brand_logo_storage_id ?? null;
    await ctx.db.patch(company._id, {
      brand_logo_url: null,
      brand_logo_storage_id: null,
      updated_at: Date.now(),
    });
    if (previous) await ctx.storage.delete(previous);
  },
});

export const setColor = mutation({
  args: { id: v.string(), color: v.string() },
  handler: async (ctx, a) => {
    const { company, owner } = await requireCompanyOwner(ctx, a.id);

    // Empty clears it, and clearing is never gated, see removeLogo.
    if (a.color.trim() === "") {
      await ctx.db.patch(company._id, { brand_color: null, updated_at: Date.now() });
      return null;
    }

    if (!isPro(owner)) fail("Your own colour is part of Pro.", "PRO_REQUIRED");

    const result = validateBrandColor(a.color);
    if ("error" in result) fail(result.error, "BAD_REQUEST");

    await ctx.db.patch(company._id, { brand_color: result.color, updated_at: Date.now() });
    return result.color;
  },
});

/**
 * The page background.
 *
 * Shares validateBrandColor's hex parsing with the accent but not its
 * refusals: the near-whites and the unlabelable mid-tones are all fine as a
 * background (a white page is a page, and a grey one is a grey page). The
 * safety comes from deriving the text drawn on it rather than from
 * restricting the choice.
 */
export const setBackground = mutation({
  args: { id: v.string(), color: v.string() },
  handler: async (ctx, a) => {
    const { company, owner } = await requireCompanyOwner(ctx, a.id);

    if (a.color.trim() === "") {
      await ctx.db.patch(company._id, { brand_background: null, updated_at: Date.now() });
      return null;
    }

    if (!isPro(owner)) fail("Your own background is part of Pro.", "PRO_REQUIRED");

    const color = normaliseHex(a.color);
    if (!color) fail("That is not a colour. Use a hex value like #F2F6FF.", "BAD_REQUEST");

    await ctx.db.patch(company._id, { brand_background: color, updated_at: Date.now() });
    return color;
  },
});
