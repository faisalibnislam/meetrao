import { mutation, internalAction, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireProfile } from "./lib/auth";
import { fail } from "./lib/errors";
import { internal } from "./_generated/api";

/* ─────────────────────────────────────────────────────────────────────────────
   Avatars.

   Supabase used a PUBLIC bucket with a storage policy requiring the first path
   segment to be the uploader's own id — the client uploaded directly, and the
   policy was the guard. Convex has no path-based policies, so the shape
   changes: the client cannot choose a path at all. It asks for a one-time
   upload URL (which requires a session), posts the bytes, and hands back an
   opaque storage id. There is no path to forge.

   The URL Convex returns is public and unguessable, which is what the public
   bucket was.
   ───────────────────────────────────────────────────────────────────────────── */

/** A short-lived, single-use URL the browser posts the image to. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireProfile(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Records a freshly uploaded avatar and removes the one it replaces.
 *
 * A host who re-crops four times should not leave four files behind.
 */
export const save = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);

    const url = await ctx.storage.getUrl(a.storageId);
    if (!url) fail("That upload could not be found.", "NOT_FOUND");

    const previous = me.avatar_storage_id ?? null;
    await ctx.db.patch(me._id, { avatar_url: url, avatar_storage_id: a.storageId, updated_at: Date.now() });

    // After the patch, so a failed delete cannot lose the new photo.
    if (previous && previous !== a.storageId) await ctx.storage.delete(previous);
    return url;
  },
});

/** Back to initials, and the stored file goes with it. */
export const clear = mutation({
  args: {},
  handler: async (ctx) => {
    const me = await requireProfile(ctx);
    const previous = me.avatar_storage_id ?? null;
    await ctx.db.patch(me._id, { avatar_url: null, avatar_storage_id: null, updated_at: Date.now() });
    if (previous) await ctx.storage.delete(previous);
    return null;
  },
});

/* ── One-time migration of the objects already in the Supabase bucket ────────
   An action, because it fetches over the network, which a mutation cannot. */

export const importFromUrl = internalAction({
  args: { userId: v.string(), url: v.string() },
  handler: async (ctx, a): Promise<string | null> => {
    const response = await fetch(a.url);
    if (!response.ok) return null;
    const blob = await response.blob();
    const storageId = await ctx.storage.store(blob);
    return await ctx.runMutation(internal.avatars.attachImported, { userId: a.userId, storageId });
  },
});

export const attachImported = internalMutation({
  args: { userId: v.string(), storageId: v.id("_storage") },
  handler: async (ctx, a) => {
    const p = await ctx.db.query("profiles").withIndex("by_uuid", (q) => q.eq("id", a.userId)).unique();
    if (!p) return null;
    const url = await ctx.storage.getUrl(a.storageId);
    await ctx.db.patch(p._id, { avatar_url: url, avatar_storage_id: a.storageId, updated_at: Date.now() });
    return url;
  },
});

/** Which profiles still point at a Supabase Storage URL. */
export const pendingImports = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("profiles").collect();
    return rows
      .filter((p) => p.avatar_url && p.avatar_url.includes("/storage/v1/object/") && !p.avatar_storage_id)
      .map((p) => ({ userId: p.id, url: p.avatar_url as string }));
  },
});
