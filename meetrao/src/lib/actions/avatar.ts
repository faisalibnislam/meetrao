"use server";

import { revalidatePath } from "next/cache";
import { convexServer } from "@/lib/convex/server";
import { convexMessage } from "@/lib/convex/error";
import { api } from "@/convex/_generated/api";

export type AvatarResult = { url?: string | null; error?: string };


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
 * The argument is an opaque storage id rather than a path, and that is the
 * point: the client never chooses where the bytes land, so there is no path to
 * forge and nothing for a policy to have to check.
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

/** The one-time URL the browser posts the image to. */
export async function avatarUploadUrl(): Promise<{ url?: string; error?: string }> {
  try {
    const convex = await convexServer();
    return { url: await convex.mutation(api.avatars.generateUploadUrl, {}) };
  } catch (cause) {
    return { error: convexMessage(cause, "Could not start the upload.") };
  }
}

/**
 * Back to initials, and the stored file goes with it.
 *
 * No folder to sweep any more: Convex storage is keyed by an opaque id the
 * client never chooses, and the mutation deletes the previous object as part
 * of the same write. The old code had to list and prune a public bucket
 * because a host who re-cropped four times left four files behind.
 */
export async function clearAvatar(): Promise<AvatarResult> {
  try {
    await (await convexServer()).mutation(api.avatars.clear, {});
  } catch (cause) {
    return { error: convexMessage(cause, "That photo could not be removed.") };
  }
  revalidatePath("/settings", "layout");
  revalidatePath("/dashboard", "layout");
  return { url: null };
}
