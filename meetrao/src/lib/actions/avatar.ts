"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/data/session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

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
