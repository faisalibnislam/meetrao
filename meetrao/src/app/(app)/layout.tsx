import { AppShell } from "@/components/app/app-shell";
import { requireOnboardedSession } from "@/lib/data/session";
import { contextChoices } from "@/lib/data/context";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  /* Started BEFORE the session is awaited, not after. Both need only the auth
     cookie, and everything below waits on both, so asking one and then the
     other put a full database round trip in sequence in front of every page
     in a company workspace. Cached per request, so the rail, the page and
     the loaders all share this one call.

     The catch is for a signed-out visitor, whose companies query refuses: the
     session below redirects them, and a rejected prefetch must not turn that
     redirect into an error page. */
  contextChoices().catch(() => {});
  const { profile } = await requireOnboardedSession();
  return <AppShell profile={profile}>{children}</AppShell>;
}
