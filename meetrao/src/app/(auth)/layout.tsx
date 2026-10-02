import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ConvexClientProvider } from "@/lib/convex/provider";

/* ─────────────────────────────────────────────────────────────────────────────
   The only subtree that mounts the Convex auth provider.

   IT IS HERE AND NOT AT THE ROOT, and that is load-bearing.
   `ConvexAuthNextjsServerProvider` is an async Server Component that reads the
   session cookie, so every page beneath it is dynamic. At the root that meant
   all six marketing pages, including the landing page, whose static rendering
   the whole of components/marketing/site-account-live.tsx exists to protect.

   Four of the six pages in this group need it (login, signup, forgot and
   reset) because their forms call `useAuthActions`: Convex Auth has no
   server-side `signIn`, and the session cookie is written in the browser.
   /verify and /suspended do not, and get it only because a layout cannot be
   selective. That costs nothing: both were already dynamic, and so were the
   other four, which read search params.

   Every OTHER screen in the app talks to Convex from the SERVER through
   lib/convex/server.ts, which reads the cookie directly. None of them needs a
   provider, which is why this group is the only place one appears.

   Both halves are required. The client provider alone throws, `useAuth()`
   comes back undefined with nothing above it to supply the state.
   ───────────────────────────────────────────────────────────────────────────── */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexAuthNextjsServerProvider>
      <ConvexClientProvider>{children}</ConvexClientProvider>
    </ConvexAuthNextjsServerProvider>
  );
}
