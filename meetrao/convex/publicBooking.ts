import { query, mutation, internalQuery } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { fail } from "./lib/errors";
import { v } from "convex/values";
import { bookingOut } from "./lib/serialize";
import { uuid } from "./lib/ids";
import { findOverlap, insertBooking, moveBooking } from "./bookings";
import { overridesForMeeting, rulesForMeeting } from "./availability";
import { membersOf } from "./teams";
import { isPro, planOf } from "./lib/plan";
import type { Doc } from "./_generated/dataModel";
import { zonedDateKey, zonedWeekdayMinute } from "./lib/zoned";
import { notifyBookingCancelled, logActivity } from "./lib/effects";
import { consume } from "./lib/rateLimit";

/* ─────────────────────────────────────────────────────────────────────────────
   The guest path. Every function here is reachable with NO session, exactly
   as the `anon` grants made the SQL RPCs reachable.

   Two things follow, and both were true in Postgres too:

   · These functions must never return anything a guest should not see. The
     host projection below is deliberately narrow. It is not `profileOut`,
     because a profile carries an email, notification preferences and admin
     flags. `get_public_host` had the same shape for the same reason.

   · create_booking re-validates EVERYTHING. The slot engine in
     src/lib/booking/slots.ts already filtered the times on the way in, but
     anyone can call this directly, so notice, window, availability and overlap
     are all checked again here. Migration 0005 exists because that check was
     once missing and a Sunday 10:00 booking was accepted for a weekday host.
   ───────────────────────────────────────────────────────────────────────────── */

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

/**
 * The host's own logo and colour, or null for Meetrao's.
 *
 * GATED ON THE WAY OUT, not only where it is set. Branding is written behind
 * requirePro in convex/branding.ts, and the rows survive a lapsed plan on
 * purpose, so coming back costs the host nothing. This is what stops those
 * surviving rows from being a paid feature somebody keeps for free: the moment
 * `planOf` stops saying pro, every public page falls back to our mark.
 *
 * Returned as one nullable object rather than two loose fields so a caller
 * cannot accidentally render half of it.
 */
function publicBrand(
  p: Doc<"profiles">,
): { logo_url: string | null; logo_hidden: boolean; color: string | null; background: string | null } | null {
  if (!isPro(p)) return null;
  const logo = p.brand_logo_url ?? null;
  const color = p.brand_color ?? null;
  const background = p.brand_bg ?? null;
  /* `hidden` counts as having a brand. Without it here, somebody who only
     turned the mark off and set no colours would get a null brand and their
     page would quietly show ours again. */
  const hidden = p.brand_logo_hidden ?? false;
  return logo || color || background || hidden
    ? { logo_url: logo, logo_hidden: hidden, color, background }
    : null;
}

export const getHost = query({
  args: { username: v.string() },
  handler: async (ctx, a) => {
    const p = await ctx.db
      .query("profiles")
      .withIndex("by_username_lower", (q) => q.eq("username_lower", a.username.trim().toLowerCase()))
      .unique();
    if (!p) return null;
    // Narrow on purpose. See the note above.
    return {
      id: p.id,
      username: p.username,
      full_name: p.full_name,
      job_title: p.job_title,
      avatar_url: p.avatar_url,
      timezone: p.timezone,
      is_suspended: p.is_suspended,
      /* Whether the "Powered by Meetrao" badge is shown. A boolean, not the
         plan: a guest has no use for knowing which tier somebody is on. */
      unbranded: isPro(p),
      brand: publicBrand(p),
    };
  },
});

export const getMeetingTypes = query({
  args: { username: v.string() },
  handler: async (ctx, a) => {
    const p = await ctx.db
      .query("profiles")
      .withIndex("by_username_lower", (q) => q.eq("username_lower", a.username.trim().toLowerCase()))
      .unique();
    if (!p || p.is_suspended) return [];
    const rows = await ctx.db.query("meeting_types").withIndex("by_user", (q) => q.eq("user_id", p.id)).collect();
    return rows
      .filter((m) => m.is_active)
      .sort((x, y) => x.created_at - y.created_at)
      .map((m) => ({
        id: m.id, name: m.name, description: m.description, slug: m.slug,
        duration_minutes: m.duration_minutes, location: m.location,
      }));
  },
});

/**
 * Whether a meeting may be served on a given company's domain.
 *
 * A meeting is always reachable at meetrao.com/<username>/<slug>, whichever
 * company it belongs to. A COMPANY's domain serves only its own, so being
 * added to somebody's company never puts your personal meetings on their
 * branded pages, and a guest who guesses a slug gets nothing.
 */
export const meetingIsOnCompany = query({
  args: { username: v.string(), slug: v.string(), companySlug: v.string() },
  handler: async (ctx, a) => {
    const host = await ctx.db
      .query("profiles")
      .withIndex("by_username_lower", (q) => q.eq("username_lower", a.username.trim().toLowerCase()))
      .unique();
    if (!host || host.is_suspended) return false;

    const meeting = await ctx.db
      .query("meeting_types")
      .withIndex("by_user_slug", (q) => q.eq("user_id", host.id).eq("slug", a.slug.trim().toLowerCase()))
      .unique();
    if (!meeting || !meeting.is_active) return false;
    if (!meeting.company_id) return false;

    const company = await ctx.db
      .query("companies")
      .withIndex("by_uuid", (q) => q.eq("id", meeting.company_id as string))
      .unique();
    return Boolean(company && company.slug === a.companySlug);
  },
});

