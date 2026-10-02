"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/data/session";
import { convexServer } from "@/lib/convex/server";
import { convexMessage } from "@/lib/convex/error";
import { api } from "@/convex/_generated/api";

/* API keys and webhook endpoints. The invariants (read-only keys, hashed
   storage, https endpoints, the caps on both) are enforced in Convex; these
   are the form's side of them. */

export type DeveloperResult = { error?: string; key?: string };

async function viaConvex<T>(work: (c: Awaited<ReturnType<typeof convexServer>>) => Promise<T>): Promise<{ value?: T; error?: string }> {
  try {
    return { value: await work(await convexServer()) };
  } catch (e) {
    return { error: convexMessage(e) };
  }
}

export async function createApiKey(name: string): Promise<DeveloperResult> {
  await requireSession();
  const { value, error } = await viaConvex((c) => c.action(api.apiKeys.create, { name }));
  if (error) return { error };
  revalidatePath("/settings/developer");
  // The one time this value crosses a boundary. It is not stored anywhere.
  return { key: value?.key };
}

export async function revokeApiKey(id: string): Promise<DeveloperResult> {
  await requireSession();
  const { error } = await viaConvex((c) => c.mutation(api.apiKeys.revoke, { id }));
  if (error) return { error };
  revalidatePath("/settings/developer");
  return {};
}

export async function addWebhook(url: string): Promise<DeveloperResult> {
  await requireSession();
  const { error } = await viaConvex((c) => c.mutation(api.webhooks.add, { url: url.trim() }));
  if (error) return { error };
  revalidatePath("/settings/developer");
  return {};
}

export async function removeWebhook(id: string): Promise<DeveloperResult> {
  await requireSession();
  const { error } = await viaConvex((c) => c.mutation(api.webhooks.remove, { id }));
  if (error) return { error };
  revalidatePath("/settings/developer");
  return {};
}

export async function testWebhook(id: string): Promise<DeveloperResult> {
  await requireSession();
  const { error } = await viaConvex((c) => c.action(api.webhooks.test, { id }));
  if (error) return { error };
  revalidatePath("/settings/developer");
  return {};
}
