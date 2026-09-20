import type { Doc } from "../_generated/dataModel";

/* Convex rows carry `_id` and `_creationTime` and store instants as epoch
   milliseconds. The application's types (src/lib/types.ts) expect neither, and
   expect ISO strings. Everything leaving Convex goes through here, so the app
   layer keeps the shape it already had. */

export const iso = (ms: number): string => new Date(ms).toISOString();
export const isoOrNull = (ms: number | null): string | null => (ms === null ? null : iso(ms));
export const msOrNull = (s: string | null | undefined): number | null =>
  s === null || s === undefined ? null : Date.parse(s);

/** Strips Convex bookkeeping. Never hand a raw Doc to the application. */
function bare<T extends { _id: unknown; _creationTime: unknown }>(doc: T) {
  const { _id, _creationTime, ...rest } = doc;
  void _id;
  void _creationTime;
  return rest;
}

export function profileOut(d: Doc<"profiles">) {
  const { username_lower, welcomed_at, created_at, updated_at, onboarding_completed_at, ...rest } = bare(d);
  void username_lower;
  return {
    ...rest,
    onboarding_completed_at: isoOrNull(onboarding_completed_at),
    welcomed_at: isoOrNull(welcomed_at),
    created_at: iso(created_at),
    updated_at: iso(updated_at),
  };
}

export function meetingTypeOut(d: Doc<"meeting_types">) {
  const { created_at, updated_at, ...rest } = bare(d);
  return { ...rest, created_at: iso(created_at), updated_at: iso(updated_at) };
}

export function scheduleOut(d: Doc<"availability_schedules">) {
  const { created_at, updated_at, ...rest } = bare(d);
  return { ...rest, created_at: iso(created_at), updated_at: iso(updated_at) };
}

export function ruleOut(d: Doc<"availability_rules">) {
  const { created_at, ...rest } = bare(d);
  return { ...rest, created_at: iso(created_at) };
}

export function bookingOut(d: Doc<"bookings">) {
  const { starts_at, ends_at, cancelled_at, created_at, updated_at, guest_rsvp_synced_at, guest_rsvp_notified_at, ...rest } =
    bare(d);
  return {
    ...rest,
    starts_at: iso(starts_at),
    ends_at: iso(ends_at),
    cancelled_at: isoOrNull(cancelled_at),
    guest_rsvp_synced_at: isoOrNull(guest_rsvp_synced_at),
    guest_rsvp_notified_at: isoOrNull(guest_rsvp_notified_at),
    created_at: iso(created_at),
    updated_at: iso(updated_at),
  };
}

export function inviteeOut(d: Doc<"booking_invitees">) {
  const { created_at, ...rest } = bare(d);
  return { ...rest, created_at: iso(created_at) };
}

export function contactOut(d: Doc<"contacts">) {
  const { created_at, updated_at, ...rest } = bare(d);
  return { ...rest, created_at: iso(created_at), updated_at: iso(updated_at) };
}

export function notificationOut(d: Doc<"notifications">) {
  const { created_at, read_at, ...rest } = bare(d);
  return { ...rest, created_at: iso(created_at), read_at: isoOrNull(read_at) };
}

export function connectionOut(d: Doc<"calendar_connections">) {
  const { created_at, updated_at, token_expires_at, last_error_at, ...rest } = bare(d);
  return {
    ...rest,
    token_expires_at: isoOrNull(token_expires_at),
    last_error_at: isoOrNull(last_error_at),
    created_at: iso(created_at),
    updated_at: iso(updated_at),
  };
}

export function activityOut(d: Doc<"admin_activity">) {
  const { created_at, ...rest } = bare(d);
  return { ...rest, created_at: iso(created_at) };
}