/** public.get_meeting_availability, the rules a booking page renders from. */
export const getMeetingAvailability = query({
  args: { username: v.string(), slug: v.string() },
  handler: async (ctx, a) => {
    const host = await ctx.db
      .query("profiles")
      .withIndex("by_username_lower", (q) => q.eq("username_lower", a.username.trim().toLowerCase()))
      .unique();
    if (!host || host.is_suspended) return null;

    const meeting = await ctx.db
      .query("meeting_types")
      .withIndex("by_user_slug", (q) => q.eq("user_id", host.id).eq("slug", a.slug.trim().toLowerCase()))
      .unique();
    if (!meeting || !meeting.is_active) return null;

    const rules = await rulesForMeeting(ctx, host.id, meeting.schedule_id);
    return {
      host: {
        id: host.id, username: host.username, full_name: host.full_name, job_title: host.job_title,
        avatar_url: host.avatar_url, timezone: host.timezone,
        /* Whether the badge is shown. A boolean, not the plan: a guest has no
           use for knowing which tier somebody is on. */
        unbranded: isPro(host),
        brand: publicBrand(host),
      },
      meeting: {
        id: meeting.id, name: meeting.name, description: meeting.description, slug: meeting.slug,
        duration_minutes: meeting.duration_minutes, buffer_minutes: meeting.buffer_minutes,
        minimum_notice_minutes: meeting.minimum_notice_minutes, booking_window_days: meeting.booking_window_days,
        location: meeting.location,
        location_detail: meeting.location_detail ?? "",
        capacity: meeting.capacity ?? 1,
        /* The booking form has to know what to ask. Labels only. A question
           is written to be read by the guest it is put to. */
        questions: meeting.questions ?? [],
      },
      rules: rules.map((r) => ({ weekday: r.weekday, start_minute: r.start_minute, end_minute: r.end_minute })),
    };
  },
});

/** The hours behind ONE meeting, by its id. A meeting's own schedule, or the
 *  host's default when it has none. Only hours; a schedule's name is the
 *  host's private note to themselves. */
export const availabilityForMeeting = query({
  args: { meetingId: v.string() },
  handler: async (ctx, a) => {
    const meeting = await ctx.db.query("meeting_types").withIndex("by_uuid", (q) => q.eq("id", a.meetingId)).unique();
    if (!meeting || !meeting.is_active) return [];
    const rules = await rulesForMeeting(ctx, meeting.user_id, meeting.schedule_id);
    return rules.map((r) => ({ weekday: r.weekday, start_minute: r.start_minute, end_minute: r.end_minute }));
  },
});

/**
 * The days that do not follow the weekly pattern. The host's time off, and
 * any day they have given different hours.
 *
 * Public, and it says only that a date is closed or carries these hours. The
 * note beside it on the host's own screen ("Eid", "school run") is theirs and
 * does not come back here.
 */
export const overridesForMeetingPublic = query({
  args: { meetingId: v.string() },
  handler: async (ctx, a) => {
    const meeting = await ctx.db.query("meeting_types").withIndex("by_uuid", (q) => q.eq("id", a.meetingId)).unique();
    if (!meeting || !meeting.is_active) return [];
    const host = await ctx.db.query("profiles").withIndex("by_uuid", (q) => q.eq("id", meeting.user_id)).unique();
    const from = zonedDateKey(Date.now() - DAY, host?.timezone ?? "UTC");
    const rows = await overridesForMeeting(ctx, meeting.user_id, meeting.schedule_id, from);
    return rows.map((o) => ({ date: o.date, ranges: o.ranges }));
  },
});

/**
 * Busy blocks for a host, for the booking page.
 *
 * ── A deliberate, bounded widening, and worth understanding ─────────────────
 * `get_busy_intervals` was revoked from anon and authenticated in migration
 * 0003 precisely because it returned ANY host's occupied blocks over an
 * ARBITRARY window to anyone holding the publishable key. The internal version
 * below preserves that. But the booking page has no session, and a Convex
 * internalQuery cannot be reached from the app's server code without shipping
 * an admin key into the app, which would be worse than the problem.
 *
 * So this is public, and the teeth from 0003 are kept as constraints instead:
 *   · the host must exist and not be suspended
 *   · the window is clamped, and capped at 90 days of span
 *   · only start/end are returned, never a guest name, email or meeting
 *
 * What it discloses is therefore what the booking page already discloses by
 * showing which slots are gone. The stricter alternative is to move slot
 * computation itself into Convex so intervals never leave; that is the right
 * end state and is noted in docs/convex-migration-status.md.
 */
export const busyForHost = query({
  args: { hostId: v.string(), from: v.number(), to: v.number() },
  handler: async (ctx, a) => {
    const host = await ctx.db.query("profiles").withIndex("by_uuid", (q) => q.eq("id", a.hostId)).unique();
    if (!host || host.is_suspended) return [];

    const now = Date.now();
    const from = Math.max(a.from, now - DAY);
    const to = Math.min(a.to, now + 365 * DAY, from + 90 * DAY);
    if (to <= from) return [];

    const rows = await ctx.db
      .query("bookings")
      .withIndex("by_host_starts", (q) => q.eq("host_id", a.hostId).gte("starts_at", from - DAY).lte("starts_at", to))
      .collect();

    return rows
      .filter((b) => b.status === "confirmed" && b.ends_at > from && b.starts_at < to)
      /* The meeting id travels with each interval so a group meeting's own
         seats can be told apart from a clash. It is an id a guest could read
         off their own booking page anyway, and it says nothing about who. */
      .map((b) => ({
        starts_at: new Date(b.starts_at).toISOString(),
        ends_at: new Date(b.ends_at).toISOString(),
        meeting_type_id: b.meeting_type_id,
      }));
  },
});

