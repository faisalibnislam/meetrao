import { query, mutation } from "./_generated/server";
import { fail } from "./lib/errors";
import { v } from "convex/values";
import { requireProfile, assertOwnerOrAdmin, AuthError } from "./lib/auth";
import { contactOut } from "./lib/serialize";
import { uuid } from "./lib/ids";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Newest first, ties broken by id.
 *
 * The tie-break is not decoration. A host whose contacts were all created by
 * one batch share a created_at to the millisecond, and `order by created_at
 * desc` alone leaves their order up to the storage engine — so the screen
 * reshuffled between backends, and in Postgres could reshuffle between reads.
 * Found by scripts/parity-check.mjs; the Supabase query carries the same
 * tie-break in src/lib/data/contacts.ts.
 */
function byNewestThenId(x: { created_at: number; id: string }, y: { created_at: number; id: string }) {
  return y.created_at - x.created_at || x.id.localeCompare(y.id);
}

export const listOwn = query({
  args: { source: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    let rows = await ctx.db.query("contacts").withIndex("by_user", (q) => q.eq("user_id", me.id)).collect();
    if (a.source) rows = rows.filter((c) => c.source === a.source);
    rows.sort(byNewestThenId);
    return rows.map(contactOut);
  },
});

/**
 * Everything the contacts screen needs, in one round trip.
 *
 * NOTE for anyone comparing with the Supabase version: that one selected from
 * `booking_invitees` with NO user filter and let RLS scope it to the caller's
 * own bookings. There is no RLS here, so the scoping is explicit — invitees are
 * gathered per booking of THIS host. An unscoped read would have returned every
 * invitee in the database.
 */
export const listForScreen = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireProfile(ctx);

    const contacts = await ctx.db.query("contacts").withIndex("by_user", (q) => q.eq("user_id", me.id)).collect();
    contacts.sort(byNewestThenId);

    const bookings = await ctx.db.query("bookings").withIndex("by_host_starts", (q) => q.eq("host_id", me.id)).collect();

    const invitees: Array<{ email: string; booking_id: string }> = [];
    for (const b of bookings) {
      for (const i of await ctx.db.query("booking_invitees").withIndex("by_booking", (q) => q.eq("booking_id", b.id)).collect()) {
        invitees.push({ email: i.email, booking_id: i.booking_id });
      }
    }

    return {
      contacts: contacts.map(contactOut),
      bookings: bookings.map((b) => ({
        id: b.id,
        guest_email: b.guest_email,
        starts_at: new Date(b.starts_at).toISOString(),
        status: b.status,
      })),
      invitees,
    };
  },
});

export const create = mutation({
  args: {
    name: v.optional(v.string()), email: v.string(), phone: v.optional(v.string()),
    company: v.optional(v.string()), notes: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    const email = a.email.trim().toLowerCase();
    if (!EMAIL.test(email)) fail("Enter a valid email.");

    // unique (user_id, email)
    const existing = await ctx.db
      .query("contacts")
      .withIndex("by_user_email", (q) => q.eq("user_id", me.id).eq("email", email))
      .unique();
    if (existing) fail("You already have a contact with that email.");

    const now = Date.now();
    const id = uuid();
    await ctx.db.insert("contacts", {
      id, user_id: me.id, name: (a.name ?? "").trim(), email,
      phone: a.phone ?? "", company: a.company ?? "", notes: a.notes ?? "",
      source: "manual", created_at: now, updated_at: now,
    });
    return contactOut((await ctx.db.query("contacts").withIndex("by_uuid", (q) => q.eq("id", id)).unique())!);
  },
});

export const update = mutation({
  args: {
    id: v.string(), name: v.optional(v.string()), phone: v.optional(v.string()),
    company: v.optional(v.string()), notes: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    const c = await ctx.db.query("contacts").withIndex("by_uuid", (q) => q.eq("id", a.id)).unique();
    if (!c) AuthError("No such contact.", "NOT_FOUND");
    assertOwnerOrAdmin(me, c.user_id);

    const { id: _id, ...rest } = a;
    void _id;
    const patch: Record<string, unknown> = { updated_at: Date.now() };
    for (const [k, val] of Object.entries(rest)) if (val !== undefined) patch[k] = val;
    await ctx.db.patch(c._id, patch);
    return contactOut((await ctx.db.get(c._id))!);
  },
});

/**
 * Save by hand: update when an id is given, otherwise upsert on the identity.
 *
 * Typing an address that already exists means "this person", not "a second row
 * for this person" — the same reasoning as the Supabase upsert on
 * (user_id, email), which has no unique index to lean on here.
 */
export const save = mutation({
  args: {
    id: v.optional(v.string()),
    name: v.string(), email: v.string(), phone: v.string(), company: v.string(), notes: v.string(),
  },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    const email = a.email.trim().toLowerCase();
    if (!EMAIL.test(email)) fail("That is not an email address.");

    const fields = {
      name: a.name.trim(), email, phone: a.phone.trim(),
      company: a.company.trim(), notes: a.notes.trim(),
    };
    const now = Date.now();

    if (a.id) {
      const c = await ctx.db.query("contacts").withIndex("by_uuid", (q) => q.eq("id", a.id!)).unique();
      if (!c) AuthError("No such contact.", "NOT_FOUND");
      assertOwnerOrAdmin(me, c.user_id);
      const clash = await ctx.db
        .query("contacts")
        .withIndex("by_user_email", (q) => q.eq("user_id", c.user_id).eq("email", email))
        .unique();
      if (clash && clash.id !== c.id) fail("You already have a contact with that email.");
      await ctx.db.patch(c._id, { ...fields, updated_at: now });
      return c.id;
    }

    const existing = await ctx.db
      .query("contacts")
      .withIndex("by_user_email", (q) => q.eq("user_id", me.id).eq("email", email))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { ...fields, source: "manual", updated_at: now });
      return existing.id;
    }

    const id = uuid();
    await ctx.db.insert("contacts", { id, user_id: me.id, ...fields, source: "manual", created_at: now, updated_at: now });
    return id;
  },
});

/**
 * One chunk of a CSV import.
 *
 * Chunked by the caller rather than taking the whole file: a Convex mutation is
 * one transaction with bounded reads and writes, and a 2000-row upsert is both
 * a read and a write per row. Splitting keeps each transaction small; the
 * trade-off is that a failure part-way leaves earlier chunks applied, which is
 * the same behaviour a partial Postgres upsert batch would have had.
 */
export const importChunk = mutation({
  args: {
    rows: v.array(v.object({
      name: v.string(), email: v.string(), phone: v.string(), company: v.string(), notes: v.string(),
    })),
  },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    const now = Date.now();
    let added = 0;
    let updated = 0;

    for (const r of a.rows) {
      const email = r.email.trim().toLowerCase();
      if (!EMAIL.test(email)) continue;
      const fields = { name: r.name.trim(), email, phone: r.phone.trim(), company: r.company.trim(), notes: r.notes.trim() };

      const existing = await ctx.db
        .query("contacts")
        .withIndex("by_user_email", (q) => q.eq("user_id", me.id).eq("email", email))
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, { ...fields, source: "import", updated_at: now });
        updated++;
      } else {
        await ctx.db.insert("contacts", { id: uuid(), user_id: me.id, ...fields, source: "import", created_at: now, updated_at: now });
        added++;
      }
    }
    return { added, updated };
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    const c = await ctx.db.query("contacts").withIndex("by_uuid", (q) => q.eq("id", a.id)).unique();
    if (!c) return false;
    assertOwnerOrAdmin(me, c.user_id);
    await ctx.db.delete(c._id);
    return true;
  },
});
