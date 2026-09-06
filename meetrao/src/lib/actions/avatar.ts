"use server";

import { refresh } from "next/cache";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Records the uploaded avatar's public URL on the profile. The URL is checked
 * against this project's own storage origin so a caller cannot point the field
 * at an arbitrary host and have the booking page render it.
 */
export async function setAvatarUrl(
  url: string,
): Promise<{ ok: boolean; message?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You are signed out." };

  const expectedPrefix = `${publicEnv.supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/avatars/${user.id}/`;
  if (!url.startsWith(expectedPrefix)) {
    return { ok: false, message: "That image is not in your own storage." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: url })
    .eq("id", user.id);

  if (error) return { ok: false, message: "Could not save your photo." };

  refresh();
  return { ok: true };
}