/**
 * public.get_busy_intervals.
 *
 * Migration 0003 revoked this from anon and authenticated after it was found
 * callable by anyone with the publishable key: it returns a host's occupied
 * blocks over an arbitrary window. internalQuery is the equivalent. It cannot
 * be called from a client at all, only by server code.
 */
export const getBusyIntervals = internalQuery({
  args: { hostId: v.string(), from: v.number(), to: v.number() },
  handler: async (ctx, a) => {
    const rows = await ctx.db
      .query("bookings")
      .withIndex("by_host_starts", (q) => q.eq("host_id", a.hostId).gte("starts_at", a.from - DAY).lte("starts_at", a.to))
      .collect();
    return rows
      .filter((b) => b.status === "confirmed" && b.ends_at > a.from && b.starts_at < a.to)
      .map((b) => ({ start: b.starts_at, end: b.ends_at }));
  },
});

export const recordPageView = mutation({
  args: { hostId: v.string(), meetingTypeId: v.union(v.string(), v.null()) },
  handler: async (ctx, a) => {
    const id = uuid();
    await ctx.db.insert("booking_page_views", {
      id, host_id: a.hostId, meeting_type_id: a.meetingTypeId, opened_at: Date.now(),
    });
    return id;
  },
});

/**
 * A team's public face: who is in the rotation, and what they offer.
 *
 * Narrow in the same way `getHost` is. A name and a timezone per member, so
 * the page can say "one of three" and compute their hours. No emails, no
 * flags, nothing a guest has no use for.
 */
export const getTeam = query({
  args: { slug: v.string() },
  handler: async (ctx, a) => {
    const team = await ctx.db
      .query("teams")
      .withIndex("by_slug_lower", (q) => q.eq("slug_lower", a.slug.trim().toLowerCase()))
      .unique();
    if (!team) return null;

    const members = await membersOf(ctx, team.id);
    if (members.length === 0) return null;

    const meetings = (
      await ctx.db.query("meeting_types").withIndex("by_user", (q) => q.eq("user_id", team.owner_id)).collect()
    ).filter((m) => m.team_id === team.id && m.is_active);

    return {
      id: team.id,
      name: team.name,
      slug: team.slug,
      members: members.map(({ profile }) => ({
        id: profile.id,
        name: profile.full_name || profile.username,
        timezone: profile.timezone,
        avatar_url: profile.avatar_url,
      })),
      meetings: meetings.map((m) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        slug: m.slug,
        duration_minutes: m.duration_minutes,
        buffer_minutes: m.buffer_minutes,
        minimum_notice_minutes: m.minimum_notice_minutes,
        booking_window_days: m.booking_window_days,
        location: m.location,
        location_detail: m.location_detail ?? "",
        capacity: m.capacity ?? 1,
        questions: m.questions ?? [],
        schedule_id: m.schedule_id,
      })),
    };
  },
});

/**
 * Which host a custom domain belongs to.
 *
 * Called by the proxy on every request to a hostname it does not recognise,
 * so it is deliberately the narrowest query in the file: one indexed read,
 * one field back. Only a VERIFIED domain resolves. An unverified one is a
 * claim, and serving somebody's booking page on an unproven name is how a
 * domain gets pointed somewhere it should not be.
 */
/**
 * Who answers a hostname, for the proxy.
 *
 * Two kinds of answer, because a hostname may be held by a company or, until
 * the profile columns are dropped, by a profile. A company answers with its
 * people, so the proxy can turn `meet.acme.com/sarah/intro` into the path for
 * whoever `sarah` is INSIDE THAT COMPANY, and refuse anything that is not one
 * of its handles.
 *
 * That refusal is the whole security property. Without it,
 * `meet.acme.com/<any-meetrao-username>` would serve a stranger's booking page
 * under somebody else's logo, and the domain would be a way to enumerate the
 * product.
 *
 * A company is preferred over a profile for the same hostname. After the
 * backfill the company is the live holder, and preferring the older row would
 * serve the brand the migration replaced.
 */
export const hostForDomain = query({
  args: { domain: v.string() },
  handler: async (ctx, a) => {
    const domain = a.domain.trim().toLowerCase();
    if (!domain) return null;

    const company = await ctx.db
      .query("companies")
      .withIndex("by_custom_domain", (q) => q.eq("custom_domain", domain))
      .unique();

    if (company && company.custom_domain_verified_at) {
      const owner = await ctx.db
        .query("profiles")
        .withIndex("by_uuid", (q) => q.eq("id", company.owner_id))
        .unique();
      /* The OWNER's plan serves every page on this domain, including a free
         member's. Nobody's page resolves when the owner stops paying. */
      if (!owner || owner.is_suspended || !isPro(owner)) return null;

      const rows = await ctx.db
        .query("company_members")
        .withIndex("by_company", (q) => q.eq("company_id", company.id))
        .collect();

      const handles: { handle: string; username: string }[] = [];
      for (const row of rows) {
        const member = await ctx.db
          .query("profiles")
          .withIndex("by_uuid", (q) => q.eq("id", row.user_id))
          .unique();
        // A suspended host is not offered on a company domain either.
        if (!member || member.is_suspended) continue;
        handles.push({ handle: row.handle_lower, username: member.username });
      }

      return { company: company.slug, handles, username: null };
    }

    const p = await ctx.db
      .query("profiles")
      .withIndex("by_custom_domain", (q) => q.eq("custom_domain", domain))
      .unique();

    if (!p || !p.custom_domain_verified_at || p.is_suspended) return null;
    if (!isPro(p)) return null;
    return { company: null, handles: [{ handle: p.username.toLowerCase(), username: p.username }], username: p.username };
  },
});

/**
 * A company's brand, for a page being served on its domain.
 *
 * Resolved from the HOSTNAME rather than from anything in the path or the
 * query string, which is what makes it unspoofable: meetrao.com/alex cannot
 * be made to wear somebody else's logo by adding a parameter.
 */
