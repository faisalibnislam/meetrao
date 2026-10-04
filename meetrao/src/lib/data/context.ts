import "server-only";
import { cookies } from "next/headers";
import { convexServer } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";

/* ─────────────────────────────────────────────────────────────────────────────
   Which company you are working in.

   A cookie, not a URL segment. Every screen in the app would otherwise need
   the company in its path, which is a routing change across the whole product
   to express a preference that belongs to the person rather than to the page.

   THE COOKIE IS A PREFERENCE, NOT A PERMISSION. It is read, then checked
   against the caller's actual memberships, and anything that does not match
   falls back to personal. A forged cookie therefore selects a context the
   person is already in, or none, and never grants access to a company they
   are not a member of.

   Personal is the default and is always available: it is where somebody's own
   meetrao.com links live, and an account with no companies has nothing else.
   ───────────────────────────────────────────────────────────────────────────── */

export const CONTEXT_COOKIE = "mr_context";

export type WorkContext = {
  /** null means personal: the account's own meetrao.com links. */
  companyId: string | null;
  name: string;
};

export type ContextChoice = {
  id: string | null;
  name: string;
  /** A company's own square mark, for the workspace menu. Null for Personal,
      which wears the person's photograph instead. */
  avatarUrl: string | null;
  /** Its accent, used to tint the fallback initial when there is no logo. */
  color: string | null;
  /* Everything a LINK in this workspace is built from. Null for Personal,
     whose links are built from the account's own username. A company's links
     are not its members' links, so the two cannot share a builder. */
  slug: string | null;
  domain: string | null;
  domainVerified: boolean;
  /** The caller's own handle on this company. */
  handle: string | null;
};

/**
 * Every context this account may work in, personal first.
 *
 * Includes companies somebody was ADDED to, not only ones they own: being in
 * a company is what gives you a page on its domain, so it has to be somewhere
 * you can switch to.
 */
export async function contextChoices(): Promise<ContextChoice[]> {
  const convex = await convexServer();
  const data = await convex.query(api.companies.mine, {});
  return [
    {
      id: null,
      name: "Personal",
      avatarUrl: null,
      color: null,
      slug: null,
      domain: null,
      domainVerified: false,
      handle: null,
    },
    ...data.companies.map((c) => ({
      id: c.id,
      name: c.name,
      avatarUrl: c.avatar_url,
      color: c.brand_color,
      slug: c.slug,
      domain: c.domain,
      domainVerified: c.domain_verified,
      handle: c.handle,
    })),
  ];
}

/** The context in force, after checking the cookie against real memberships. */
export async function activeContext(): Promise<WorkContext> {
  const jar = await cookies();
  const wanted = jar.get(CONTEXT_COOKIE)?.value ?? null;
  if (!wanted) return { companyId: null, name: "Personal" };

  const choices = await contextChoices();
  const found = choices.find((c) => c.id === wanted);
  // A cookie naming a company they are not in reads as personal, not as an error.
  return found && found.id ? { companyId: found.id, name: found.name } : { companyId: null, name: "Personal" };
}
