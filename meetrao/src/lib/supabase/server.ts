import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/lib/env";

/**
 * Request-scoped Supabase client carrying the caller's session. Every query
 * through it is subject to RLS, which is the point: a host reads only their
 * own rows, an admin reads everything, and neither is decided in application
 * code.
 */
export async function supabaseServer() {
  // cookies() first, and not by accident. Every caller of this is a per-request
  // page, and awaiting cookies() is what tells Next to render it dynamically.
  // Read the environment first instead and a missing variable throws during
  // static prerendering, before the bailout — which fails the whole build with
  // a prerender error pointing at a page, rather than at the variable.
  const store = await cookies();
  const { url, key } = publicEnv();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(list) {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Called from a Server Component, where cookies are read-only. The
          // proxy refreshes the session on every request, so this is safe to
          // swallow.
        }
      },
    },
  });
}
