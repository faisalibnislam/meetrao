"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/data/session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

export type AdminResult = { error?: string };

/* Suspension is reversible; removal is not. They are deliberately separate
   actions, and the console never offers them from the same button. */

export async function setSuspended(userId: string, suspended: boolean): Promise<AdminResult> {
  const admin = await requireAdmin();
  if (userId === admin.userId) return { error: "You cannot suspend your own account." };

  const supabase = await supabaseServer();
  const { error } = await supabase.from("profiles").update({ is_suspended: suspended }).eq("id", userId);
  if (error) return { error: error.message };

  await supabase.from("admin_activity").insert({
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

  const { error } = await supabaseAdmin().rpc("admin_remove_account", { p_user_id: userId });
  if (error) return { error: error.message };

  const supabase = await supabaseServer();
  await supabase.from("admin_activity").insert({
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
