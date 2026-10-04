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
  revalidatePath("/settings/companies");
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
