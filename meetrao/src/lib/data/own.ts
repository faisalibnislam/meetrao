import "server-only";

import { cache } from "react";
import { convexServer } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import type { MeetingType } from "@/lib/types";

/* ─────────────────────────────────────────────────────────────────────────────
   Reads the shell and the page both make, made once per request.

   The rail lists the active meetings and shows an upgrade button by plan; the
   Dashboard, Meetings, Bookings and Settings pages read the same rows again
   for themselves. Each pair ran in parallel, so the second cost no time, but
   it was a second Convex call on every page view.

   For rendering only. React's cache lives for one request, and a server
   action that writes and then reads through here would be handed what the
   request saw before its own write.
   ───────────────────────────────────────────────────────────────────────────── */

/** Every meeting the account has, oldest first. Filter for active or scope. */
export const ownMeetings = cache(async function ownMeetings(): Promise<MeetingType[]> {
  const convex = await convexServer();
  return (await convex.query(api.meetingTypes.listOwn, {})) as unknown as MeetingType[];
});

/** The signed-in host's plan, as billing.mine reports it. */
export const ownPlan = cache(async function ownPlan() {
  const convex = await convexServer();
  return await convex.query(api.billing.mine, {});
});