export const companyBrandForDomain = query({
  args: { domain: v.string() },
  handler: async (ctx, a) => {
    const domain = a.domain.trim().toLowerCase();
    if (!domain) return null;

    const company = await ctx.db
      .query("companies")
      .withIndex("by_custom_domain", (q) => q.eq("custom_domain", domain))
      .unique();
    if (!company || !company.custom_domain_verified_at) return null;

    const owner = await ctx.db
      .query("profiles")
      .withIndex("by_uuid", (q) => q.eq("id", company.owner_id))
      .unique();
    // Gated on the way out, exactly as a profile's branding is.
    if (!owner || owner.is_suspended || !isPro(owner)) return null;

    const logo = company.brand_logo_url ?? null;
    const color = company.brand_color ?? null;
    const background = company.brand_background ?? null;
    const hidden = company.brand_logo_hidden ?? false;

    return {
      slug: company.slug,
      name: company.name,
      unbranded: true,
      brand:
        logo || color || background || hidden
          ? { logo_url: logo, logo_hidden: hidden, color, background }
          : null,
    };
  },
});

/* ─────────────────────────────────────────────────────────────────────────────
   A company's own address on meetrao.com.

   meetrao.com/<company>/<handle>/<meeting>, which exists whether or not the
   company has bought a domain. A custom domain is then a prettier alias for
   the same page rather than the only way to have one.

   HANDLES, NOT USERNAMES, for the same reason as on a custom domain: a handle
   is who somebody is INSIDE THIS COMPANY, and usernames are global and first
   come first served, so a company cannot be promised one.

   THE COMPANY SLUG IS ALREADY RESERVED product-wide. convex/companies.ts
   refuses a name held by a host or a team, so meetrao.com/<company> cannot
   collide with meetrao.com/<username>, and the two routes differ by segment
   count anyway.
   ───────────────────────────────────────────────────────────────────────── */

/** Who `handle` is on this company, or null. The gate for the public route. */
export const hostOnCompany = query({
  args: { companySlug: v.string(), handle: v.string() },
  handler: async (ctx, a) => {
    const company = await ctx.db
      .query("companies")
      .withIndex("by_slug_lower", (q) => q.eq("slug_lower", a.companySlug.trim().toLowerCase()))
      .unique();
    if (!company) return null;

    /* The OWNER's plan serves every page on this company, including a free
       member's, exactly as on a custom domain. Nobody's page resolves when
       the owner stops paying. */
    const owner = await ctx.db
      .query("profiles")
      .withIndex("by_uuid", (q) => q.eq("id", company.owner_id))
      .unique();
    if (!owner || owner.is_suspended || !isPro(owner)) return null;

    const row = await ctx.db
      .query("company_members")
      .withIndex("by_company_handle", (q) =>
        q.eq("company_id", company.id).eq("handle_lower", a.handle.trim().toLowerCase()),
      )
      .unique();
    if (!row) return null;

    const member = await ctx.db
      .query("profiles")
      .withIndex("by_uuid", (q) => q.eq("id", row.user_id))
      .unique();
    // A suspended host has no public page, on a company's address or their own.
    if (!member || member.is_suspended) return null;

    return { username: member.username };
  },
});

/**
 * Where a meeting's own address is, when it belongs to a company.
 *
 * Null for a personal meeting, which keeps meetrao.com/<username>/<meeting>.
 * The two-segment page uses this to send a company's meeting on to the
 * company's address rather than serving it at a personal one: every link
 * already in somebody's email signature keeps working, and there is one
 * canonical address for each page.
 */
export const companyPlaceOf = query({
  args: { username: v.string(), slug: v.string() },
  handler: async (ctx, a) => {
    const host = await ctx.db
      .query("profiles")
      .withIndex("by_username_lower", (q) => q.eq("username_lower", a.username.trim().toLowerCase()))
      .unique();
    if (!host) return null;

    const meeting = await ctx.db
      .query("meeting_types")
      .withIndex("by_user_slug", (q) => q.eq("user_id", host.id).eq("slug", a.slug.trim().toLowerCase()))
      .unique();
    if (!meeting || !meeting.company_id) return null;

    const company = await ctx.db
      .query("companies")
      .withIndex("by_uuid", (q) => q.eq("id", meeting.company_id as string))
      .unique();
    if (!company) return null;

    const row = await ctx.db
      .query("company_members")
      .withIndex("by_company", (q) => q.eq("company_id", company.id))
      .collect();
    const mine = row.find((m) => m.user_id === host.id);
    /* No membership means no address on this company, which happens when
       somebody is removed while their meeting still points at it. Sending
       them nowhere is better than sending them to a handle that 404s. */
    if (!mine) return null;

    return { companySlug: company.slug, handle: mine.handle };
  },
});

/** A company's brand by its slug, the same projection the domain lookup returns. */
export const companyBrandBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, a) => {
    const company = await ctx.db
      .query("companies")
      .withIndex("by_slug_lower", (q) => q.eq("slug_lower", a.slug.trim().toLowerCase()))
      .unique();
    if (!company) return null;

    const owner = await ctx.db
      .query("profiles")
      .withIndex("by_uuid", (q) => q.eq("id", company.owner_id))
      .unique();
    // Gated on the way out, exactly as a profile's branding is.
    if (!owner || owner.is_suspended || !isPro(owner)) return null;

    const logo = company.brand_logo_url ?? null;
    const color = company.brand_color ?? null;
    const background = company.brand_background ?? null;
    const hidden = company.brand_logo_hidden ?? false;

    return {
      slug: company.slug,
      name: company.name,
      unbranded: true,
      brand:
        logo || color || background || hidden
          ? { logo_url: logo, logo_hidden: hidden, color, background }
          : null,
    };
  },
});

