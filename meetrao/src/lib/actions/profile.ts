"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteConnection } from "@/lib/google/calendar";
import { TIMEZONES } from "@/lib/timezones";

export type ActionResult = { ok: boolean; message?: string };

const VALID_ZONES = new Set<string>(TIMEZONES);
const USERNAME_RE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

export async function updateProfile(input: {
  fullName: string;
  jobTitle: string;
  email: string;
  username: string;
}): Promise<ActionResult> {
  const username = input.username.trim().toLowerCase();

  if (!input.fullName.trim()) return { ok: false, message: "Enter your name." };
  if (!USERNAME_RE.test(username)) {
    return {
      ok: false,
      message:
        "Usernames use lowercase letters, numbers and hyphens, and cannot start or end with a hyphen.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You are signed out." };

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: input.fullName.trim(),
      job_title: input.jobTitle.trim(),
      email: input.email.trim(),
      username,
    })
    .eq("id", user.id);

  if (error) {
    // The unique index on lower(username) is the only realistic failure here.
    if (error.code === "23505") {
      return { ok: false, message: "That username is already taken." };
    }
    return { ok: false, message: "Could not save your profile." };
  }

  refresh();
  return { ok: true };
}

export async function updateBookingDefaults(input: {
  durationMinutes: number;
  noticeMinutes: number;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You are signed out." };

  const { error } = await supabase
    .from("profiles")
    .update({
      default_duration_minutes: input.durationMinutes,
      default_notice_minutes: input.noticeMinutes,
    })
    .eq("id", user.id);

  if (error) return { ok: false, message: "Could not save those defaults." };

  refresh();
  return { ok: true };
}

export async function updateTimezone(timezone: string): Promise<ActionResult> {
  if (!VALID_ZONES.has(timezone)) {
    return { ok: false, message: "Pick a timezone from the list." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You are signed out." };

  const { error } = await supabase
    .from("profiles")
    .update({ timezone })
    .eq("id", user.id);

  if (error) return { ok: false, message: "Could not save your timezone." };

  refresh();
  return { ok: true };
}

export async function changePassword(
  newPassword: string,
): Promise<ActionResult> {
  if (newPassword.length < 8) {
    return { ok: false, message: "Use a password of at least 8 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, message: error.message };

  return { ok: true };
}

export async function disconnectCalendar(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You are signed out." };

  await deleteConnection(user.id);
  refresh();
  return { ok: true };
}

export async function completeOnboarding(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You are signed out." };

  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) return { ok: false, message: "Could not finish setting up." };

  refresh();
  return { ok: true };
}

/**
 * Deletes the account. Cancels upcoming bookings via the ON DELETE CASCADE on
 * every owned table, then removes the auth user itself with the service role.
 */
export async function deleteAccount(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You are signed out." };

  const { createAdminClient } = await import("@/lib/supabase/server");
  const admin = createAdminClient();

  // Take the Google events down before the rows that point at them vanish.
  const { data: upcoming } = await admin
    .from("bookings")
    .select("id, google_event_id")
    .eq("host_id", user.id)
    .eq("status", "confirmed")
    .gte("starts_at", new Date().toISOString());

  if (upcoming?.length) {
    const { deleteCalendarEvent } = await import("@/lib/google/calendar");
    for (const booking of upcoming) {
      if (!booking.google_event_id) continue;
      try {
        await deleteCalendarEvent(user.id, booking.google_event_id);
      } catch {
        // Best effort — the account is going away regardless.
      }
    }
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { ok: false, message: "Could not delete the account." };

  await supabase.auth.signOut();
  redirect("/login");
}
