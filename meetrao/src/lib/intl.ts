/* ─────────────────────────────────────────────────────────────────────────────
   Date formatters, built once per locale, options and zone.

   Constructing an Intl.DateTimeFormat costs about 22µs; formatting with one
   that exists costs about 0.4µs. Every formatter here used to be built fresh
   per call, which is invisible for one date and is most of the work for a
   list: the company dashboard spent ~170ms of server time building formatters
   for a 90-day window of 3,000 bookings.

   The cache is unbounded on purpose. Its keys are a handful of option shapes
   times the time zones somebody actually uses, a few hundred entries at most,
   and a formatter is immutable, so sharing one across requests is safe.
   ───────────────────────────────────────────────────────────────────────────── */

const formatters = new Map<string, Intl.DateTimeFormat>();

export function dateFormat(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    formatters.set(key, formatter);
  }
  return formatter;
}
