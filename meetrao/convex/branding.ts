import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { fail } from "./lib/errors";
import { requireProfile } from "./lib/auth";
import { isPro, requirePro } from "./lib/plan";
import { normaliseHex, validateBrandColor } from "./lib/brand";

/* ─────────────────────────────────────────────────────────────────────────────
   A host's own logo and colour on their booking page.

   WRITES ARE GATED, AND SO ARE READS, IN DIFFERENT PLACES AND FOR DIFFERENT
   REASONS.

   · Writing is gated here, with requirePro: a free host cannot set branding.
   · SERVING is gated in convex/publicBooking.ts, on the way out. A host whose
     subscription lapses keeps the rows, so coming back costs them nothing,
     but their pages go back to Meetrao's mark the moment the plan does.

   Gating only the write would mean branding set during a paid month stayed up
   forever after. Gating only the read would let a free host fill the table.
   Both, in both places.
   ───────────────────────────────────────────────────────────────────────────── */

/** A booking page is not a gallery. Big enough for a real logo, no bigger. */
const MAX_LOGO_BYTES = 1_000_000;

/* SVG is absent on purpose. An SVG is a document: it can carry <script>, and a
   host-supplied one served from our storage would run on our origin. The
   raster formats cannot. A host with only an SVG exports a PNG once. */
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireProfile(ctx);
    return {
      logo_url: me.brand_logo_url ?? null,
      color: me.brand_color ?? null,
      background: me.brand_bg ?? null,
      /* So the panel can say "this is live" or "this is saved and will show
         again when you are on Pro" rather than showing a lie either way. */
      live: isPro(me),
    };
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const me = await requireProfile(ctx);
    requirePro(me, "Your own logo");
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveLogo = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    requirePro(me, "Your own logo");

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

    const previous = me.brand_logo_storage_id ?? null;
    await ctx.db.patch(me._id, {
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
  args: {},
  handler: async (ctx) => {
    const me = await requireProfile(ctx);
    /* No requirePro. Taking your own logo down is not a paid feature, and a
       host whose plan has lapsed must still be able to clear what they set. */
    const previous = me.brand_logo_storage_id ?? null;
    await ctx.db.patch(me._id, {
      brand_logo_url: null,
      brand_logo_storage_id: null,
      updated_at: Date.now(),
    });
    if (previous) await ctx.storage.delete(previous);
  },
});

/**
 * The page background.
 *
 * Shares validateBrandColor with the accent, which refuses the near-whites and
 * the unlabelable mid-tones. BOTH of those are fine as a background (a white
 * page is a page, and a grey one is a grey page) so only the "is it a colour"
 * half applies here, and the rest of the safety comes from deriving the text
 * drawn on it rather than from restricting the choice.
 */
export const setBackground = mutation({
  args: { color: v.string() },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);

    // Empty clears it, and clearing is never gated, see removeLogo.
    if (a.color.trim() === "") {
      await ctx.db.patch(me._id, { brand_bg: null, updated_at: Date.now() });
      return null;
    }

    requirePro(me, "Your own background");

    const color = normaliseHex(a.color);
    if (!color) fail("That is not a colour. Use a hex value like #F2F6FF.", "BAD_REQUEST");

    await ctx.db.patch(me._id, { brand_bg: color, updated_at: Date.now() });
    return color;
  },
});

export const setColor = mutation({
  args: { color: v.string() },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);

    // Empty clears it, and clearing is never gated, see removeLogo.
    if (a.color.trim() === "") {
      await ctx.db.patch(me._id, { brand_color: null, updated_at: Date.now() });
      return null;
    }

    requirePro(me, "Your own colour");

    const result = validateBrandColor(a.color);
    if ("error" in result) fail(result.error, "BAD_REQUEST");

    await ctx.db.patch(me._id, { brand_color: result.color, updated_at: Date.now() });
    return result.color;
  },
});
