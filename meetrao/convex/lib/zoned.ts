/** The host's local weekday and minute-of-day for an instant — the same two
 *  values create_booking derived with `at time zone` + `extract`. */
export function zonedWeekdayMinute(atMs: number, timeZone: string): { weekday: number; minute: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timeZone || "UTC",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date(atMs));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekday = days.indexOf(get("weekday"));
  const hour = Number(get("hour")) % 24;
  return { weekday, minute: hour * 60 + Number(get("minute")) };
}

/** The host's own calendar date for an instant: "2026-12-25".
 *
 *  A date override is a claim about a day in the host's calendar, so the
 *  booking door has to ask which of the host's days an instant falls on.
 *  en-CA because it formats as YYYY-MM-DD, which is the key the overrides
 *  table and the slot engine both use. */
export function zonedDateKey(atMs: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZone || "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(atMs));
}
