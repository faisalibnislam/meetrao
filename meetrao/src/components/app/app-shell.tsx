import { Sidebar, type BookingLink, type NavItem } from "@/components/app/sidebar";
import { signOut } from "@/lib/actions/auth";
import { unreadNotifications } from "@/lib/data/notifications";
import { convexServer } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { bookingLink } from "@/lib/username";
import type { MeetingType, Profile } from "@/lib/types";

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
  const convex = await convexServer();

  // Three reads, in parallel, for chrome that is on every screen: the Bookings
  // badge, the rail's link list, and the unread count on Notifications.
  const [count, meetingRows, unread] = await Promise.all([
    convex.query(api.bookings.upcomingCount, {}),
    convex.query(api.meetingTypes.listOwn, { activeOnly: true }),
    unreadNotifications(profile.id),
  ]);

  const active = meetingRows as Pick<MeetingType, "id" | "name" | "slug">[];

  // Mirrors CopyLinkControl: the account link that offers every type, then one
  // row per meeting. With nothing active the rail shows the account link alone,
  // the same way the header control collapses to a single button.
  const links: BookingLink[] = [
    { id: "all", name: active.length > 1 ? "All meetings" : "Your booking page", link: bookingLink(profile.username) },
    ...active.map((m) => ({ id: m.id, name: m.name, link: bookingLink(profile.username, m.slug) })),
  ];

  const items: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: "house" },
    { href: "/bookings", label: "Bookings", icon: "calendar", count: count || null },
    { href: "/meetings", label: "Meetings", icon: "list" },
    { href: "/contacts", label: "Contacts", icon: "users" },
    { href: "/notifications", label: "Notifications", icon: "circle-info", count: unread || null },
    { href: "/availability", label: "Availability", icon: "clock" },
  ];

  return (
    <div className="app-scale flex h-screen items-stretch overflow-hidden max-[820px]:flex-col">
      <Sidebar
        items={items}
        name={profile.full_name || profile.username}
        email={profile.email}
        avatarUrl={profile.avatar_url}
        isAdmin={false}
        links={links}
        onSignOut={signOut}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-ground">{children}</div>
    </div>
  );
}
