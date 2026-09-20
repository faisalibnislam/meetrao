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
