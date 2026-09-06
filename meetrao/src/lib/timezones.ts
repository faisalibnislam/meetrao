/**
 * The 94 IANA zones the design ships with, in the source's order. Labels are
 * computed at runtime from `Intl.DateTimeFormat` with `timeZoneName:
 * 'shortOffset'`, so they follow DST rather than baking in a fixed offset.
 *
 * Rendered as `GMT±HH:MM  City`, sorted by current UTC offset — matching
 * Meetrao.dc.html's tzOptionList().
 */

export const TIMEZONES = [
  "Pacific/Midway",
  "Pacific/Honolulu",
  "America/Anchorage",
  "America/Los_Angeles",
  "America/Vancouver",
  "America/Tijuana",
  "America/Denver",
  "America/Phoenix",
  "America/Edmonton",
  "America/Chicago",
  "America/Mexico_City",
  "America/Winnipeg",
  "America/Guatemala",
  "America/Bogota",
  "America/Lima",
  "America/New_York",
  "America/Toronto",
  "America/Panama",
  "America/Halifax",
  "America/Santiago",
  "America/Caracas",
  "America/Sao_Paulo",
  "America/Argentina/Buenos_Aires",
  "America/Montevideo",
  "Atlantic/South_Georgia",
  "Atlantic/Azores",
  "Atlantic/Cape_Verde",
  "UTC",
  "Europe/London",
  "Europe/Dublin",
  "Europe/Lisbon",
  "Africa/Casablanca",
  "Africa/Lagos",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Amsterdam",
  "Europe/Brussels",
  "Europe/Zurich",
  "Europe/Vienna",
  "Europe/Prague",
  "Europe/Warsaw",
  "Europe/Stockholm",
  "Europe/Oslo",
  "Europe/Copenhagen",
  "Europe/Budapest",
  "Africa/Johannesburg",
  "Africa/Cairo",
  "Europe/Athens",
  "Europe/Helsinki",
  "Europe/Bucharest",
  "Europe/Kyiv",
  "Europe/Istanbul",
  "Asia/Jerusalem",
  "Africa/Nairobi",
  "Europe/Moscow",
  "Asia/Riyadh",
  "Asia/Baghdad",
  "Asia/Tehran",
  "Asia/Dubai",
  "Asia/Baku",
  "Asia/Kabul",
  "Asia/Karachi",
  "Asia/Tashkent",
  "Asia/Kolkata",
  "Asia/Colombo",
  "Asia/Kathmandu",
  "Asia/Dhaka",
  "Asia/Almaty",
  "Asia/Yangon",
  "Asia/Bangkok",
  "Asia/Jakarta",
  "Asia/Ho_Chi_Minh",
  "Asia/Shanghai",
  "Asia/Hong_Kong",
  "Asia/Singapore",
  "Asia/Kuala_Lumpur",
  "Asia/Manila",
  "Asia/Taipei",
  "Australia/Perth",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Adelaide",
  "Australia/Darwin",
  "Australia/Brisbane",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Pacific/Guam",
  "Pacific/Noumea",
  "Pacific/Auckland",
  "Pacific/Fiji",
  "Pacific/Tongatapu",
  "Pacific/Kiritimati",] as const;

export type TimezoneOption = { value: string; label: string };

/** Minutes east of UTC for `zone` at `at`. Negative west of UTC. */
export function zoneOffsetMinutes(zone: string, at: Date = new Date()): number {
  let raw = "GMT";
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      timeZoneName: "shortOffset",
    }).formatToParts(at);
    raw = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  } catch {
    return 0;
  }

  const m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(raw);
  if (!m) return 0;

  const sign = m[1] === "-" ? -1 : 1;
  const hours = Number.parseInt(m[2], 10);
  const minutes = m[3] ? Number.parseInt(m[3], 10) : 0;
  return sign * (hours * 60 + minutes);
}

/** "GMT+06:00" — uses a true minus sign, as the source does. */
export function formatOffset(offsetMinutes: number): string {
  if (offsetMinutes === 0) return "GMT+00:00";
  const sign = offsetMinutes < 0 ? "−" : "+";
  const abs = Math.abs(offsetMinutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `GMT${sign}${hh}:${mm}`;
}

function cityOf(zone: string): string {
  if (zone === "UTC") return "UTC";
  return (zone.split("/").pop() ?? zone).replace(/_/g, " ");
}

/** All zones as select options, sorted by current offset then label. */
export function timezoneOptions(at: Date = new Date()): TimezoneOption[] {
  return TIMEZONES.map((zone) => {
    const offset = zoneOffsetMinutes(zone, at);
    return {
      value: zone,
      label: `${formatOffset(offset)}  ${cityOf(zone)}`,
      offset,
    };
  })
    .sort((a, b) => a.offset - b.offset || a.label.localeCompare(b.label))
    .map(({ value, label }) => ({ value, label }));
}

/**
 * Label for a single zone. Falls back to the raw identifier so a profile that
 * somehow holds a zone outside the list still renders something truthful.
 */
export function timezoneLabel(zone: string, at: Date = new Date()): string {
  if (!zone) return "";
  const offset = zoneOffsetMinutes(zone, at);
  return `${formatOffset(offset)}  ${cityOf(zone)}`;
}

/** The browser's zone, or UTC when it cannot be determined. */
export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
