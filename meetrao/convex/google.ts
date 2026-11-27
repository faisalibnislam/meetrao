import { action } from "./_generated/server";
import { v } from "convex/values";

/* TEMPORARY deploy shim (2026-11-27), never committed. The live site still
   calls these until Vercel builds the new main; they answer "no calendar"
   so booking keeps working. Removed by the next Convex deploy. */
export const busyForHost = action({
  args: { hostId: v.string(), from: v.number(), to: v.number(), secret: v.optional(v.string()) },
  handler: async () => ({ busy: [] as { start: number; end: number }[], checked: false }),
});
export const createEventForBooking = action({
  args: { reference: v.string() },
  handler: async () => ({ ok: false as const, reason: "not-connected" }),
});
export const updateEventForBooking = action({
  args: { reference: v.string() },
  handler: async () => ({ ok: false as const, reason: "no-event" }),
});
export const deleteEventForBooking = action({
  args: { reference: v.string() },
  handler: async () => ({ ok: true }),
});
export const disconnectFor = action({
  args: { userId: v.string() },
  handler: async () => ({ ok: true as const, revoked: "nothing-to-revoke" }),
});
export const disconnect = action({ args: {}, handler: async () => ({ ok: true as const, revoked: "nothing-to-revoke" }) });
