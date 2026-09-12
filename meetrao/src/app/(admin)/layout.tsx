import { Sidebar, type NavItem } from "@/components/app/sidebar";
import { signOut } from "@/lib/actions/auth";
import { requireAdmin } from "@/lib/data/session";

/* The admin console reuses the shell, with its own nav.
   Settings is a nav row here and is therefore NOT offered in the account menu —
   two identical adjacent rows, the second dropping the admin out of the
   console, is exactly the trap the design warns about. */

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAdmin();

  const items: NavItem[] = [
    { href: "/admin", label: "Dashboard", icon: "house", exact: true },
    { href: "/admin/users", label: "Users", icon: "users" },
    { href: "/admin/bookings", label: "Bookings", icon: "calendar" },
    { href: "/admin/analytics", label: "Analytics", icon: "chart-line" },
    { href: "/admin/settings", label: "Settings", icon: "gear" },
  ];

  return (
    <div className="flex h-screen items-stretch overflow-hidden max-[820px]:flex-col">
      <Sidebar
        items={items}
        name={profile.full_name || profile.username}
        email={profile.email}
        avatarUrl={profile.avatar_url}
        isAdmin
        onSignOut={signOut}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-ground">{children}</div>
    </div>
  );
}
