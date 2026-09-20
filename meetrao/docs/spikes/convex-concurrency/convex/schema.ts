import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  bookings: defineTable({
    hostId: v.string(),
    startsAt: v.number(),
    endsAt: v.number(),
    status: v.union(v.literal("confirmed"), v.literal("cancelled")),
    guestEmail: v.string(),
    reference: v.string(),
  }).index("by_host_starts", ["hostId", "startsAt"]),
});