/** One member's hours for a team meeting, their own schedule, their own zone. */
export const teamMemberAvailability = query({
  args: { teamSlug: v.string(), meetingId: v.string() },
  handler: async (ctx, a) => {
    const team = await ctx.db
      .query("teams")
      .withIndex("by_slug_lower", (q) => q.eq("slug_lower", a.teamSlug.trim().toLowerCase()))
      .unique();
    if (!team) return [];

    const meeting = await ctx.db.query("meeting_types").withIndex("by_uuid", (q) => q.eq("id", a.meetingId)).unique();
    if (!meeting || meeting.team_id !== team.id || !meeting.is_active) return [];

    const members = await membersOf(ctx, team.id);
    const out = [];

    for (const { profile } of members) {
      /* Each member's OWN default schedule. The meeting's schedule_id belongs
         to the owner and means nothing to anybody else, pointing a member at
         it would offer their colleague's hours in their name. */
      const rules = await rulesForMeeting(ctx, profile.id, null);
      const from = zonedDateKey(Date.now() - DAY, profile.timezone);
      const overrides = await overridesForMeeting(ctx, profile.id, null, from);

      out.push({
        user_id: profile.id,
        name: profile.full_name || profile.username,
        timezone: profile.timezone,
        rules: rules.map((r) => ({ weekday: r.weekday, start_minute: r.start_minute, end_minute: r.end_minute })),
        overrides: overrides.map((o) => ({ date: o.date, ranges: o.ranges })),
      });
    }

    return out;
  },
});

/**
 * How many seats are taken at each instant of one group meeting.
 *
 * Public, and it says only how many, never who. A guest choosing a time is
 * entitled to know that four of six seats are gone; they are not entitled to
 * the names of the four.
 */
export const seatsForMeeting = query({
  args: { meetingId: v.string(), from: v.number(), to: v.number() },
  handler: async (ctx, a) => {
    const meeting = await ctx.db.query("meeting_types").withIndex("by_uuid", (q) => q.eq("id", a.meetingId)).unique();
    if (!meeting || !meeting.is_active || (meeting.capacity ?? 1) <= 1) return [];

    // Clamped like busyForHost, and for the same reason: a public function
    // must not be a way to walk a host's whole calendar.
    const from = Math.max(a.from, Date.now() - DAY);
    const to = Math.min(a.to, from + 90 * DAY);

    const rows = await ctx.db
      .query("bookings")
      .withIndex("by_host_starts", (q) => q.eq("host_id", meeting.user_id).gte("starts_at", from).lte("starts_at", to))
      .collect();

    const counts = new Map<number, number>();
    for (const b of rows) {
      if (b.status !== "confirmed" || b.meeting_type_id !== meeting.id) continue;
      counts.set(b.starts_at, (counts.get(b.starts_at) ?? 0) + 1);
    }

    return [...counts].map(([startsAt, taken]) => ({ starts_at: startsAt, taken }));
  },
});

/**
 * Does this instant fall inside the hours the meeting is offered on?
 *
 * The slot engine in src/lib/booking/slots.ts answers this on the way in, and
 * this answers it again on the way through, because anyone can call the
 * mutation directly, migration 0005 is what a missing re-check looks like.
 * Convex cannot import the engine (different tsconfig root and bundle), so
 * this is the second implementation and has to learn every rule the first one
 * learns. Date overrides are the most recent of those: a host's day off is a
 * claim about their calendar date, so the date is resolved in the HOST's zone
 * and an override REPLACES the weekday's rules, exactly as it does in the
 * engine.
 */
async function fitsAvailability(
  ctx: QueryCtx | MutationCtx,
  args: { hostId: string; hostTimezone: string; scheduleId: string | null; startsAt: number; durationMinutes: number },
): Promise<boolean> {
  const { weekday, minute } = zonedWeekdayMinute(args.startsAt, args.hostTimezone);
  const dateKey = zonedDateKey(args.startsAt, args.hostTimezone);

  const overrides = await overridesForMeeting(ctx, args.hostId, args.scheduleId, dateKey);
  const onTheDay = overrides.find((o) => o.date === dateKey);

  const ranges = onTheDay
    ? onTheDay.ranges.map((r) => ({ start_minute: r.start_minute, end_minute: r.end_minute }))
    : (await rulesForMeeting(ctx, args.hostId, args.scheduleId))
        .filter((r) => r.weekday === weekday)
        .map((r) => ({ start_minute: r.start_minute, end_minute: r.end_minute }));

  return ranges.some((r) => minute >= r.start_minute && minute + args.durationMinutes <= r.end_minute);
}

/**
 * A booking on a team link, assigned to whoever's turn it is.
 *
 * FAIRNESS IS A COUNT, NOT A CURSOR. The member with the fewest bookings of
 * this meeting in the last thirty days goes next, ties broken by whoever was
 * booked longest ago. A stored "next member" pointer would be one more thing
 * to keep true, and it drifts the moment somebody joins, leaves or cancels,
 * a count re-derives the right answer from what actually happened.
 *
 * AVAILABILITY IS EACH MEMBER'S OWN. Their hours, their timezone, their days
 * off, their existing bookings. A member who is not free at that instant is
 * not eligible, however few bookings they have: fairness never outranks being
 * free, or a guest ends up with a meeting nobody can attend.
 *
 * Every guard create_booking applies applies here too, per member.
 */
