import "server-only";

import { convexServer } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { summarise, type AnalyticsBooking, type AnalyticsMember, type CompanyAnalytics } from "@/lib/company-analytics";

/* The rows come from Convex, the numbers are worked out here. The split is in
   convex/companyAnalytics.ts: every bucket on this screen is a day or an hour
   in the VIEWER's timezone, and that is a question for Intl in Node rather
   than for the database. */

export type CompanyDashboard = CompanyAnalytics & { companyName: string };

export async function companyAnalytics(
  companyId: string,
  timezone: string,
  days = 30,
): Promise<CompanyDashboard> {
  const convex = await convexServer();
  const data = await convex.query(api.companyAnalytics.forCompany, { id: companyId, days });

  const bookings: AnalyticsBooking[] = data.bookings.map((b) => ({
    hostId: b.host_id,
    startsAt: b.starts_at,
    endsAt: b.ends_at,
    durationMinutes: b.duration_minutes,
    status: b.status,
    cancelledBy: b.cancelled_by,
    meetingName: b.meeting_name,
    guestName: b.guest_name,
    guestEmail: b.guest_email,
    createdAt: b.created_at,
  }));

  const members: AnalyticsMember[] = data.members.map((m) => ({
    userId: m.user_id,
    name: m.name,
    handle: m.handle,
    role: m.role,
    activeLinks: m.active_links,
  }));

  /* `now` comes from the query rather than from here so that the window the
     rows were read for and the window they are counted in are the same one. */
  return {
    ...summarise(bookings, members, { now: data.now, timezone, days: data.days }),
    companyName: data.company_name,
  };
}
