import { ADMIN_NAV, Sidebar } from "@/components/app/sidebar";
import { requireAdmin } from "@/lib/data/host";
import { initialsOf } from "@/lib/initials";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAdmin();
  const displayName = profile.full_name || profile.username;

  return (
    <div className="flex h-dvh flex-col overflow-hidden md:flex-row md:items-stretch">
      <Sidebar
        items={ADMIN_NAV}
        isAdmin
        name={displayName}
        email={profile.email}
        initials={initialsOf(displayName)}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-ground">
        {children}
      </div>
    </div>
  );
}
