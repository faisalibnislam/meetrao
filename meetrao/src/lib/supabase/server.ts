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
  const { url, key } = publicEnv();
  const store = await cookies();

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
