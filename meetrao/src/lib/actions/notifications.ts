"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/data/session";
import { supabaseServer } from "@/lib/supabase/server";
import { convexServes } from "@/lib/backend";
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

  const result = convexServes("notifications")
    ? await attempt(async () => (await convexServer()).mutation(api.notifications.markAllRead, {}))
    : await attempt(async () => {
        const supabase = await supabaseServer();
        const { error } = await supabase
          .from("notifications")
          .update({ read_at: new Date().toISOString() })
          .eq("user_id", session.userId)
          .is("read_at", null);
        if (error) throw new Error(error.message);
      });

  if (result.error) return result;
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
  return {};
}

export async function markRead(id: string, read: boolean): Promise<NotificationResult> {
  const session = await requireSession();

  const result = convexServes("notifications")
    ? await attempt(async () => (await convexServer()).mutation(api.notifications.markRead, { id, read }))
    : await attempt(async () => {
        const supabase = await supabaseServer();
        const { error } = await supabase
          .from("notifications")
          .update({ read_at: read ? new Date().toISOString() : null })
          .eq("id", id)
          .eq("user_id", session.userId);
        if (error) throw new Error(error.message);
      });

  if (result.error) return result;
  revalidatePath("/notifications");
  return {};
}

/** Clears what has been read, leaving anything unseen alone. */
export async function clearRead(): Promise<NotificationResult> {
  const session = await requireSession();

  const result = convexServes("notifications")
    ? await attempt(async () => (await convexServer()).mutation(api.notifications.clearRead, {}))
    : await attempt(async () => {
        const supabase = await supabaseServer();
        const { error } = await supabase
          .from("notifications")
          .delete()
          .eq("user_id", session.userId)
          .not("read_at", "is", null);
        if (error) throw new Error(error.message);
      });

  if (result.error) return result;
  revalidatePath("/notifications");
  return {};
}
