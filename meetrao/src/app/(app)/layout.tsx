import { AppShell } from "@/components/app/app-shell";
import { requireOnboardedSession } from "@/lib/data/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireOnboardedSession();
  return <AppShell profile={profile}>{children}</AppShell>;
}
