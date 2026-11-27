/* ─────────────────────────────────────────────────────────────────────────────
   Calendar invitations (iCalendar / iTIP, RFC 5545 and 5546).

   Every booking email carries one of these. Gmail, Outlook and Apple Mail read
   a METHOD:REQUEST attachment as an invitation and put the meeting on the
   recipient's calendar; a later REQUEST with the same UID and a higher
   SEQUENCE moves it; METHOD:CANCEL takes it off. That is what replaced writing
   events into the host's Google Calendar.

   The UID is the booking reference, so it never changes for the life of the
   booking. SEQUENCE is the booking's revision (bumped on every move), and a
   cancellation goes one higher than the last move so no client keeps the
   meeting.

   Pure: no I/O, no server-only imports, so it is unit-tested directly and also
   used by the downloadable /booking/[reference]/ics route.
   ───────────────────────────────────────────────────────────────────────────── */

export type InviteMethod = "REQUEST" | "CANCEL" | "PUBLISH";

export type Invite = {
  method: InviteMethod;
  /** The booking reference. Becomes `<reference>@meetrao.com`. */
  reference: string;
  /** Booking revision: 0 when booked, +1 per move. */
  sequence: number;
  start: Date;
  end: Date;
  summary: string;
  description: string;
  location: string;
  /** Link to the booking page, shown by clients that support URL. */
  url?: string;
  organizer: { name: string; email: string };
  /** `accepted`: already in (the host on their own copy): no RSVP asked. */
  attendees: { name: string; email: string; accepted?: boolean }[];
  /** Defaults to now. Injected by tests. */
  stamp?: Date;
};

function utcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** RFC 5545 TEXT escaping. */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** A parameter value (CN): quoted, with the characters a quote cannot hold removed. */
function paramValue(value: string): string {
  return `"${value.replace(/["\r\n]/g, "").trim()}"`;
}

/** Folds a content line at 75 octets, continuation lines starting with a space. */
export function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const decoder = new TextDecoder();
  const parts: string[] = [];
  let i = 0;
  let limit = 75;
  while (i < bytes.length) {
    let end = Math.min(i + limit, bytes.length);
    // Never split a UTF-8 sequence: back off continuation bytes.
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    parts.push(decoder.decode(bytes.slice(i, end)));
    i = end;
    limit = 74; // the leading space counts
  }
  return parts.join("\r\n ");
}

function mailto(email: string): string {
  return `mailto:${email.trim()}`;
}

export function buildInvite(invite: Invite): string {
  const cancelled = invite.method === "CANCEL";
  const sequence = cancelled ? invite.sequence + 1 : invite.sequence;
  const organizer = invite.organizer;
  const seen = new Set<string>();
  const attendees = invite.attendees.filter((a) => {
    const key = a.email.trim().toLowerCase();
    if (!key || seen.has(key) || key === organizer.email.trim().toLowerCase()) return false;
    seen.add(key);
    return true;
  });

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Meetrao//Booking//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${invite.method}`,
    "BEGIN:VEVENT",
    `UID:${escapeText(invite.reference)}@meetrao.com`,
    `DTSTAMP:${utcStamp(invite.stamp ?? new Date())}`,
    `DTSTART:${utcStamp(invite.start)}`,
    `DTEND:${utcStamp(invite.end)}`,
    `SEQUENCE:${sequence}`,
    `SUMMARY:${escapeText(invite.summary)}`,
    `DESCRIPTION:${escapeText(invite.description)}`,
    ...(invite.location ? [`LOCATION:${escapeText(invite.location)}`] : []),
    ...(invite.url ? [`URL:${invite.url}`] : []),
    `ORGANIZER;CN=${paramValue(organizer.name)}:${mailto(organizer.email)}`,
    ...attendees.map((a) => {
      const asked = !cancelled && !a.accepted;
      return `ATTENDEE;CN=${paramValue(a.name || a.email)};ROLE=REQ-PARTICIPANT;PARTSTAT=${
        a.accepted ? "ACCEPTED" : "NEEDS-ACTION"
      };RSVP=${asked ? "TRUE" : "FALSE"}:${mailto(a.email)}`;
    }),
    `STATUS:${cancelled ? "CANCELLED" : "CONFIRMED"}`,
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
