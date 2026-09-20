"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/data/session";
import { disconnect } from "@/lib/google/connection";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { convexServes } from "@/lib/backend";
import { convexServer } from "@/lib/convex/server";
import { convexMessage } from "@/lib/convex/error";
import { api } from "@/convex/_generated/api";

/** Convex throws; these actions return `{ error }` for the form to render. */
async function onConvex<T>(work: (c: Awaited<ReturnType<typeof convexServer>>) => Promise<T>): Promise<{ value?: T; error?: string }> {
  try {
    return { value: await work(await convexServer()) };
  } catch (e) {
    return { error: convexMessage(e) };
  }
}
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
  const username = sanitizeUsername(input.username);
  const changed = username !== session.profile.username;

  if (convexServes("session")) {
    if (changed && usernameStatus(username) !== "checking") return { error: "Fix your booking link first." };
    const r = await onConvex(async (c) => {
      await c.mutation(api.profiles.updateOwn, {
        full_name: input.fullName.trim(),
        job_title: input.jobTitle.trim(),
      });
      // Renaming carries the uniqueness and reserved-name rules, so it is its
      // own mutation rather than a field on the update.
      if (changed) await c.mutation(api.profiles.setUsername, { username });
    });
    if (r.error) return { error: r.error };
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return {};
  }

  const supabase = await supabaseServer();

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

  if (convexServes("session")) {
    // Chosen, not detected — registration must never overwrite it.
    const r = await onConvex((c) => c.mutation(api.profiles.updateOwn, { timezone, timezone_auto: false }));
    if (r.error) return { error: r.error };
    revalidatePath("/settings");
    revalidatePath("/availability");
    revalidatePath("/dashboard");
    return {};
  }

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

  if (convexServes("session")) {
    const r = await onConvex((c) =>
      c.mutation(api.profiles.updateOwn, {
        default_duration_minutes: input.duration,
        default_notice_minutes: input.notice,
      }),
    );
    if (r.error) return { error: r.error };
    revalidatePath("/settings");
    return {};
  }

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

  if (convexServes("session")) {
    const r = await onConvex((c) => c.mutation(api.profiles.updateOwn, prefs));
    if (r.error) return { error: r.error };
    revalidatePath("/settings");
    return {};
  }

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

  if (convexServes("session")) {
    const r = await onConvex((c) => c.mutation(api.profiles.deleteOwnAccount, {}));
    if (r.error) return { error: r.error };

    /* Convex holds the product data; Supabase still holds the IDENTITY. Deleting
       one without the other leaves either an account that can sign in to
       nothing, or a profile with no way in. The auth user goes second, so a
       failure here leaves a signed-in user whose data is gone — recoverable by
       retrying — rather than an orphaned identity nobody can reach. */
    const { error: authError } = await supabaseAdmin().auth.admin.deleteUser(session.userId);
    if (authError) return { error: authError.message };
  } else {
    const { error } = await supabaseAdmin().rpc("admin_remove_account", { p_user_id: session.userId });
    if (error) return { error: error.message };
  }

  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  return {};
}
