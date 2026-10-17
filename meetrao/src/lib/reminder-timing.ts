import { DEFAULT_LEADS, LONG_CHOICES, SHORT_CHOICES } from "@/convex/lib/reminderWindow";

/* ─────────────────────────────────────────────────────────────────────────────
   When reminders go out, worded for a screen.

   The menus and the sentence that describes them are built from the lists
   Convex enforces (convex/lib/reminderWindow.ts), so the Notifications tab
   cannot offer a time the mutation refuses or describe one it does not send.

   A plain module rather than part of settings-panels.tsx, which is a client
   component: these are values and a pure function, and keeping them here lets
   them be tested without rendering anything.
   ───────────────────────────────────────────────────────────────────────────── */

/** "1 day before", "30 minutes before". */
export function leadLabel(minutes: number): string {
  if (minutes % 1440 === 0) {
    const days = minutes / 1440;
    return `${days} ${days === 1 ? "day" : "days"} before`;
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} ${hours === 1 ? "hour" : "hours"} before`;
  }
  return `${minutes} minutes before`;
}

export const LONG_OPTIONS = LONG_CHOICES.map((m) => ({ value: String(m), label: leadLabel(m) }));
export const SHORT_OPTIONS = SHORT_CHOICES.map((m) => ({ value: String(m), label: leadLabel(m) }));

/** The times in force for a profile. Absent is the free schedule. */
export function leadsOf(profile: { reminder_long_minutes?: number; reminder_short_minutes?: number }): {
  long: number;
  short: number;
} {
  return {
    long: profile.reminder_long_minutes ?? DEFAULT_LEADS.long,
    short: profile.reminder_short_minutes ?? DEFAULT_LEADS.short,
  };
}

/**
 * The reminders row's description, from the times actually in force.
 *
 * It used to be fixed copy, "A nudge the day before and an hour before",
 * while the Plan tab let Pro move both, so a Pro host who had chosen two days
 * and thirty minutes read the wrong times on Notifications. The guest's
 * reminders follow the same pair (convex/reminders.ts reads one pair for
 * both), which is why the second sentence can say "at the same times".
 */
export function remindersText(long: number, short: number): string {
  return `Emailed ${leadLabel(long)} and ${leadLabel(short)} each meeting. Your guest is reminded at the same times either way.`;
}
