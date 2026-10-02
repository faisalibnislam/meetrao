import type { MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { uuid } from "./ids";

/* ─────────────────────────────────────────────────────────────────────────────
   The triggers.

   Seventeen of them fired in Postgres without anyone asking. Convex has no
   triggers, so each one is a function here and every mutation that used to
   cause one must call it explicitly. A missed call is a silent data bug (the
   row simply never appears) which is why they all live in one file rather
   than being inlined at their call sites.

   Checklist, against docs/convex-migration.md §1.10:

     on_auth_user_created          → convex/auth.ts afterUserCreatedOrUpdated
     *_touch_updated_at (×6)       → every patch here sets updated_at
     profiles_reject_reserved_...  → profiles.setUsername / generateUsername
     bookings_notify_created       → notifyBookingCreated
     bookings_notify_changed       → notifyBookingChanged
     bookings_make_contact         → upsertContact
     booking_invitees_make_contact → upsertContact
     bookings_log_created          → logActivity("booking_created")
     bookings_log_cancelled        → logActivity("booking_cancelled")
     meeting_types_log_created     → logActivity("meeting_type_created")
     calendar_connections_log_...  → logActivity("calendar_connected")
   ───────────────────────────────────────────────────────────────────────────── */

/** public.local_when, the host's wall clock, formatted as the emails write it. */
export function localWhen(atMs: number, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone || "UTC",
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(new Date(atMs));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const ampm = get("dayPeriod").toUpperCase();
  return `${get("weekday")} ${get("day")} ${get("month")}, ${get("hour")}:${get("minute")} ${ampm}`;
}

/**
 * Posts one booking event to the host's registered endpoints.
 *
 * Scheduled rather than awaited: a mutation cannot make a network call, and
 * a booking must not wait on somebody's server to be written. runAfter(0)
 * means "once this transaction commits", which is also the guarantee a
 * receiver needs. It can call the API the moment it hears, and the booking
 * will be there.
 *
 * Raised from the same place the notification is written, so a path that
 * forgets one forgets both. A silent webhook nobody notices is worse than a
 * missing notification somebody does.
 */
async function emit(ctx: MutationCtx, booking: Doc<"bookings">, event: string): Promise<void> {
  await ctx.scheduler.runAfter(0, internal.webhooks.deliver, {
    userId: booking.host_id,
    event,
    payload: JSON.stringify({
      id: booking.id,
      reference: booking.reference,
      meeting_name: booking.meeting_name,
      duration_minutes: booking.duration_minutes,
      starts_at: new Date(booking.starts_at).toISOString(),
      ends_at: new Date(booking.ends_at).toISOString(),
      status: booking.status,
      guest_name: booking.guest_name,
      guest_email: booking.guest_email,
      guest_timezone: booking.guest_timezone,
      location: booking.location ?? "google_meet",
      location_detail: booking.location_detail ?? "",
      meet_url: booking.meet_url,
      answers: booking.answers ?? [],
    }),
  });
}

/** public.notify_host. */
export async function notifyHost(
  ctx: MutationCtx,
  args: {
    userId: string;
    kind: "booking_new" | "booking_cancelled" | "booking_changed" | "booking_declined";
    title: string;
    body: string;
    bookingId: string | null;
  },
): Promise<void> {
  await ctx.db.insert("notifications", {
    id: uuid(),
    user_id: args.userId,
    kind: args.kind,
    title: args.title,
    body: args.body,
    booking_id: args.bookingId,
    read_at: null,
    created_at: Date.now(),
  });
}

async function timezoneOf(ctx: MutationCtx, userId: string): Promise<string> {
  const p = await ctx.db
    .query("profiles")
    .withIndex("by_uuid", (q) => q.eq("id", userId))
    .unique();
  return p?.timezone ?? "UTC";
}

/** bookings_notify_created. Host-created bookings are not news to the host. */
export async function notifyBookingCreated(ctx: MutationCtx, booking: Doc<"bookings">): Promise<void> {
  /* The webhook fires for a host-created booking too, unlike the
     notification: the host knows they made it, but an integration watching
     the account does not. */
  await emit(ctx, booking, "booking.created");
  if (booking.host_created) return;
  await notifyHost(ctx, {
    userId: booking.host_id,
    kind: "booking_new",
    title: `${booking.guest_name} booked ${booking.meeting_name}`,
    body: localWhen(booking.starts_at, await timezoneOf(ctx, booking.host_id)),
    bookingId: booking.id,
  });
}

/**
 * bookings_notify_changed, the other half, fired when a booking MOVES.
 *
 * The kind, the schema's union and the screen's "Moved" row all existed from
 * the port; nothing wrote one, because nothing could move a booking. It reads
 * as both times because "moved" without the old time is not news the host can
 * act on.
 *
 * A move the host made themselves raises nothing, for the same reason a
 * host-created booking raises nothing: they already know.
 */
export async function notifyBookingChanged(
  ctx: MutationCtx,
  booking: Doc<"bookings">,
  args: { oldStartsAt: number; byHost: boolean },
): Promise<void> {
  await emit(ctx, booking, "booking.changed");
  if (args.byHost) return;
  const zone = await timezoneOf(ctx, booking.host_id);
  await notifyHost(ctx, {
    userId: booking.host_id,
    kind: "booking_changed",
    title: `${booking.guest_name} moved ${booking.meeting_name}`,
    body: `${localWhen(args.oldStartsAt, zone)} → ${localWhen(booking.starts_at, zone)}`,
    bookingId: booking.id,
  });
}

/** bookings_notify_changed, fires on a status change to cancelled. */
export async function notifyBookingCancelled(ctx: MutationCtx, booking: Doc<"bookings">): Promise<void> {
  await emit(ctx, booking, "booking.cancelled");
  await notifyHost(ctx, {
    userId: booking.host_id,
    kind: "booking_cancelled",
    title: `${booking.guest_name} cancelled ${booking.meeting_name}`,
    body: localWhen(booking.starts_at, await timezoneOf(ctx, booking.host_id)),
    bookingId: booking.id,
  });
}

/**
 * The guest said no in their own calendar.
 *
 * NOT a cancellation: the booking stands, the slot stays held, and the host
 * decides what to do. Declining in Google and cancelling through the link are
 * different acts and the host should be able to tell them apart, which is the
 * whole reason this notification exists rather than a silent column.
 */
export async function notifyBookingDeclined(ctx: MutationCtx, booking: Doc<"bookings">): Promise<void> {
  await notifyHost(ctx, {
    userId: booking.host_id,
    kind: "booking_declined",
    title: `${booking.guest_name} declined ${booking.meeting_name}`,
    body: localWhen(booking.starts_at, await timezoneOf(ctx, booking.host_id)),
    bookingId: booking.id,
  });
}

/**
 * public.upsert_contact, including its conflict rule: an existing contact keeps
 * the name it already has unless that name is blank.
 *
 * Postgres did this with ON CONFLICT on a unique index. There is no unique
 * index here, so the read-then-write is what enforces it, safe because the
 * whole mutation is serializable.
 */
export async function upsertContact(
  ctx: MutationCtx,
  args: { userId: string; name: string; email: string },
): Promise<void> {
  const email = args.email.trim().toLowerCase();
  if (!email) return;
  const name = (args.name ?? "").trim();
  const now = Date.now();

  const existing = await ctx.db
    .query("contacts")
    .withIndex("by_user_email", (q) => q.eq("user_id", args.userId).eq("email", email))
    .unique();

  if (existing) {
    await ctx.db.patch(existing._id, {
      name: existing.name.trim() === "" ? name : existing.name,
      updated_at: now,
    });
    return;
  }

  await ctx.db.insert("contacts", {
    id: uuid(),
    user_id: args.userId,
    name,
    email,
    phone: "",
    company: "",
    notes: "",
    source: "booking",
    created_at: now,
    updated_at: now,
  });
}

/** The four log_* triggers, which all wrote one admin_activity row. */
export async function logActivity(
  ctx: MutationCtx,
  args: { actorId: string | null; kind: string; summary: string },
): Promise<void> {
  await ctx.db.insert("admin_activity", {
    id: uuid(),
    actor_id: args.actorId,
    kind: args.kind,
    summary: args.summary,
    created_at: Date.now(),
  });
}