export const createTeamBooking = mutation({
  args: {
    teamSlug: v.string(), slug: v.string(), startsAt: v.number(),
    guestName: v.string(), guestEmail: v.string(),
    guestNote: v.optional(v.string()), guestTimezone: v.optional(v.union(v.string(), v.null())),
    answers: v.optional(v.array(v.object({ id: v.string(), value: v.string() }))),
    pageViewId: v.optional(v.union(v.string(), v.null())),
    callerKey: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const team = await ctx.db
      .query("teams")
      .withIndex("by_slug_lower", (q) => q.eq("slug_lower", a.teamSlug.trim().toLowerCase()))
      .unique();
    if (!team) fail("unknown host");

    const meeting = await ctx.db
      .query("meeting_types")
      .withIndex("by_user_slug", (q) => q.eq("user_id", team.owner_id).eq("slug", a.slug.trim().toLowerCase()))
      .unique();
    if (!meeting || !meeting.is_active || meeting.team_id !== team.id) fail("unknown meeting");

    const now = Date.now();
    if (a.startsAt < now + meeting.minimum_notice_minutes * MINUTE) fail("inside minimum notice");
    if (a.startsAt > now + meeting.booking_window_days * DAY) fail("beyond booking window");

    const members = await membersOf(ctx, team.id);
    if (members.length === 0) fail("unknown host");

    const endsAt = a.startsAt + meeting.duration_minutes * MINUTE;
    const since = now - 30 * DAY;

    type Candidate = { userId: string; recent: number; lastAt: number };
    const eligible: Candidate[] = [];

    for (const { profile } of members) {
      // Their own hours, read the same way a solo booking reads the host's.
      const fits = await fitsAvailability(ctx, {
        hostId: profile.id,
        hostTimezone: profile.timezone,
        scheduleId: null,
        startsAt: a.startsAt,
        durationMinutes: meeting.duration_minutes,
      });
      if (!fits) continue;

      if (
        await findOverlap(ctx, {
          hostId: profile.id,
          startsAt: a.startsAt,
          endsAt,
          bufferMinutes: meeting.buffer_minutes,
        })
      ) {
        continue;
      }

      const theirs = await ctx.db
        .query("bookings")
        .withIndex("by_host_starts", (q) => q.eq("host_id", profile.id).gte("starts_at", since))
        .collect();
      const mine = theirs.filter((b) => b.meeting_type_id === meeting.id && b.status === "confirmed");

      eligible.push({
        userId: profile.id,
        recent: mine.length,
        lastAt: mine.reduce((max, b) => Math.max(max, b.created_at), 0),
      });
    }

    // Nobody free is the same answer a solo host gives, in the same words, so
    // the route maps it to the same 409 the guest's screen already handles.
    if (eligible.length === 0) fail("slot taken");

    eligible.sort((x, y) => x.recent - y.recent || x.lastAt - y.lastAt);
    const chosen = eligible[0];

    const guestKey = a.guestEmail.trim().toLowerCase();
    await consume(ctx, [
      { key: `host:${chosen.userId}`, limit: 30, windowMs: 60 * 60_000, message: "This team has taken too many bookings just now. Try again shortly." },
      { key: `guest:${guestKey}`, limit: 5, windowMs: 60 * 60_000, message: "You have made several bookings just now. Try again shortly." },
      ...(a.callerKey ? [{ key: `caller:${a.callerKey}`, limit: 20, windowMs: 60 * 60_000, message: "Too many requests. Try again shortly." }] : []),
    ]);

    const asked = meeting.questions ?? [];
    const given = new Map((a.answers ?? []).map((x) => [x.id, x.value.trim()]));
    const answers: { label: string; value: string }[] = [];
    for (const q of asked) {
      const value = (given.get(q.id) ?? "").slice(0, 2000);
      if (q.required && !value) fail(`${q.label} is required.`);
      if (value) answers.push({ label: q.label, value });
    }

    const booking = await insertBooking(ctx, {
      hostId: chosen.userId,
      meetingTypeId: meeting.id,
      meetingName: meeting.name,
      durationMinutes: meeting.duration_minutes,
      guestName: a.guestName,
      guestEmail: a.guestEmail,
      guestNote: a.guestNote ?? "",
      guestTimezone: a.guestTimezone ?? null,
      startsAt: a.startsAt,
      bufferMinutes: meeting.buffer_minutes,
      hostCreated: false,
      pageViewId: a.pageViewId ?? null,
      answers,
      location: meeting.location,
      locationDetail: meeting.location_detail ?? "",
      capacity: meeting.capacity ?? 1,
    });

    return {
      reference: booking.reference, id: booking.id, answers,
      starts_at: new Date(booking.starts_at).toISOString(),
      ends_at: new Date(booking.ends_at).toISOString(),
      meeting_name: booking.meeting_name, duration: booking.duration_minutes, host_id: booking.host_id,
    };
  },
});

