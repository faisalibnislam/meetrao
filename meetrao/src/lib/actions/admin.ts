"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/data/session";
import { disconnect } from "@/lib/google/connection";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { sanitizeUsername, usernameIdeas, usernameStatus } from "@/lib/username";

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

/* ── the booking link ───────────────────────────────────────────────────────
   meetrao.com/<username> is public, unique product-wide and claimed first-come
   first-served, so it is the one part of an account an operator eventually has
   to intervene in — a squatted trademark, an impersonation, a host locked out
   of their own name. Before this the only lever was removing the account,
   which is not a proportionate answer to a bad URL.

   The atomic half lives in 0018 as two SECURITY DEFINER functions. These are
   the gate: requireAdmin(), the same syntax rules the host's own field uses,
   and the audit trail. */

/** Why a link cannot be used, or that it can. */
export type LinkCheck =
  | { state: "ok" }
  /** Another live account holds it. */
  | { state: "taken"; ideas: string[] }
  /** In `reserved_usernames` — freed by a removal or retired by an admin. */
  | { state: "retired" };

/**
 * The availability half of the admin's check, scoped to the account being
 * edited.
 *
 * Not `checkUsername` from the onboarding actions: that one passes the
 * *caller's* id to `username_available`, which is right for a host editing
 * their own link and wrong in both directions here. It would report the
 * target's existing name as taken, and it would report the admin's own name as
 * free — offering to move a host onto a link that is not available at all.
 *
 * It also separates "taken" from "retired", because the remedy differs: one
 * needs a different name, the other needs a deliberate decision to reuse a
 * name that was deliberately held back.
 */
export async function checkBookingLink(userId: string, raw: string): Promise<LinkCheck> {
  await requireAdmin();

  const value = sanitizeUsername(raw);
  // A malformed name is the browser's job to catch; it never reaches here.
  if (usernameStatus(value) !== "checking") return { state: "taken", ideas: [] };

  const db = supabaseAdmin();

  const [{ data: holder }, { data: retired }] = await Promise.all([
    db.from("profiles").select("id, full_name").eq("username", value).maybeSingle(),
    db.from("reserved_usernames").select("username").eq("username", value).maybeSingle(),
  ]);

  if (holder?.id === userId) return { state: "ok" };
  if (retired) return { state: "retired" };
  if (!holder) return { state: "ok" };

  // Only offer alternatives that are themselves free — an idea that is also
  // taken is worse than no idea.
  const { data: target } = await db.from("profiles").select("full_name").eq("id", userId).maybeSingle();
  const ideas: string[] = [];
  for (const candidate of usernameIdeas(value, target?.full_name ?? "")) {
    const { data: free } = await db.rpc("username_available", { p_username: candidate, p_for_user: userId });
    if (free === true) ideas.push(candidate);
    if (ideas.length >= 3) break;
  }

  return { state: "taken", ideas };
}

/**
 * Postgres writes error messages in lowercase sentence fragments by
 * convention. These are shown to a person, so the four the functions raise on
 * purpose are spelled out here; anything else is a fault, not a refusal, and
 * is passed through rather than dressed up as one.
 */
function linkError(message: string): string {
  if (message.includes("belongs to another account")) return "That booking link belongs to another account.";
  if (message.includes("held back")) return "That booking link is held back from an earlier removal.";
  if (message.includes("not a valid booking link")) return "That is not a valid booking link.";
  if (message.includes("no such account")) return "That account no longer exists.";
  return message;
}

export async function setBookingLink(input: {
  userId: string;
  username: string;
  /** Hold the old name back so nobody — the host included — can re-register it. */
  retireOld: boolean;
  /** Reuse a name that is currently held back. Asked for explicitly, never implied. */
  force?: boolean;
}): Promise<AdminResult> {
  const admin = await requireAdmin();

  const username = sanitizeUsername(input.username);
  // The same validator the host's own field uses, so the two surfaces can
  // never disagree about what is allowed — including the reserved-word list,
  // which the database does not know about.
  if (usernameStatus(username) !== "checking") return { error: "That is not a valid booking link." };

  const { data, error } = await supabaseAdmin()
    .rpc("admin_set_username", {
      p_user_id: input.userId,
      p_username: username,
      p_retire_old: input.retireOld,
      p_force: input.force ?? false,
    })
    .maybeSingle<{ old_username: string; new_username: string }>();

  if (error) return { error: linkError(error.message) };
  if (!data) return { error: "That account no longer exists." };
  if (data.old_username === data.new_username) return {};

  await recordAdminActivity({
    actor_id: admin.userId,
    kind: "user_link_changed",
    summary: `${admin.profile.full_name || admin.profile.username} changed a booking link from /${
      data.old_username
    } to /${data.new_username}${input.retireOld ? " and held the old one back" : ""}`,
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${input.userId}`);
  return {};
}

/**
 * Takes the current link out of circulation and parks the host on a neutral
 * placeholder.
 *
 * `profiles.username` is NOT NULL, so there is no state in which an account
 * has no booking link — removing one necessarily means replacing it. The old
 * name is always held back, or the host could claim it straight back from
 * Settings → Profile and the intervention would have achieved nothing.
 *
 * This does not take the booking page down. That switch is suspension, and
 * merging the two would make every rename a silent deactivation.
 */
export async function releaseBookingLink(userId: string): Promise<AdminResult & { username?: string }> {
  const admin = await requireAdmin();

  const { data, error } = await supabaseAdmin()
    .rpc("admin_release_username", { p_user_id: userId })
    .maybeSingle<{ old_username: string; new_username: string }>();

  if (error) return { error: linkError(error.message) };
  if (!data) return { error: "That account no longer exists." };

  await recordAdminActivity({
    actor_id: admin.userId,
    kind: "user_link_released",
    summary: `${admin.profile.full_name || admin.profile.username} retired the booking link /${
      data.old_username
    } and moved the account to /${data.new_username}`,
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { username: data.new_username };
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
