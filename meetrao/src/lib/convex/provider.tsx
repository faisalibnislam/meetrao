"use client";

import { useCallback, useMemo } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithAuth } from "convex/react";
import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { supabaseBrowser } from "@/lib/supabase/client";

/* The browser half of the same bridge. Convex asks for a token whenever it
   needs one; @supabase/ssr owns refresh, so this just hands over whatever the
   current session holds and lets Convex re-ask after an expiry. */

function useSupabaseAuth() {
  const supabase = useMemo(() => supabaseBrowser(), []);

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      if (forceRefreshToken) {
        const { data } = await supabase.auth.refreshSession();
        return data.session?.access_token ?? null;
      }
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    },
    [supabase],
  );

  // Convex re-reads this; the provider below remounts on sign-in/out because
  // the app's layout re-renders with a new session.
  return useMemo(
    () => ({ isLoading: false, isAuthenticated: true as boolean, fetchAccessToken }),
    [fetchAccessToken],
  );
}

let cached: ConvexReactClient | null = null;
function client() {
  if (!cached) cached = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  return cached;
}

/**
 * Which provider wraps the app is the `auth` domain's decision, and it is made
 * on the SERVER — `convexAuth` is passed down rather than read from a
 * NEXT_PUBLIC variable, so the browser cannot disagree with the backend about
 * who issues the session.
 *
 * Under Convex Auth the token and its refresh belong to
 * ConvexAuthNextjsProvider; under Supabase they belong to @supabase/ssr and
 * `useSupabaseAuth` above hands them over.
 */
export function ConvexClientProvider({
  children,
  convexAuth,
}: {
  children: React.ReactNode;
  convexAuth: boolean;
}) {
  if (convexAuth) {
    return <ConvexAuthNextjsProvider client={client()}>{children}</ConvexAuthNextjsProvider>;
  }
  return (
    <ConvexProviderWithAuth client={client()} useAuth={useSupabaseAuth}>
      {children}
    </ConvexProviderWithAuth>
  );
}
