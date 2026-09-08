/* ─────────────────────────────────────────────────────────────────────────────
   Timezones.

   Ninety-four IANA zones, sorted by UTC offset and labelled `GMT±HH:MM  City`.
   Offsets are computed at runtime through Intl with `timeZoneName: 'shortOffset'`,
   so they follow DST rather than being frozen into a table.
   ───────────────────────────────────────────────────────────────────────────── */

export const TIMEZONES = [
  "Pacific/Midway", "Pacific/Honolulu", "America/Anchorage", "America/Los_Angeles",
  "America/Vancouver", "America/Tijuana", "America/Denver", "America/Phoenix",
  "America/Edmonton", "America/Chicago", "America/Mexico_City", "America/Winnipeg",
  "America/Guatemala", "America/Bogota", "America/Lima", "America/New_York",
  "America/Toronto", "America/Panama", "America/Halifax", "America/Santiago",
  "America/Caracas", "America/Sao_Paulo", "America/Argentina/Buenos_Aires",
  "America/Montevideo", "Atlantic/South_Georgia", "Atlantic/Azores",
  "Atlantic/Cape_Verde", "UTC", "Europe/London", "Europe/Dublin", "Europe/Lisbon",
  "Africa/Casablanca", "Africa/Lagos", "Europe/Paris", "Europe/Berlin", "Europe/Madrid",
  "Europe/Rome", "Europe/Amsterdam", "Europe/Brussels", "Europe/Zurich", "Europe/Vienna",
  "Europe/Prague", "Europe/Warsaw", "Europe/Stockholm", "Europe/Oslo", "Europe/Copenhagen",
  "Europe/Budapest", "Africa/Johannesburg", "Africa/Cairo", "Europe/Athens",
  "Europe/Helsinki", "Europe/Bucharest", "Europe/Kyiv", "Europe/Istanbul",
  "Asia/Jerusalem", "Africa/Nairobi", "Europe/Moscow", "Asia/Riyadh", "Asia/Baghdad",
  "Asia/Tehran", "Asia/Dubai", "Asia/Baku", "Asia/Kabul", "Asia/Karachi", "Asia/Tashkent",
  "Asia/Kolkata", "Asia/Colombo", "Asia/Kathmandu", "Asia/Dhaka", "Asia/Almaty",
  "Asia/Yangon", "Asia/Bangkok", "Asia/Jakarta", "Asia/Ho_Chi_Minh", "Asia/Shanghai",
  "Asia/Hong_Kong", "Asia/Singapore", "Asia/Kuala_Lumpur", "Asia/Manila", "Asia/Taipei",
  "Australia/Perth", "Asia/Tokyo", "Asia/Seoul", "Australia/Adelaide", "Australia/Darwin",
  "Australia/Brisbane", "Australia/Sydney", "Australia/Melbourne", "Pacific/Guam",
  "Pacific/Noumea", "Pacific/Auckland", "Pacific/Fiji", "Pacific/Tongatapu",
  "Pacific/Kiritimati",
] as const;

export type TimezoneOption = { value: string; label: string };

function offsetMinutes(zone: string, at: Date): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      timeZoneName: "shortOffset",
    }).formatToParts(at);
    const raw = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
    const m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(raw);
    if (!m) return 0;
    const sign = m[1] === "-" ? -1 : 1;
    return sign * (parseInt(m[2], 10) * 60 + (m[3] ? parseInt(m[3], 10) : 0));
  } catch {
    return 0;
  }
}

function label(zone: string, at: Date): string {
  const mins = offsetMinutes(zone, at);
  const sign = mins < 0 ? "−" : "+"; // a real minus sign, not a hyphen
  const abs = Math.abs(mins);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  const offset = mins === 0 ? "GMT+00:00" : `GMT${sign}${hh}:${mm}`;
  const city = zone === "UTC" ? "UTC" : (zone.split("/").pop() ?? zone).replace(/_/g, " ");
  return `${offset}  ${city}`;
}

/**
 * The full list, ordered west to east. Offsets are read at `at`, so a list
 * built in July and one built in January differ where DST applies — which is
 * correct, and why the result is not cached across requests.
 */
export function timezoneOptions(at: Date = new Date()): TimezoneOption[] {
  return TIMEZONES.map((zone) => ({ zone, mins: offsetMinutes(zone, at), text: label(zone, at) }))
    .sort((a, b) => a.mins - b.mins || a.text.localeCompare(b.text))
    .map(({ zone, text }) => ({ value: zone, label: text }));
}

export function timezoneLabel(zone: string, at: Date = new Date()): string {
  return TIMEZONES.includes(zone as (typeof TIMEZONES)[number]) ? label(zone, at) : zone;
}

/** The visitor's own zone, falling back to UTC where Intl cannot say. */
export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** The nearest zone we offer, so a detected zone outside the list still lands somewhere sensible. */
export function nearestSupportedTimezone(zone: string, at: Date = new Date()): string {
  if (TIMEZONES.includes(zone as (typeof TIMEZONES)[number])) return zone;
  const target = offsetMinutes(zone, at);
  let best = "UTC";
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const candidate of TIMEZONES) {
    const delta = Math.abs(offsetMinutes(candidate, at) - target);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = candidate;
    }
  }
  return best;
}
