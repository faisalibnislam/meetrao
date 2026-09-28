import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { attendeeResponse } from "./lib/googleApi";
import { notifyBookingDeclined } from "./lib/effects";

/* ─────────────────────────────────────────────────────────────────────────────
   Did the guest accept?

   `bookings.guest_rsvp` and its two timestamps have existed since the port and
   nothing ever wrote them, so a host learned that a guest had declined only by
   looking in their own calendar — or by sitting in an empty Meet.

   WHAT THIS READS, AND WHAT IT DOES NOT. One request per booking, for the
   event id stored on that booking, asking only for the attendee list. It reads
   events MEETRAO ITSELF CREATED and nothing else: there is no listing, no
   search, no free text, and `fields` keeps even the title of our own event out
   of the response. The published copy says this in the same words, because a
   privacy promise that is narrower than the code is the kind of thing people
   discover rather than read.

   A DECLINE IS NOT A CANCELLATION. The booking stands and the slot stays held.
   Declining in Google and cancelling through the link are different acts by
   different means, and a host who cannot tell them apart will cancel the wrong
   meeting. The host is told once, and decides.
   ───────────────────────────────────────────────────────────────────────────── */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** How far ahead to look. Past this, an answer costs a request and changes nothing. */
const HORIZON = 14 * DAY;

/** How often one booking is re-asked about. */
const RECHECK = 3 * HOUR;

/** One sweep's worth, so a busy deployment cannot run long. */
const BATCH = 40;

/** Google's own vocabulary. `needsAction` means they have not answered. */
const ANSWERS = ["needsAction", "accepted", "declined", "tentative"];

export const due = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const rows = await ctx.db
      .query("bookings")
      .withIndex("by_starts", (q) => q.gt("starts_at", now).lte("starts_at", now + HORIZON))
      .take(200);

    return rows
      .filter(
        (b) =>
          b.status === "confirmed" &&
          b.google_event_id !== null &&
          // Host-created meetings carry invitees rather than one guest of
          // record, and the host already knows who is coming.
          !b.host_created &&
          (b.guest_rsvp_synced_at === null || b.guest_rsvp_synced_at < now - RECHECK),
      )
      .slice(0, BATCH)
      .map((b) => ({
        id: b.id,
        hostId: b.host_id,
        eventId: b.google_event_id as string,
        guestEmail: b.guest_email,
      }));
  },
});

/**
 * Records an answer, and tells the host the first time it is "no".
 *
 * `guest_rsvp_notified_at` is what keeps the telling to once: a guest who
 * declines, is re-asked three hours later and still declines has not declined
 * twice. The claim-then-act shape is the welcome email's, for the same reason.
 */
export const record = internalMutation({
  args: { id: v.string(), status: v.union(v.string(), v.null()) },
  handler: async (ctx, a) => {
    const b = await ctx.db.query("bookings").withIndex("by_uuid", (q) => q.eq("id", a.id)).unique();
    if (!b) return false;

    const status = a.status && ANSWERS.includes(a.status) ? a.status : null;
    const now = Date.now();
    const patch: Record<string, unknown> = {
      guest_rsvp: status,
      guest_rsvp_synced_at: now,
      updated_at: now,
    };

    const newlyDeclined = status === "declined" && b.guest_rsvp !== "declined" && !b.guest_rsvp_notified_at;
    if (newlyDeclined) patch.guest_rsvp_notified_at = now;

    await ctx.db.patch(b._id, patch);

    if (newlyDeclined) {
      const after = (await ctx.db.get(b._id))!;
      await notifyBookingDeclined(ctx, after);
    }
    return newlyDeclined;
  },
});

/**
 * The cron's entry point.
 *
 * An event that has vanished from Google is left alone rather than cancelled:
 * a host who deleted the event may have meant to, and this sweep is not the
 * place to decide that a meeting is over.
 */
export const sweep = internalAction({
  args: {},
  handler: async (ctx): Promise<{ checked: number; declined: number }> => {
    const rows: { id: string; hostId: string; eventId: string; guestEmail: string }[] = await ctx.runQuery(
      internal.rsvp.due,
      {},
    );
    if (rows.length === 0) return { checked: 0, declined: 0 };

    /* One token per host, not per booking: a host with six meetings this week
       is one credential, and refreshing it six times is six ways to trip a
       rate limit. */
    const creds = new Map<string, { token: string; calendarId: string } | null>();
    let checked = 0;
    let declined = 0;

    for (const row of rows) {
      if (!creds.has(row.hostId)) {
        creds.set(row.hostId, await ctx.runAction(internal.google.accessTokenFor, { userId: row.hostId }));
      }
      const cred = creds.get(row.hostId);
      if (!cred) continue;

      const answer = await attendeeResponse(cred.token, cred.calendarId, row.eventId, row.guestEmail);
      if (answer === "failed" || answer === "missing") continue;

      checked++;
      const wasDeclined = await ctx.runMutation(internal.rsvp.record, { id: row.id, status: answer.status });
      if (wasDeclined) declined++;
    }

    return { checked, declined };
  },
});
