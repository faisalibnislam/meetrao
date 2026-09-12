"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/data/session";
import { disconnect } from "@/lib/google/connection";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

export type AdminResult = { error?: string };

/**
 * Writes the audit trail through the service role.
 *
 * `admin_activity` has a SELECT policy for admins and no INSERT policy at all,
 * so every one of these written through the caller's own session was rejected
 * by RLS and thrown away unchecked — the rows that exist came from the
 * SECURITY DEFINER triggers, which bypass policies. Service-role is also the
 * right trust boundary regardless: an audit log a browser session can write to
 * is one an admin could forge entries in.
 *
 * A failure here must not fail the action it describes, which has already
 * happened, so it is reported rather than thrown.
 */
async function recordAdminActivity(entry: {
  actor_id: string;
  kind: string;
  summary: string;
}): Promise<void> {
  const { error } = await supabaseAdmin().from("admin_activity").insert(entry);
  if (error) console.error("admin_activity insert failed", { kind: entry.kind, error: error.message });
}

/* Suspension is reversible; removal is not. They are deliberately separate
   actions, and the console never offers them from the same button. */

export async function setSuspended(userId: string, suspended: boolean): Promise<AdminResult> {
  const admin = await requireAdmin();
  if (userId === admin.userId) return { error: "You cannot suspend your own account." };

  // Service role, not the admin's session: `is_suspended` is no longer
  // writable by `authenticated`, because that column plus the
  // `profiles_update_own` policy let a suspended user clear their own
  // suspension with one PostgREST call.
  const { error } = await supabaseAdmin().from("profiles").update({ is_suspended: suspended }).eq("id", userId);
  if (error) return { error: error.message };

  await recordAdminActivity({
    actor_id: admin.userId,
    kind: suspended ? "user_suspended" : "user_reactivated",
    summary: `${admin.profile.full_name || admin.profile.username} ${
      suspended ? "suspended" : "reactivated"
    } an account`,
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return {};
}

/**
 * Permanent. Deletes the auth user, which cascades through every table the
 * profile owns, and holds the freed username back rather than letting it be
 * re-registered immediately.
 */
export async function removeAccount(userId: string): Promise<AdminResult> {
  const admin = await requireAdmin();
  if (userId === admin.userId) return { error: "You cannot remove your own account from here." };

  // Same reason as deleteOwnAccount: the cascade would drop the token without
  // ever telling Google, leaving Meetrao listed in the permissions of an
  // account that no longer exists here.
  await disconnect(userId);

  const { error } = await supabaseAdmin().rpc("admin_remove_account", { p_user_id: userId });
  if (error) return { error: error.message };

  await recordAdminActivity({
    actor_id: admin.userId,
    kind: "user_removed",
    summary: `${admin.profile.full_name || admin.profile.username} removed an account`,
  });

  revalidatePath("/admin/users");
  return {};
}

export async function savePlatformSettings(input: {
  appName: string;
  supportEmail: string;
}): Promise<AdminResult> {
  await requireAdmin();

  if (!input.appName.trim()) return { error: "The app needs a name." };
  if (!input.supportEmail.includes("@")) return { error: "Enter a support address people can reach." };

  const supabase = await supabaseServer();
  const { error } = await supabase
    .from("platform_settings")
    .update({ app_name: input.appName.trim(), support_email: input.supportEmail.trim() })
    .eq("id", true);

  if (error) return { error: error.message };

  revalidatePath("/admin/settings");
  return {};
}

export async function saveAdminAccount(input: { fullName: string }): Promise<AdminResult> {
  const admin = await requireAdmin();
  const supabase = await supabaseServer();

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: input.fullName.trim() })
    .eq("id", admin.userId);

  if (error) return { error: error.message };

  revalidatePath("/admin/settings");
  return {};
}
