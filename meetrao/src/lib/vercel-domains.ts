import "server-only";

import { env } from "@/lib/env";

/* ─────────────────────────────────────────────────────────────────────────────
   Attaching a host's own domain to this Vercel project.

   Three steps, and the host does the middle one: we add the domain to the
   project, they point DNS at Vercel, we ask Vercel whether it sees it. TLS is
   Vercel's job once the record resolves.

   WHY NOT WILDCARD DNS AND SKIP ALL THIS. A wildcard would mean issuing
   certificates for names we do not control and accepting traffic for domains
   nobody proved they own. Adding each domain explicitly is what makes
   "book.acme.com" provably theirs.

   Unconfigured is not an error: without a token the feature says it is not
   available rather than the app failing to boot.
   ───────────────────────────────────────────────────────────────────────────── */

export type DomainState =
  | { status: "unconfigured" }
  | { status: "pending"; records: { type: string; name: string; value: string }[] }
  | { status: "verified" }
  | { status: "error"; message: string };

function configured(): boolean {
  return Boolean(env().VERCEL_API_TOKEN && env().VERCEL_PROJECT_ID);
}

function endpoint(path: string): string {
  const team = env().VERCEL_TEAM_ID;
  return `https://api.vercel.com${path}${team ? `${path.includes("?") ? "&" : "?"}teamId=${team}` : ""}`;
}

async function vercel<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(endpoint(path), {
    ...init,
    headers: {
      Authorization: `Bearer ${env().VERCEL_API_TOKEN}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const json = (await response.json()) as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(json.error?.message ?? `Vercel refused (${response.status})`);
  return json;
}

/** The CNAME a host has to add. One record, because one name is being pointed. */
function records(domain: string): { type: string; name: string; value: string }[] {
  const sub = domain.split(".").slice(0, -2).join(".") || "@";
  return [{ type: "CNAME", name: sub, value: "cname.vercel-dns.com" }];
}

export async function attachDomain(domain: string): Promise<DomainState> {
  if (!configured()) return { status: "unconfigured" };

  try {
    await vercel(`/v10/projects/${env().VERCEL_PROJECT_ID}/domains`, {
      method: "POST",
      body: JSON.stringify({ name: domain }),
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Vercel refused the domain.";
    // Already attached is the state we want, not a failure.
    if (!/already in use by this project|already exists/i.test(message)) {
      return { status: "error", message };
    }
  }

  return await checkDomain(domain);
}

/**
 * Whether Vercel can see the DNS record yet.
 *
 * Asked rather than assumed: a host who says they added the record and a host
 * who added it are different populations, and a booking page served on a
 * domain that does not resolve is worse than one that was never offered.
 */
export async function checkDomain(domain: string): Promise<DomainState> {
  if (!configured()) return { status: "unconfigured" };

  try {
    const config = await vercel<{ misconfigured?: boolean }>(
      `/v6/domains/${encodeURIComponent(domain)}/config`,
    );
    if (config.misconfigured === false) return { status: "verified" };
    return { status: "pending", records: records(domain) };
  } catch (cause) {
    return { status: "error", message: cause instanceof Error ? cause.message : "Could not reach Vercel." };
  }
}

export async function detachDomain(domain: string): Promise<void> {
  if (!configured()) return;
  try {
    await vercel(`/v9/projects/${env().VERCEL_PROJECT_ID}/domains/${encodeURIComponent(domain)}`, {
      method: "DELETE",
    });
  } catch {
    /* A domain that cannot be removed from Vercel must not stop a host
       removing it here: the row is what routes traffic, and leaving it
       because an API call failed would keep serving their page on a name they
       have disowned. */
  }
}