/** public.create_booking. Every guard from migration 0005, in order. */
export const createBooking = mutation({
  args: {
    username: v.string(), slug: v.string(), startsAt: v.number(),
    guestName: v.string(), guestEmail: v.string(),
    guestNote: v.optional(v.string()), guestTimezone: v.optional(v.union(v.string(), v.null())),
    pageViewId: v.optional(v.union(v.string(), v.null())),
    /** Keyed by question id; the label is read from the meeting, so a guest
        cannot invent a question they were never asked. */
    answers: v.optional(v.array(v.object({ id: v.string(), value: v.string() }))),
    /** A coarse caller key from our own route handler, which can see the IP. */
    callerKey: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const host = await ctx.db
      .query("profiles")
      .withIndex("by_username_lower", (q) => q.eq("username_lower", a.username.trim().toLowerCase()))
      .unique();
    if (!host) fail("unknown host");
    if (host.is_suspended) fail("host is not accepting bookings");

    const meeting = await ctx.db
      .query("meeting_types")
      .withIndex("by_user_slug", (q) => q.eq("user_id", host.id).eq("slug", a.slug.trim().toLowerCase()))
      .unique();
    if (!meeting || !meeting.is_active) fail("unknown meeting");

    const now = Date.now();
    if (a.startsAt < now + meeting.minimum_notice_minutes * MINUTE) fail("inside minimum notice");
    if (a.startsAt > now + meeting.booking_window_days * DAY) fail("beyond booking window");

    const fits = await fitsAvailability(ctx, {
      hostId: host.id,
      hostTimezone: host.timezone,
      scheduleId: meeting.schedule_id,
      startsAt: a.startsAt,
      durationMinutes: meeting.duration_minutes,
    });
    if (!fits) fail("outside availability");

    /* Limits are consumed only once the booking is known to be legitimate, so
       a guest cannot be locked out by someone else's malformed attempts at the
       same host, but before the insert, so a flood cannot land rows. */
    const guestKey = a.guestEmail.trim().toLowerCase();
    await consume(ctx, [
      { key: `host:${host.id}`, limit: 30, windowMs: 60 * 60_000, message: "This host has taken too many bookings just now. Try again shortly." },
      { key: `guest:${guestKey}`, limit: 5, windowMs: 60 * 60_000, message: "You have made several bookings just now. Try again shortly." },
      ...(a.callerKey ? [{ key: `caller:${a.callerKey}`, limit: 20, windowMs: 60 * 60_000, message: "Too many requests. Try again shortly." }] : []),
    ]);

    /* The questions come from the meeting, never from the request: the
       answers arrive keyed by id, and anything not on the meeting's own list
       is dropped rather than stored. A required question with no answer
       refuses the booking here as well as in the form. */
    const asked = meeting.questions ?? [];
    const given = new Map((a.answers ?? []).map((x) => [x.id, x.value.trim()]));
    const answers: { label: string; value: string }[] = [];
    for (const q of asked) {
      const value = (given.get(q.id) ?? "").slice(0, 2000);
      if (q.required && !value) fail(`${q.label} is required.`);
      if (value) answers.push({ label: q.label, value });
    }

    const booking = await insertBooking(ctx, {
      hostId: host.id,
      meetingTypeId: meeting.id,
      meetingName: meeting.name,
      durationMinutes: meeting.duration_minutes,
      guestName: a.guestName,
      guestEmail: a.guestEmail,
      guestNote: a.guestNote ?? "",
      guestTimezone: a.guestTimezone ?? null,
      startsAt: a.startsAt,
      bufferMinutes: meeting.buffer_minutes,
      hostCreated: false,
      pageViewId: a.pageViewId ?? null,
      answers,
      location: meeting.location,
      locationDetail: meeting.location_detail ?? "",
      capacity: meeting.capacity ?? 1,
    });

    return {
      reference: booking.reference, id: booking.id, answers,
      starts_at: new Date(booking.starts_at).toISOString(),
      ends_at: new Date(booking.ends_at).toISOString(),
      meeting_name: booking.meeting_name, duration: booking.duration_minutes, host_id: booking.host_id,
    };
  },
});

/** public.get_booking_by_reference, the guest's own confirmation screen. */
export const getByReference = query({
  args: { reference: v.string() },
  handler: async (ctx, a) => {
    const b = await ctx.db.query("bookings").withIndex("by_reference", (q) => q.eq("reference", a.reference.trim())).unique();
    if (!b) return null;
    const host = await ctx.db.query("profiles").withIndex("by_uuid", (q) => q.eq("id", b.host_id)).unique();
    /* The meeting's slug, so the guest's own screen can offer to move the
       booking: the slot query is keyed by username and slug, and the booking
       row carries only an id. `null` when the meeting has since been deleted
       or switched off, which is what the screen reads as "cannot be moved". */
    const meeting = b.meeting_type_id
      ? await ctx.db
          .query("meeting_types")
          .withIndex("by_uuid", (q) => q.eq("id", b.meeting_type_id as string))
          .unique()
      : null;
    return {
      ...bookingOut(b),
      meeting_slug: meeting && meeting.is_active ? meeting.slug : null,
      /* The confirmation, reschedule and cancel screens are the host's pages
         too, a guest who booked through a branded page and lands on our
         green one has been handed off to a stranger. */
      host: host
        ? {
            username: host.username,
            full_name: host.full_name,
            timezone: host.timezone,
            avatar_url: host.avatar_url,
            unbranded: isPro(host),
            brand: publicBrand(host),
          }
        : null,
    };
  },
});

/** public.cancel_booking_by_reference. The reference IS the authorisation. */
export const cancelByReference = mutation({
  args: { reference: v.string() },
  handler: async (ctx, a) => {
    const b = await ctx.db.query("bookings").withIndex("by_reference", (q) => q.eq("reference", a.reference.trim())).unique();
    if (!b) fail("unknown booking", "NOT_FOUND");
    // `was_open` mirrors the RPC: cancelling twice is not a failure from the
    // guest's side, but only the first time should send mail or touch Google.
    if (b.status === "cancelled") return { booking: bookingOut(b), was_open: false };

    const now = Date.now();
    await ctx.db.patch(b._id, { status: "cancelled", cancelled_at: now, cancelled_by: "guest", updated_at: now });
    const after = (await ctx.db.get(b._id))!;

    await notifyBookingCancelled(ctx, after);
    await logActivity(ctx, {
      actorId: after.host_id, kind: "booking_cancelled",
      summary: `${after.guest_name} cancelled ${after.meeting_name}`,
    });
    return { booking: bookingOut(after), was_open: true };
  },
});

