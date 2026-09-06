import "server-only";

import { createClient } from "@/lib/supabase/server";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  username: string;
  timezone: string;
  meetingCount: number;
  bookingCount: number;
  joined: string;
  suspended: boolean;
};

export type AdminBookingRow = {
  id: string;
  hostName: string;
  hostEmail: string;
  guestName: string;
  guestEmail: string;
  meetingName: string;
  durationMinutes: number;
  startsAt: string;
  endsAt: string;
  status: "confirmed" | "cancelled";
  meetUrl: string | null;
  reference: string;
  upcoming: boolean;
};

/**
 * Everything the admin console reads, in one pass. All of it runs under the
 * caller's own session — the platform-wide visibility comes from the
 * `*_select_admin` RLS policies, not from the service role.
 */
export async function loadAdminData() {
  const supabase = await createClient();
  const now = new Date();

  const [profilesRes, bookingsRes, typesRes, activityRes] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, full_name, email, username, timezone, created_at, is_suspended",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("bookings")
      .select("*")
      .order("starts_at", { ascending: false }),
    supabase.from("meeting_types").select("id, user_id, name, duration_minutes, is_active"),
    supabase
      .from("admin_activity")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const profiles = profilesRes.data ?? [];
  const bookings = bookingsRes.data ?? [];
  const types = typesRes.data ?? [];
  const activity = activityRes.data ?? [];

  const byHost = new Map<string, number>();
  for (const b of bookings) {
    byHost.set(b.host_id, (byHost.get(b.host_id) ?? 0) + 1);
  }
  const typesByHost = new Map<string, number>();
  for (const t of types) {
    typesByHost.set(t.user_id, (typesByHost.get(t.user_id) ?? 0) + 1);
  }

  const profileById = new Map(profiles.map((p) => [p.id, p]));

  const users: AdminUserRow[] = profiles.map((p) => ({
    id: p.id,
    name: p.full_name || p.username,
    email: p.email,
    username: p.username,
    timezone: p.timezone,
    meetingCount: typesByHost.get(p.id) ?? 0,
    bookingCount: byHost.get(p.id) ?? 0,
    joined: p.created_at,
    suspended: p.is_suspended,
  }));

  const bookingRows: AdminBookingRow[] = bookings.map((b) => {
    const host = profileById.get(b.host_id);
    return {
      id: b.id,
      hostName: host ? host.full_name || host.username : "Unknown",
      hostEmail: host?.email ?? "",
      guestName: b.guest_name,
      guestEmail: b.guest_email,
      meetingName: b.meeting_name,
      durationMinutes: b.duration_minutes,
      startsAt: b.starts_at,
      endsAt: b.ends_at,
      status: b.status,
      meetUrl: b.meet_url,
      reference: b.reference,
      upcoming: new Date(b.starts_at) >= now && b.status === "confirmed",
    };
  });

  return {
    users,
    bookings: bookingRows,
    types,
    activity,
    metrics: {
      totalUsers: profiles.length,
      totalBookings: bookings.length,
      upcoming: bookingRows.filter((b) => b.upcoming).length,
      meetings: types.length,
    },
  };
}
