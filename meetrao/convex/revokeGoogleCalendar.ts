import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

/* ─────────────────────────────────────────────────────────────────────────────
   ONE-OFF: retire the Google Calendar connection (2026-11-27).

   Meetrao no longer connects to Google Calendar (conflicts come from the
   host's calendar feed, invites go out by email). Each stored grant is revoked
   at Google, so it disappears from the host's Google account, and then its row
   is deleted. A revoke Google answers with 400 means the grant is already gone
   (expired or revoked by the host), which is the outcome we want. A network
   failure keeps the row, so running this again retries it.

   Run once, after the deploy that removed the connection:
     npx convex run revokeGoogleCalendar:run            (dev)
     npx convex run revokeGoogleCalendar:run --prod     (production)

   It logs counts only, never a token or an address. Once it reports
   `remaining: 0` on production, this file and the `calendar_connections`
   table in schema.ts can be deleted.
   ───────────────────────────────────────────────────────────────────────────── */

export const pending = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("calendar_connections").take(100);
    return rows.map((r) => ({ id: r._id, token: r.refresh_token ?? r.access_token ?? "" }));
  },
});

export const remove = internalMutation({
  args: { id: v.id("calendar_connections") },
  handler: async (ctx, a) => {
    const row = await ctx.db.get(a.id);
    if (row) await ctx.db.delete(row._id);
  },
});

export const remaining = internalQuery({
  args: {},
  handler: async (ctx) => (await ctx.db.query("calendar_connections").take(1000)).length,
});

async function revoke(token: string): Promise<"revoked" | "already-invalid" | "failed"> {
  if (!token) return "already-invalid";
  try {
    const response = await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }),
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok) return "revoked";
    if (response.status === 400) return "already-invalid";
    return "failed";
  } catch {
    return "failed";
  }
}

type Outcome = { revoked: number; alreadyInvalid: number; failed: number; remaining: number };

export const run = internalAction({
  args: {},
  handler: async (ctx): Promise<Outcome> => {
    const counts = { revoked: 0, alreadyInvalid: 0, failed: 0 };
    const rows: { id: Id<"calendar_connections">; token: string }[] = await ctx.runQuery(
      internal.revokeGoogleCalendar.pending,
      {},
    );
    for (const row of rows) {
      const outcome = await revoke(row.token);
      if (outcome === "failed") {
        counts.failed++;
        continue;
      }
      if (outcome === "revoked") counts.revoked++;
      else counts.alreadyInvalid++;
      await ctx.runMutation(internal.revokeGoogleCalendar.remove, { id: row.id });
    }
    const left: number = await ctx.runQuery(internal.revokeGoogleCalendar.remaining, {});
    console.log("revokeGoogleCalendar", { ...counts, remaining: left });
    return { ...counts, remaining: left };
  },
});
