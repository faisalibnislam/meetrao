import { Sidebar, type NavItem } from "@/components/app/sidebar";
import { signOut } from "@/lib/actions/auth";
import { supabaseServer } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/* The app shell: 218px sidebar beside a column that owns its own header and
   scroll area. Built once — the prototypes duplicate their chrome because the
   design tool has no layout primitive, which is not a pattern to copy.

   A component rather than only a layout, because /support is reachable both
   signed in and signed out and so cannot live under the (app) route group.
   It wears this when there is a session and the marketing chrome when not. */

export async function AppShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const supabase = await supabaseServer();

  const { count } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("host_id", profile.id)
    .eq("status", "confirmed")
    .gte("starts_at", new Date().toISOString());

  const items: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: "house" },
    { href: "/bookings", label: "Bookings", icon: "calendar", count: count || null },
    { href: "/meetings", label: "Meetings", icon: "list" },
    { href: "/availability", label: "Availability", icon: "clock" },
  ];

  return (
    <div className="flex h-screen items-stretch overflow-hidden max-[820px]:flex-col">
      <Sidebar
        items={items}
        name={profile.full_name || profile.username}
        email={profile.email}
        avatarUrl={profile.avatar_url}
        isAdmin={false}
        onSignOut={signOut}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-ground">{children}</div>
    </div>
  );
}
