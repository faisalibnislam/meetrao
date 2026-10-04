import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireProfile, AuthError } from "./lib/auth";
import { membersOf, roleIn } from "./companies";

/* ─────────────────────────────────────────────────────────────────────────────
   The rows behind a company's dashboard.

   THIS FILE DOES NO ARITHMETIC. It reads bookings for the people in a company
   and hands them over; every figure is worked out in src/lib/company-analytics.ts,
   which is pure and therefore testable without a database. The split is not
   tidiness: a day bucket has to be built in the viewer's timezone, Intl with
   a named zone is a thing to rely on in Node rather than in the Convex
   runtime, and a UTC bucket would file half a London evening on the wrong day.

   READABLE BY ANY MEMBER. Somebody in a company can already see who else is
   in it and what their links are, and a booking count is a weaker fact than
   the booking list each of them can already read. Keeping this to managers
   would mean the people doing the work cannot see the work.

   SCOPED BY company_id, NOT BY HOST. A member's personal bookings are not
   this company's business, and a company that counted them would tell an
   agency owner about meetings on a domain they have nothing to do with.
   ───────────────────────────────────────────────────────────────────────────── */

/** Longest window the screen offers. A cap, so one query cannot read a year. */
const MAX_DAYS = 90;
const DAY_MS = 86_400_000;
/** How far ahead the chart looks. The screen draws a fortnight. */
const AHEAD_DAYS = 21;

export const forCompany = query({
  args: { id: v.string(), days: v.optional(v.number()) },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    const company = await ctx.db
      .query("companies")
      .withIndex("by_uuid", (q) => q.eq("id", a.id))
      .unique();
    if (!company) AuthError("No such company.", "NOT_FOUND");

    const role = await roleIn(ctx, company, me);
    if (!role) AuthError("No such company.", "NOT_FOUND");

    const days = Math.min(Math.max(Math.round(a.days ?? 30), 1), MAX_DAYS);
    const now = Date.now();
    /* A day either side of the window, because the bucket boundary is in the
       viewer's timezone and this one is in UTC. Trimming happens where the
       timezone is known; reading a day short would silently lose meetings. */
    const from = now - (days + 1) * DAY_MS;
    const to = now + AHEAD_DAYS * DAY_MS;

    const people = await membersOf(ctx, company.id);

    const bookings = [];
    for (const { profile } of people) {
      /* Ranged on the index rather than collected and filtered: a host with
         three years of history would otherwise be read in full every time
         somebody opens this screen. */
      const rows = await ctx.db
        .query("bookings")
        .withIndex("by_host_starts", (q) =>
          q.eq("host_id", profile.id).gte("starts_at", from).lte("starts_at", to),
        )
        .collect();

      for (const b of rows) {
        // The company's meetings, not the person's. See the note above.
        if ((b.company_id ?? null) !== company.id) continue;
        bookings.push({
          host_id: b.host_id,
          starts_at: b.starts_at,
          ends_at: b.ends_at,
          duration_minutes: b.duration_minutes,
          status: b.status,
          cancelled_by: b.cancelled_by,
          meeting_name: b.meeting_name,
          guest_name: b.guest_name,
          guest_email: b.guest_email,
          created_at: b.created_at,
        });
      }
    }

    const members = [];
    for (const { member, profile } of people) {
      const meetings = await ctx.db
        .query("meeting_types")
        .withIndex("by_user", (q) => q.eq("user_id", profile.id))
        .collect();

      members.push({
        user_id: profile.id,
        name: profile.full_name || profile.username,
        handle: member.handle,
        role: member.role,
        /* Switched on AND in this company. A member with meetings that are
           all personal has nothing answering on this domain, which is the
           thing worth saying on the screen. */
        active_links: meetings.filter((m) => m.is_active && (m.company_id ?? null) === company.id).length,
      });
    }

    return { days, now, company_name: company.name, members, bookings };
  },
});
