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

/**
 * Hard-delete an account and everything it owns.
 *
 * Deliberately NOT the same shape as suspension: suspension is reversible and
 * flips a flag, this is final and cannot be undone. They are separate actions
 * with separate confirmations for that reason.
 *
 * The work happens inside admin_remove_account (migration 0012) because a
 * Postgres function body is one transaction. Reserving the username and
 * deleting the user cannot be atomic across an HTTP call to
 * auth.admin.deleteUser(), and half-applied is worse than either outcome: a
 * reservation with the account still live, or an account gone with its public
 * link free for anyone to claim.
 */
export async function removeUserAccount(
  userId: string,
): Promise<{ ok: boolean; message?: string }> {
  const actor = await requireAdminUser();
  if (!actor) return { ok: false, message: "Admins only." };
  if (actor.id === userId) {
    return { ok: false, message: "You cannot remove your own account." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("admin_remove_account", {
    p_user_id: userId,
  });

  if (error) {
    console.error("[admin] account removal failed", {
      userId,
      code: error.code,
      message: error.message,
    });
    return { ok: false, message: "Could not remove that account." };
  }

  const removed = Array.isArray(data) ? data[0] : null;

  await admin.from("admin_activity").insert({
    actor_id: actor.id,
    kind: "user_removed",
    summary: `${removed?.removed_email ?? "An account"} was removed by an admin`,
  });

  refresh();
  return { ok: true };
}
