import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { renderReminder } from "./lib/reminderEmail";
import { required } from "./lib/emails";
import { localWhen } from "./lib/effects";
import { DEFAULT_LEADS, GRACE, dayPhrase, verdictFor } from "./lib/reminderWindow";

/* ─────────────────────────────────────────────────────────────────────────────
   Reminders: one the day before, one an hour before.

   A SWEEP RATHER THAN A SCHEDULED JOB PER BOOKING. `ctx.scheduler.runAt` would
   mean a job pinned to a time that can change: every move would have to cancel
   two jobs and book two more, a cancellation two more still, and a booking
   made before this feature existed would never have any. A sweep asks the
   current data what is due, so a moved meeting reminds at its new time and a
   cancelled one stops reminding, without anything having to remember to say so.

   CLAIM, THEN SEND. The mutation marks the booking and hands back the payload;
   the action sends what it was handed. Two sweeps overlapping, or one retried
   after a crash, find the row already claimed and skip it. The welcome email
   settled this trade first: a reminder that goes missing is a small thing, one
   that arrives twice is why people turn reminders off.

   WHO GETS WHAT. The guest always. They booked the meeting and the reminder
   is the thing they asked for by booking it. The host only if reminders are on
   in their settings; absent means on, because every profile written before
   this feature has no such field and defaulting off would silently switch a
   preference nobody had set.
   ───────────────────────────────────────────────────────────────────────────── */

const DAY = 24 * 60 * 60_000;

/** One sweep's worth. The window holds a day of bookings across every host. */
const BATCH = 200;

type Due = {
  bookingId: string;
  lead: "24h" | "1h";
  to: "host" | "guest";
  email: string;
  meetingName: string;
  otherParty: string;
  whenLong: string;
  dayPhrase: string;
  timezone: string;
  durationMinutes: number;
  meetUrl: string | null;
  reference: string;
};

/**
 * Finds what is due, marks it, and returns what to send.
 *
 * A booking is due its 24-hour reminder once it starts within a day, and its
 * one-hour reminder once it starts within an hour. Both are skipped when the
 * moment has already passed by more than the grace period: a sweep catching up
 * after an outage should not tell someone about a meeting that started twenty
 * minutes ago, and must not tell them about one that ended yesterday.
 *
 * A booking made inside the window gets the reminders that are still ahead of
 * it and not the ones that are not, booking at 09:00 for 10:00 claims the
 * one-hour reminder, and the day-before reminder is marked as spent rather
 * than sent late.
 */
export const claimDue = internalMutation({
  args: {},
  handler: async (ctx): Promise<Due[]> => {
    const now = Date.now();
    const soon = await ctx.db
      .query("bookings")
      .withIndex("by_starts", (q) => q.gt("starts_at", now - GRACE).lte("starts_at", now + DAY))
      .take(BATCH);

    const out: Due[] = [];

    for (const b of soon) {
      if (b.status !== "confirmed") continue;

      const host = await ctx.db
        .query("profiles")
        .withIndex("by_uuid", (q) => q.eq("id", b.host_id))
        .unique();
      if (!host || host.is_suspended) continue;

      const hostZone = host.timezone || "UTC";
      const guestZone = b.guest_timezone || hostZone;
      const hostName = host.full_name || host.username;

      /* The host's own lead times, which Pro can change. Absent is the free
         default, and a free account that was Pro keeps whatever it chose,
         harmless, and better than silently moving somebody's reminders. */
      const leads = {
        long: host.reminder_long_minutes ?? DEFAULT_LEADS.long,
        short: host.reminder_short_minutes ?? DEFAULT_LEADS.short,
      };

      for (const lead of ["24h", "1h"] as const) {
        const claimed = lead === "24h" ? b.reminded_24h_at : b.reminded_1h_at;
        if (claimed) continue;

        const verdict = verdictFor(lead, b.starts_at, now, leads);
        if (verdict === "wait") continue;

        // Claimed either way: "mark" exists so a moment that has passed is not
        // reconsidered on every sweep for the rest of the window.
        await ctx.db.patch(b._id, lead === "24h" ? { reminded_24h_at: now } : { reminded_1h_at: now });
        if (verdict === "mark") continue;

        const whenHost = localWhen(b.starts_at, hostZone);
        const whenGuest = localWhen(b.starts_at, guestZone);

        // The host's copy is theirs to switch off; the guest's is not, because
        // a guest has no account in which to switch anything.
        if (host.notify_reminders !== false && host.email) {
          out.push({
            bookingId: b.id, lead, to: "host", email: host.email,
            meetingName: b.meeting_name, otherParty: b.guest_name,
            whenLong: whenHost, dayPhrase: dayPhrase(b.starts_at, now, hostZone), timezone: hostZone,
            durationMinutes: b.duration_minutes, meetUrl: b.meet_url, reference: b.reference,
          });
        }
        out.push({
          bookingId: b.id, lead, to: "guest", email: b.guest_email,
          meetingName: b.meeting_name, otherParty: hostName,
          whenLong: whenGuest, dayPhrase: dayPhrase(b.starts_at, now, guestZone), timezone: guestZone,
          durationMinutes: b.duration_minutes, meetUrl: b.meet_url, reference: b.reference,
        });
      }
    }

    return out;
  },
});

/** "30 min" · "1 hr 30 min", src/lib/booking/time.ts's formatDuration, which Convex cannot import. */
function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}

/** IANA name as the mail prints it: "Asia/Dhaka" reads as "Asia/Dhaka". */
function zoneLabel(zone: string): string {
  return zone.replace(/_/g, " ");
}

async function deliver(to: string, subject: string, html: string, key: string): Promise<boolean> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${required("AUTH_RESEND_KEY")}`,
      "Content-Type": "application/json",
      /* One key per booking, lead and recipient. The sweep claims before it
         sends, so this is the second line: a retry inside Resend's window is
         the same message, not another one. */
      "Idempotency-Key": key,
    },
    body: JSON.stringify({ from: required("EMAIL_FROM"), to, subject, html }),
  });
  return response.ok;
}

/**
 * The cron's entry point.
 *
 * Failures are counted and returned rather than thrown: one refused address
 * must not stop the rest of the batch, and the row is already claimed either
 * way. A reminder is worth one attempt, by the time a retry ran, the meeting
 * would be closer than the reminder claims it is.
 */
export const sweep = internalAction({
  args: {},
  handler: async (ctx): Promise<{ sent: number; failed: number }> => {
    const due: Due[] = await ctx.runMutation(internal.reminders.claimDue, {});
    if (due.length === 0) return { sent: 0, failed: 0 };

    const site = required("SITE_URL");
    const postalAddress = required("EMAIL_POSTAL_ADDRESS");

    let sent = 0;
    let failed = 0;

    for (const d of due) {
      const { subject, html } = renderReminder({
        to: d.to,
        lead: d.lead,
        meetingName: d.meetingName,
        otherParty: d.otherParty,
        whenLong: d.whenLong,
        dayPhrase: d.dayPhrase,
        timezoneLabel: zoneLabel(d.timezone),
        durationLabel: durationLabel(d.durationMinutes),
        meetUrl: d.meetUrl,
        reference: d.reference,
        site,
        postalAddress,
      });

      try {
        const ok = await deliver(d.email, subject, html, `reminder-${d.lead}-${d.to}:${d.bookingId}`);
        if (ok) sent++;
        else failed++;
      } catch {
        failed++;
      }
    }

    return { sent, failed };
  },
});
