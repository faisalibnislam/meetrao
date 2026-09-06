"use server";

import { refresh } from "next/cache";
import { createAdminClient, createClient } from "@/lib/supabase/server";

async function requireAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  return data?.is_admin ? user : null;
}

/**
 * Suspension is two writes: the mirror flag on `profiles` (so admin screens can
 * read it under RLS) and a ban on the auth user (which is what actually blocks
 * sign-in). Both go through the service role, gated on the caller being an
 * admin.
 */
export async function setUserSuspended(
  userId: string,
  suspended: boolean,
): Promise<{ ok: boolean; message?: string }> {
  const actor = await requireAdminUser();
  if (!actor) return { ok: false, message: "Admins only." };
  if (actor.id === userId) {
    return { ok: false, message: "You cannot suspend your own account." };
  }

  const admin = createAdminClient();

  const { error: banError } = await admin.auth.admin.updateUserById(userId, {
    // Supabase treats "none" as lifting the ban; "876000h" is ~100 years.
    ban_duration: suspended ? "876000h" : "none",
  });
  if (banError) {
    return { ok: false, message: "Could not update that account's access." };
  }

  const { error } = await admin
    .from("profiles")
    .update({ is_suspended: suspended })
    .eq("id", userId);

  if (error) return { ok: false, message: "Could not update that account." };

  refresh();
  return { ok: true };
}
