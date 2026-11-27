import ICAL from "ical.js";

/* ─────────────────────────────────────────────────────────────────────────────
   A host's calendar feed, reduced to busy time.

   The host pastes their calendar's private iCal address (Google's "secret
   address in iCal format", an Outlook published ICS link, an iCloud public
   calendar). This file turns the text behind it into start/end pairs and
   nothing else: no titles, no descriptions, no attendees, no locations. What
   is not kept cannot leak.

   ical.js (Mozilla's parser, the one Thunderbird uses) does the hard parts:
   RRULE expansion, EXDATE, RECURRENCE-ID overrides and the feed's own
   VTIMEZONE definitions. What is left here is policy:

     · TRANSP:TRANSPARENT ("show as free") and STATUS:CANCELLED are not busy.
     · An all-day event, and a time with no zone at all ("floating"), is read
       in the host's own time zone.
     · A TZID the feed names but never defines is used if it is a real IANA
       zone, and otherwise falls back to the host's zone.
     · Only the window asked for is expanded, with a cap on occurrences, so a
       daily event with no end cannot run forever.
   ───────────────────────────────────────────────────────────────────────────── */

export type BusyInterval = { start: number; end: number };

/* No event is walked past this many occurrences, whatever its rule says. The
   walk starts at the first occurrence, so a daily event begun years ago has to
   step through every day since: the step cap is generous for that, and the
   kept cap is what bounds the output. */
const MAX_STEPS_PER_EVENT = 50_000;
const MAX_KEPT_PER_EVENT = 2_000;
/** The stored list is capped too; a Convex document holds at most 1 MiB. */
export const MAX_INTERVALS = 5_000;

/* ── time zones without the feed's help ─────────────────────────────────── */

function isIanaZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

const formats = new Map<string, Intl.DateTimeFormat>();

