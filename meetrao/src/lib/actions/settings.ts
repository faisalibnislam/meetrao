"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/data/session";
import { disconnect } from "@/lib/google/connection";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { TIMEZONES } from "@/lib/timezones";
import { sanitizeUsername, usernameStatus } from "@/lib/username";
import type { NotificationKey } from "@/lib/types";

export type SettingsResult = { error?: string };

export async function saveProfile(input: {
  fullName: string;
  jobTitle: string;
  username: string;
}): Promise<SettingsResult> {
  const session = await requireSession();
  const supabase = await supabaseServer();

  const username = sanitizeUsername(input.username);
  const changed = username !== session.profile.username;

  if (changed) {
    if (usernameStatus(username) !== "checking") return { error: "Fix your booking link first." };
    const { data: free } = await supabase.rpc("username_available", {
      p_username: username,
      p_for_user: session.userId,
    });
    if (free !== true) return { error: "That booking link is already taken." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: input.fullName.trim(),
      job_title: input.jobTitle.trim(),
      username,
    })
    .eq("id", session.userId);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return {};
}

export async function saveTimezone(timezone: string): Promise<SettingsResult> {
  if (!TIMEZONES.includes(timezone as (typeof TIMEZONES)[number])) {
    return { error: "Pick a timezone from the list." };
  }

  const session = await requireSession();
  const supabase = await supabaseServer();

  const { error } = await supabase.from("profiles")// Chosen, not detected — registration must never overwrite it.
    .update({ timezone, timezone_auto: false }).eq("id", session.userId);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/availability");
  return {};
}

export async function saveBookingDefaults(input: {
  duration: number;
  notice: number;
}): Promise<SettingsResult> {
  if (![15, 30, 45, 60].includes(input.duration)) return { error: "Pick a duration from the list." };
  if (![60, 120, 240, 720, 1440].includes(input.notice)) return { error: "Pick a notice period from the list." };

  const session = await requireSession();
  const supabase = await supabaseServer();

  const { error } = await supabase
    .from("profiles")
    .update({ default_duration_minutes: input.duration, default_notice_minutes: input.notice })
    .eq("id", session.userId);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return {};
}

export async function saveNotifications(prefs: Record<NotificationKey, boolean>): Promise<SettingsResult> {
  const session = await requireSession();
  const supabase = await supabaseServer();

  const { error } = await supabase.from("profiles").update(prefs).eq("id", session.userId);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return {};
}

export async function changePassword(input: {
  current: string;
  next: string;
}): Promise<SettingsResult> {
  if (input.next.length < 8) return { error: "Use at least 8 characters." };

  const session = await requireSession();
  const supabase = await supabaseServer();

  // Re-authenticate before changing the credential: a borrowed session should
  // not be able to lock the owner out.
  const { error: checkError } = await supabase.auth.signInWithPassword({
    email: session.email,
    password: input.current,
  });
  if (checkError) return { error: "That current password is not right." };

  const { error } = await supabase.auth.updateUser({ password: input.next });
  return error ? { error: error.message } : {};
}

export async function disconnectCalendar(): Promise<SettingsResult> {
  const session = await requireSession();
  await disconnect(session.userId);
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return {};
}

/**
 * Removes the account for good: the booking page, meetings, availability and
 * booking history. The username is held back rather than re-registrable, which
 * `admin_remove_account` does as part of the same transaction.
 */
export async function deleteOwnAccount(): Promise<SettingsResult> {
  const session = await requireSession();

  // Before the cascade, not after. `admin_remove_account` deletes the profile,
  // which cascades calendar_connections away — taking the refresh token with
  // it and leaving the Google grant alive with nothing left to revoke it with.
  // disconnect() revokes first, then deletes; the cascade then finds nothing.
  await disconnect(session.userId);

  const { error } = await supabaseAdmin().rpc("admin_remove_account", { p_user_id: session.userId });
  if (error) return { error: error.message };

  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  return {};
}
