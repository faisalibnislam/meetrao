"use client";

import { useCallback, useMemo } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithAuth } from "convex/react";
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

export function ConvexClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProviderWithAuth client={client()} useAuth={useSupabaseAuth}>
      {children}
    </ConvexProviderWithAuth>
  );
}