/** The zone's offset from UTC, in ms, at the instant `utcMs`. */
function offsetAt(utcMs: number, zone: string): number {
  let format = formats.get(zone);
  if (!format) {
    format = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    formats.set(zone, format);
  }
  const parts = format.formatToParts(new Date(utcMs));
  const n = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second"));
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/** A wall-clock time in `zone` as epoch ms. Two passes settle DST edges. */
export function wallClockToEpoch(
  t: { year: number; month: number; day: number; hour: number; minute: number; second: number },
  zone: string,
): number {
  const naive = Date.UTC(t.year, t.month - 1, t.day, t.hour, t.minute, t.second);
  const first = naive - offsetAt(naive, zone);
  return naive - offsetAt(first, zone);
}

/* ── one time value ──────────────────────────────────────────────────────── */

type ZoneHint = { tzid: string | null; hostZone: string };

function toEpoch(time: ICAL.Time, hint: ZoneHint): number {
  const zone = time.zone;
  // A DATE (all-day) value has no zone by definition: the host's midnight.
  if (time.isDate) {
    return wallClockToEpoch({ year: time.year, month: time.month, day: time.day, hour: 0, minute: 0, second: 0 }, hint.hostZone);
  }
  const resolved =
    zone && zone !== ICAL.Timezone.localTimezone && zone.tzid !== "floating" ? zone : null;
  if (resolved) return time.toUnixTime() * 1000;

  // Floating, or a TZID the feed never defined.
  const fallback = hint.tzid && isIanaZone(hint.tzid) ? hint.tzid : hint.hostZone;
  return wallClockToEpoch(time, fallback);
}

function tzidOf(component: ICAL.Component, property: string): string | null {
  const prop = component.getFirstProperty(property);
  const value = prop?.getParameter("tzid");
  return typeof value === "string" ? value : null;
}

function isFree(component: ICAL.Component): boolean {
  const transp = String(component.getFirstPropertyValue("transp") ?? "").toUpperCase();
  const status = String(component.getFirstPropertyValue("status") ?? "").toUpperCase();
  return transp === "TRANSPARENT" || status === "CANCELLED";
}

/* ── the feed ────────────────────────────────────────────────────────────── */

export class FeedParseError extends Error {}

/**
 * Busy intervals from an iCalendar document, inside [from, to).
 *
 * Throws FeedParseError when the text is not a calendar at all, so the caller
 * can tell a bad address (an HTML login page, say) from an empty calendar.
 */
export function busyFromIcs(
  text: string,
  window: { from: number; to: number },
  hostZone: string,
): BusyInterval[] {
  if (!/BEGIN:VCALENDAR/i.test(text.slice(0, 2_000))) {
    throw new FeedParseError("That address did not return a calendar.");
  }
  let root: ICAL.Component;
  try {
    root = new ICAL.Component(ICAL.parse(text));
  } catch {
    throw new FeedParseError("The calendar could not be read.");
  }
  const vevents = root.getAllSubcomponents("vevent");

  // Masters and their overrides, grouped by UID.
  const masters = new Map<string, ICAL.Component>();
  const overrides = new Map<string, ICAL.Component[]>();
  const loose: ICAL.Component[] = [];
  for (const ve of vevents) {
    const uid = String(ve.getFirstPropertyValue("uid") ?? "");
    if (!uid) {
      loose.push(ve);
    } else if (ve.hasProperty("recurrence-id")) {
      const list = overrides.get(uid) ?? [];
      list.push(ve);
      overrides.set(uid, list);
    } else {
      masters.set(uid, ve);
    }
  }
  // An override whose master is missing is just a single event.
  for (const [uid, list] of overrides) if (!masters.has(uid)) loose.push(...list);

  const out: BusyInterval[] = [];
  const push = (start: number, end: number) => {
    if (!(end > start)) return;
    if (end <= window.from || start >= window.to) return;
    out.push({ start, end });
  };

  const single = (ve: ICAL.Component) => {
    if (isFree(ve)) return;
    const ev = new ICAL.Event(ve);
    if (!ev.startDate) return;
    const hint = { tzid: tzidOf(ve, "dtstart"), hostZone };
    const start = toEpoch(ev.startDate, hint);
    const end = ev.endDate ? toEpoch(ev.endDate, { tzid: tzidOf(ve, "dtend") ?? hint.tzid, hostZone }) : start;
    push(start, end);
  };

  for (const ve of loose) single(ve);

  for (const [uid, master] of masters) {
    const ev = new ICAL.Event(master);
    if (!ev.startDate) continue;
    for (const o of overrides.get(uid) ?? []) ev.relateException(o);

    if (!ev.isRecurring()) {
      single(master);
      continue;
    }

    const hint = { tzid: tzidOf(master, "dtstart"), hostZone };
    const iterator = ev.iterator();
    let kept = 0;
    for (let i = 0, next = iterator.next(); next && i < MAX_STEPS_PER_EVENT && kept < MAX_KEPT_PER_EVENT; i++, next = iterator.next()) {
      const details = ev.getOccurrenceDetails(next);
      const item = details.item.component;
      // An occurrence that starts after the window ends, by its unmoved
      // recurrence time, ends the walk; a moved one is checked on its own.
      const start = toEpoch(details.startDate, { tzid: tzidOf(item, "dtstart") ?? hint.tzid, hostZone });
      const recurrenceStart = toEpoch(details.recurrenceId, hint);
      if (recurrenceStart >= window.to && start >= window.to) break;
      if (isFree(item)) continue;
      const end = toEpoch(details.endDate, { tzid: tzidOf(item, "dtend") ?? tzidOf(item, "dtstart") ?? hint.tzid, hostZone });
      if (end > window.from && start < window.to) kept++;
      push(start, end);
    }
  }

  return mergeIntervals(out).slice(0, MAX_INTERVALS);
}

/** Sorted, with overlapping and touching intervals joined. */
export function mergeIntervals(list: BusyInterval[]): BusyInterval[] {
  const sorted = [...list].sort((a, b) => a.start - b.start);
  const merged: BusyInterval[] = [];
  for (const i of sorted) {
    const last = merged[merged.length - 1];
    if (last && i.start <= last.end) last.end = Math.max(last.end, i.end);
    else merged.push({ ...i });
  }
  return merged;
}

/* ── the address ─────────────────────────────────────────────────────────── */

/**
 * The address as we will fetch it, or an error to show the host.
 *
 * webcal:// is https:// by another name. Only https is accepted: a private
 * address sent in the clear is not private. Hosts that name this machine or a
 * private network are refused, so the field cannot be used to probe whatever
 * sits next to our backend.
 */
export function normalizeFeedUrl(input: string): { ok: true; url: string } | { ok: false; error: string } {
  const raw = input.trim().replace(/^webcals?:\/\//i, "https://");
  if (!raw) return { ok: false, error: "Paste your calendar's iCal address." };
  if (raw.length > 2_000) return { ok: false, error: "That address is too long." };
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, error: "That is not a web address." };
  }
  if (url.protocol !== "https:") return { ok: false, error: "The address must start with https:// or webcal://." };
  if (url.username || url.password) return { ok: false, error: "Use the address without a username or password in it." };
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const privateHost =
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    (!host.includes(".") && !host.includes(":")) ||
    /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) ||
    /^(::1?|f[cd][0-9a-f]{2}:|fe80:)/i.test(host);
  if (privateHost) return { ok: false, error: "That address is not reachable from the internet." };
  return { ok: true, url: url.toString() };
}

/**
 * The address as the host sees it once saved: where it points, and the last
 * four characters, so they can tell two feeds apart without the secret part
 * ever being shown again.
 */
export function maskFeedUrl(url: string): string {
  let host = "calendar";
  try {
    host = new URL(url).hostname;
  } catch {
    /* fall through */
  }
  const tail = url.replace(/\/+$/, "").slice(-4);
  return `${host}/••••${tail}`;
}