/**
 * The guest moving their own booking. The reference IS the authorisation, as
 * it is for cancelling, and moving is the gentler of the two, so nothing
 * stricter is warranted.
 *
 * Every guard `createBooking` applies runs again here, for the same reason it
 * runs there: the slot engine filtered the times on the way in, and anyone can
 * call this directly. Migration 0005 is what a missing check looks like.
 *
 * A booking with no live meeting type behind it (a meeting the host has since
 * deleted, or one the host arranged themselves) is refused rather than moved
 * against rules that no longer exist. The guest can still cancel.
 */
export const rescheduleByReference = mutation({
  args: {
    reference: v.string(),
    startsAt: v.number(),
    /** A coarse caller key from our own route handler, which can see the IP. */
    callerKey: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const b = await ctx.db
      .query("bookings")
      .withIndex("by_reference", (q) => q.eq("reference", a.reference.trim()))
      .unique();
    if (!b) fail("unknown booking", "NOT_FOUND");
    if (b.status !== "confirmed") fail("This meeting has been cancelled.");

    const host = await ctx.db.query("profiles").withIndex("by_uuid", (q) => q.eq("id", b.host_id)).unique();
    if (!host) fail("unknown host");
    if (host.is_suspended) fail("host is not accepting bookings");

    const meeting = b.meeting_type_id
      ? await ctx.db
          .query("meeting_types")
          .withIndex("by_uuid", (q) => q.eq("id", b.meeting_type_id as string))
          .unique()
      : null;
    if (!meeting || !meeting.is_active) fail("This meeting can no longer be moved online.");

    const now = Date.now();
    if (a.startsAt < now + meeting.minimum_notice_minutes * MINUTE) fail("inside minimum notice");
    if (a.startsAt > now + meeting.booking_window_days * DAY) fail("beyond booking window");

    const fits = await fitsAvailability(ctx, {
      hostId: host.id,
      hostTimezone: host.timezone,
      scheduleId: meeting.schedule_id,
      startsAt: a.startsAt,
      durationMinutes: b.duration_minutes,
    });
    if (!fits) fail("outside availability");

    /* Tighter than booking, on purpose: moving is cheap for the guest and
       expensive for the host, whose calendar and guests are notified each
       time. Consumed after validation, before the write, as create does. */
    await consume(ctx, [
      { key: `move:${b.reference}`, limit: 5, windowMs: 24 * 60 * 60_000, message: "This meeting has been moved several times. Contact the host instead." },
      { key: `host:${host.id}`, limit: 30, windowMs: 60 * 60_000, message: "This host has taken too many bookings just now. Try again shortly." },
      ...(a.callerKey ? [{ key: `caller:${a.callerKey}`, limit: 20, windowMs: 60 * 60_000, message: "Too many requests. Try again shortly." }] : []),
    ]);

    const oldStartsAt = b.starts_at;
    const after = await moveBooking(ctx, {
      booking: b,
      startsAt: a.startsAt,
      bufferMinutes: meeting.buffer_minutes,
      byHost: false,
    });

    return {
      reference: after.reference,
      id: after.id,
      starts_at: new Date(after.starts_at).toISOString(),
      ends_at: new Date(after.ends_at).toISOString(),
      old_starts_at: new Date(oldStartsAt).toISOString(),
    };
  },
});

/**
 * Just enough of the host to address a cancellation email.
 *
 * Scoped by the booking's reference (the guest's own credential) and it
 * returns ONLY the fields the mail template needs. The host's email is in
 * that list because the mail is addressed to them; nothing else about the
 * account comes back.
 */
export const hostForCancellationMail = query({
  args: { reference: v.string() },
  handler: async (ctx, a) => {
    const b = await ctx.db
      .query("bookings").withIndex("by_reference", (q) => q.eq("reference", a.reference.trim())).unique();
    if (!b || b.status !== "cancelled") return null;
    const p = await ctx.db.query("profiles").withIndex("by_uuid", (q) => q.eq("id", b.host_id)).unique();
    if (!p) return null;
    return {
      full_name: p.full_name,
      username: p.username,
      email: p.email,
      timezone: p.timezone,
      notify_booking_cancelled: p.notify_booking_cancelled,
    };
  },
});

/**
 * Just enough of the host to address a reschedule email. Same shape and same
 * reasoning as the two beside it.
 */
export const hostForRescheduleMail = query({
  args: { reference: v.string() },
  handler: async (ctx, a) => {
    const b = await ctx.db
      .query("bookings").withIndex("by_reference", (q) => q.eq("reference", a.reference.trim())).unique();
    if (!b) return null;
    const p = await ctx.db.query("profiles").withIndex("by_uuid", (q) => q.eq("id", b.host_id)).unique();
    if (!p) return null;
    return {
      full_name: p.full_name,
      username: p.username,
      email: p.email,
      timezone: p.timezone,
      notify_booking_changed: p.notify_booking_changed,
    };
  },
});

/**
 * Just enough of the host to address a new-booking email.
 *
 * Same shape and same reasoning as `hostForCancellationMail`: scoped by the
 * booking's reference, and only the fields the template needs.
 */
export const hostForBookingMail = query({
  args: { reference: v.string() },
  handler: async (ctx, a) => {
    const b = await ctx.db
      .query("bookings").withIndex("by_reference", (q) => q.eq("reference", a.reference.trim())).unique();
    if (!b) return null;
    const p = await ctx.db.query("profiles").withIndex("by_uuid", (q) => q.eq("id", b.host_id)).unique();
    if (!p) return null;
    return {
      full_name: p.full_name,
      username: p.username,
      email: p.email,
      notify_new_booking: p.notify_new_booking,
    };
  },
});
