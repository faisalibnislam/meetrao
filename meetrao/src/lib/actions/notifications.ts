"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/data/session";
import { convexServer } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { convexMessage } from "@/lib/convex/error";

/* Read state is the only thing a host changes here — the rows themselves are
   written by the triggers (Postgres) or convex/lib/effects.ts (Convex).
   `read_at` is a timestamp rather than a boolean so "mark all as read" is one
   statement and the moment is recoverable. */

export type NotificationResult = { error?: string };

/** Errors reach the form as a message, never as a thrown server action. */
async function attempt(work: () => Promise<unknown>): Promise<NotificationResult> {
  try {
    await work();
    return {};
  } catch (e) {
    return { error: convexMessage(e) };
  }
}

export async function markAllRead(): Promise<NotificationResult> {
  const session = await requireSession();

  const result = await attempt(async () => (await convexServer()).mutation(api.notifications.markAllRead, {}));

  if (result.error) return result;
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
  return {};
}

export async function markRead(id: string, read: boolean): Promise<NotificationResult> {
  const session = await requireSession();

  const result = await attempt(async () => (await convexServer()).mutation(api.notifications.markRead, { id, read }));

  if (result.error) return result;
  revalidatePath("/notifications");
  return {};
}

/** Clears what has been read, leaving anything unseen alone. */
export async function clearRead(): Promise<NotificationResult> {
  const session = await requireSession();

  const result = await attempt(async () => (await convexServer()).mutation(api.notifications.clearRead, {}));

  if (result.error) return result;
  revalidatePath("/notifications");
  return {};
}
