import { Sidebar, type BookingLink, type NavItem } from "@/components/app/sidebar";
import { signOut } from "@/lib/actions/auth";
import { unreadNotifications } from "@/lib/data/notifications";
import { convexServer } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { workspaceLinks } from "@/lib/workspace-links";
import { placeOf } from "@/lib/data/links";
import type { Profile } from "@/lib/types";
import { isPaid } from "@/convex/lib/plan";
import { activeContext, contextChoices } from "@/lib/data/context";
import { ownMeetings, ownPlan } from "@/lib/data/own";

/* The app shell: 218px sidebar beside a column that owns its own header and
   scroll area. Built once, the prototypes duplicate their chrome because the
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

  // Four reads, in parallel, for chrome that is on every screen: the Bookings
  // badge, the rail's link list, the unread count on Notifications, and the
  // plan, which decides only whether the rail carries an upgrade button.
  const [count, meetingRows, unread, plan, contexts, context] = await Promise.all([
    convex.query(api.bookings.upcomingCount, {}),
    ownMeetings(),
    unreadNotifications(profile.id),
    ownPlan(),
    contextChoices(),
    activeContext(),
  ]);

  const active = meetingRows.filter((m) => m.is_active);

  /* THE WORKSPACE IN FORCE, and only it. The rail used to list every active
     meeting whatever workspace you were standing in, so somebody in Personal
     was handed their company's links and somebody in a company was handed
     their own. A company and the people in it are different things with
     different links; mixing them here made the rail disagree with the
     Meetings screen, which has always been scoped.

     Mirrors CopyLinkControl: one row per active meeting, and nothing else.
     There used to be an "All meetings" row pointing at meetrao.com/<username>.
     That address listed somebody's meetings and no longer exists, so the rail
     would have been handing out a link to a 404. */
  const here = contexts.find((c) => c.id === context.companyId) ?? null;
  const links: BookingLink[] = workspaceLinks(active, placeOf(here), profile.username);

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
        showUpgrade={!isPaid(plan.plan)}
        contexts={contexts}
        activeContextId={context.companyId}
        links={links}
        onSignOut={signOut}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-ground">{children}</div>
    </div>
  );
}
