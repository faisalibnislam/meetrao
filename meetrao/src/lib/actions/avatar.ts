"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/data/session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { convexServes } from "@/lib/backend";
import { convexServer } from "@/lib/convex/server";
import { convexMessage } from "@/lib/convex/error";
import { api } from "@/convex/_generated/api";

export type AvatarResult = { url?: string | null; error?: string };

const BUCKET = "avatars";

/**
 * Records a freshly uploaded avatar, and removes the one it replaces.
 *
 * The upload itself happens in the browser, against the host's own session, so
 * the storage policies decide whether it is allowed rather than this code —
 * `avatars_insert_own` requires the first path segment to be the uploader's
 * own id. The path is re-checked here anyway: this runs with the service role,
 * and a path arriving from a client is not a thing to take on trust.
 *
 * Old objects are deleted rather than left. A host who re-crops four times
 * should not leave four files behind, and the bucket is public.
 */
/**
 * Records a freshly uploaded avatar.
 *
 * On Convex the argument is an opaque storage id rather than a path, and that
 * is the point: the client never chooses where the bytes land, so there is no
 * path to forge and no equivalent of the `avatars_insert_own` policy to check.
 * The Supabase branch keeps that check, because there a path DOES arrive from
 * a client and this code runs with the service role.
 */
export async function saveAvatarFromStorageId(storageId: string): Promise<AvatarResult> {
  try {
    const convex = await convexServer();
    const url = await convex.mutation(api.avatars.save, { storageId: storageId as never });
    revalidatePath("/settings", "layout");
    revalidatePath("/dashboard", "layout");
    return { url };
  } catch (cause) {
    return { error: convexMessage(cause, "That photo could not be saved.") };
  }
}

/**
 * The one-time URL the browser posts the image to — or `legacy`, meaning this
 * deployment still uploads straight to the Supabase bucket.
 *
 * The BACKEND decides, not the browser. `convexServes` is server-only, and
 * duplicating the flag into a NEXT_PUBLIC variable would create a second
 * source of truth that can disagree with the first.
 */
export async function avatarUploadUrl(): Promise<{ url?: string; legacy?: true; error?: string }> {
  if (!convexServes("session")) return { legacy: true };
  try {
    const convex = await convexServer();
    return { url: await convex.mutation(api.avatars.generateUploadUrl, {}) };
  } catch (cause) {
    return { error: convexMessage(cause, "Could not start the upload.") };
  }
}

export async function saveAvatar(path: string): Promise<AvatarResult> {
  const session = await requireSession();

  // Must be this host's own folder — the same rule the storage policy applies.
  if (!path.startsWith(`${session.userId}/`) || path.includes("..")) {
    return { error: "That upload does not belong to this account." };
  }

  const admin = supabaseAdmin();
  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  const url = data.publicUrl;

  const supabase = await supabaseServer();
  const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", session.userId);
  if (error) return { error: error.message };

  await removeStoredAvatarsExcept(session.userId, path);

  revalidatePath("/settings", "layout");
  revalidatePath("/dashboard", "layout");
  return { url };
}

/** Back to initials, and the stored file goes with it. */
export async function clearAvatar(): Promise<AvatarResult> {
  const session = await requireSession();

  if (convexServes("session")) {
    try {
      await (await convexServer()).mutation(api.avatars.clear, {});
    } catch (cause) {
      return { error: convexMessage(cause, "That photo could not be removed.") };
    }
    revalidatePath("/settings", "layout");
    revalidatePath("/dashboard", "layout");
    return { url: null };
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", session.userId);
  if (error) return { error: error.message };

  await removeStoredAvatarsExcept(session.userId, null);

  revalidatePath("/settings", "layout");
  revalidatePath("/dashboard", "layout");
  return { url: null };
}

/** Deletes every object in the host's folder except the one just saved. */
async function removeStoredAvatarsExcept(userId: string, keep: string | null): Promise<void> {
  try {
    const admin = supabaseAdmin();
    const { data: files } = await admin.storage.from(BUCKET).list(userId);
    if (!files?.length) return;

    const stale = files
      .map((f) => `${userId}/${f.name}`)
      .filter((p) => p !== keep);

    if (stale.length) await admin.storage.from(BUCKET).remove(stale);
  } catch (cause) {
    // A leftover file is untidy, not broken. Never fail the save over it.
    console.error("avatar cleanup failed", {
      userId,
      error: cause instanceof Error ? cause.message : String(cause),
    });
  }
}
