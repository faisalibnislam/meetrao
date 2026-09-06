/**
 * Errors shared between the server-only calendar code and the message mapping
 * that renders for the host.
 *
 * This module is deliberately free of `server-only`: `failure.ts` is imported
 * by client components, and it needs to recognise these types.
 */

/**
 * Writing the Google tokens to `calendar_connections` failed.
 *
 * `code` is supabase-js's own error code — a PostgREST code like PGRST204, a
 * Postgres SQLSTATE like 42501, or "network" when the request never left the
 * process (supabase-js reports a failed fetch as an error value rather than
 * throwing, so the two are otherwise indistinguishable from the outside).
 *
 * It is carried separately from the message because the code is a short, safe
 * token that can go in a URL, and the message can contain anything at all.
 */
export class CalendarStoreError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "CalendarStoreError";
    this.code = code;
  }
}
