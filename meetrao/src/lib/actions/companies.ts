"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/data/session";
import { convexServer } from "@/lib/convex/server";
import { convexMessage } from "@/lib/convex/error";
import { api } from "@/convex/_generated/api";

/* Companies: a domain, a brand, and the people whose links live on it.

   Every rule that matters (how many you may own, how many people each may
   hold, that the OWNER's plan decides rather than the caller's, that handles
   are unique inside a company) is enforced in convex/companies.ts, which is
   the boundary. These actions are the form's side of the same rules and are
   not a second place to change them. */

export type CompanyResult = { error?: string; id?: string; slug?: string; handle?: string };

async function viaConvex<T>(
  work: (c: Awaited<ReturnType<typeof convexServer>>) => Promise<T>,
): Promise<{ value?: T; error?: string }> {
  try {
    return { value: await work(await convexServer()) };
  } catch (e) {
    return { error: convexMessage(e) };
  }
}

function done() {
  /* Both paths to the same list: Personal → Companies, and a company's own
     People tab. Revalidating one would leave the other showing what was true
     before the change. */
  revalidatePath("/settings/companies");
  revalidatePath("/settings/people");
}

export async function createCompany(input: { name: string; slug: string }): Promise<CompanyResult> {
  await requireSession();
  if (!input.name.trim()) return { error: "Give the company a name." };

  const { value, error } = await viaConvex((c) => c.mutation(api.companies.create, input));
  if (error) return { error };
  done();
  return { id: value?.id, slug: value?.slug };
}

export async function renameCompany(input: { id: string; name: string; slug: string }): Promise<CompanyResult> {
  await requireSession();
  const { error } = await viaConvex((c) => c.mutation(api.companies.rename, input));
  if (error) return { error };
  done();
  return {};
}

export async function addCompanyMember(input: {
  id: string;
  email: string;
  handle?: string;
}): Promise<CompanyResult> {
  await requireSession();
  if (!input.email.trim()) return { error: "Give them an email address." };

  const { value, error } = await viaConvex((c) => c.mutation(api.companies.addMember, input));
  if (error) return { error };
  done();
  return { handle: value?.handle };
}

export async function setCompanyHandle(input: {
  id: string;
  userId: string;
  handle: string;
}): Promise<CompanyResult> {
  await requireSession();
  const { error } = await viaConvex((c) => c.mutation(api.companies.setHandle, input));
  if (error) return { error };
  done();
  return {};
}

/**
 * Promote a member to admin, or take it back.
 *
 * Which of those is allowed depends on the caller's role AND on what the
 * person already is, and both are decided in convex/companies.ts. Nothing is
 * pre-checked here: a form that guesses at a rule it does not own ends up
 * disagreeing with it.
 */
export async function setCompanyRole(input: {
  id: string;
  userId: string;
  role: "admin" | "member";
}): Promise<CompanyResult> {
  await requireSession();
  const { error } = await viaConvex((c) => c.mutation(api.companies.setRole, input));
  if (error) return { error };
  done();
  return {};
}

export async function removeCompanyMember(input: { id: string; userId: string }): Promise<CompanyResult> {
  await requireSession();
  const { error } = await viaConvex((c) => c.mutation(api.companies.removeMember, input));
  if (error) return { error };
  done();
  return {};
}

export async function deleteCompany(input: { id: string }): Promise<CompanyResult> {
  await requireSession();
  const { error } = await viaConvex((c) => c.mutation(api.companies.remove, input));
  if (error) return { error };
  done();
  return {};
}
