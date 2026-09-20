"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/data/session";
import { disconnect } from "@/lib/google/connection";
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

export async function saveTimezone(timezone: string): Promise<SettingsResult> {
  if (!TIMEZONES.includes(timezone as (typeof TIMEZONES)[number])) {
    return { error: "Pick a timezone from the list." };
  }

  await requireSession();
  // Chosen, not detected — registration must never overwrite it.
  const r = await onConvex((c) => c.mutation(api.profiles.updateOwn, { timezone, timezone_auto: false }));
  if (r.error) return { error: r.error };
  revalidatePath("/settings");
  revalidatePath("/availability");
  revalidatePath("/dashboard");
  return {};

}

export async function saveBookingDefaults(input: {
  duration: number;
  notice: number;
}): Promise<SettingsResult> {
  if (![15, 30, 45, 60].includes(input.duration)) return { error: "Pick a duration from the list." };
  if (![60, 120, 240, 720, 1440].includes(input.notice)) return { error: "Pick a notice period from the list." };

  await requireSession();
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

export async function saveNotifications(prefs: Record<NotificationKey, boolean>): Promise<SettingsResult> {
  await requireSession();
  const r = await onConvex((c) => c.mutation(api.profiles.updateOwn, prefs));
  if (r.error) return { error: r.error };
  revalidatePath("/settings");
  return {};

}

export async function changePassword(input: {
  current: string;
  next: string;
}): Promise<SettingsResult> {
  if (input.next.length < 8) return { error: "Use at least 8 characters." };

  const session = await requireSession();

  /* Re-authenticate before changing the credential: a borrowed session should
     not be able to lock the owner out. Convex Auth verifies the current
     password as part of the change rather than in a separate sign-in, so this
     is one call where it used to be two. */
  try {
    await (await convexServer()).action(api.auth.signIn, {
      provider: "password",
      params: {
        email: session.email,
        password: input.current,
        newPassword: input.next,
        flow: "signIn",
      },
    });
  } catch {
    return { error: "That current password is not right." };
  }
  return {};
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

  /* Revoke Google BEFORE the purge. Deleting the account takes the stored
     refresh token with it, and a grant with nothing left to revoke it with
     outlives the account that asked for it. */
  await disconnect(session.userId);

  const r = await onConvex((c) => c.mutation(api.profiles.deleteOwnAccount, {}));
  if (r.error) return { error: r.error };

  /* The account is gone; the session in this browser is not. Clearing it is
     the caller's job — `signOut` redirects, and a redirect thrown from here
     would be swallowed by the form's error handling. */
  return {};
}
