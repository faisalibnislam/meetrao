/* The zone list, mirrored from src/lib/timezones.ts.

   Convex functions cannot import from src/ (different tsconfig root and
   bundle), so this is a copy. If the app gains a zone, add it here too,
   src/lib/timezones.test.ts is the reminder that they must agree. */
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

export function supportedZoneOrNull(value: string | null | undefined): string | null {
  if (!value) return null;
  return (TIMEZONES as readonly string[]).includes(value) ? value : null;
}
