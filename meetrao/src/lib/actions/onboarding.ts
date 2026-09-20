"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/data/session";
import { convexServer } from "@/lib/convex/server";
import { convexMessage } from "@/lib/convex/error";
import { api } from "@/convex/_generated/api";
import { sanitizeUsername, slugify, usernameIdeas, usernameStatus } from "@/lib/username";

/** Whether a booking link is free, ignoring the caller's own current one. */
async function isFree(username: string, forUser: string | null): Promise<boolean> {
  const convex = await convexServer();
  return await convex.query(api.profiles.usernameAvailable, { username, forUser });

}


/* Onboarding is five steps and every one of them writes as it goes, so a host
   who stops halfway keeps what they entered — "Your progress is saved. You can
   finish setting up later." is true, not reassurance. */

export type UsernameCheck = { status: "ok" | "taken"; ideas: string[] };

/**
 * The availability half of the username check. The syntax half runs in the
 * browser, so a malformed name never reaches the database.
 */
export async function checkUsername(raw: string): Promise<UsernameCheck> {
  const value = sanitizeUsername(raw);
  if (usernameStatus(value) !== "checking") return { status: "taken", ideas: [] };

  const session = await requireSession();

  // isFree() picks the backend; this function no longer needs a client itself.
  const data = await isFree(value, session?.userId ?? null);

  if (data === true) return { status: "ok", ideas: [] };

  // Only offer alternatives that are themselves free.
  const candidates = usernameIdeas(value, session.profile.full_name);
  const free: string[] = [];
  for (const candidate of candidates) {
    const ok = await isFree(candidate, session?.userId ?? null);
    if (ok === true) free.push(candidate);
  }

  return { status: "taken", ideas: free };
}

export type SaveResult = { error?: string };

export async function claimUsername(raw: string): Promise<SaveResult> {
  const value = sanitizeUsername(raw);
  if (usernameStatus(value) !== "checking") return { error: "Pick a name that follows the rules above." };

  const session = await requireSession();

  const free = await isFree(value, session.userId);
  if (free !== true) return { error: "That booking link was taken a moment ago. Pick another." };
  try {
    await (await convexServer()).mutation(api.profiles.setUsername, { username: value });
  } catch (cause) {
    return { error: convexMessage(cause, "That booking link could not be claimed.") };
  }
  revalidatePath("/onboarding");
  return {};

}

export async function saveFirstMeeting(input: {
  name: string;
  description: string;
  duration: number;
}): Promise<SaveResult> {
  const name = input.name.trim();
  if (!name) return { error: "Give the meeting a name guests will recognise." };

  const session = await requireSession();

  const payload = {
    name,
    description: input.description.trim(),
    duration_minutes: input.duration,
    minimum_notice_minutes: session.profile.default_notice_minutes,
  };
  try {
    const convex = await convexServer();
    const mine = await convex.query(api.meetingTypes.listOwn, {});
    // Re-running step 3 edits the first meeting rather than piling up duplicates.
    if (mine.length) {
      await convex.mutation(api.meetingTypes.update, { id: mine[0].id, ...payload });
    } else {
      await convex.mutation(api.meetingTypes.create, {
        ...payload,
        slug: await uniqueSlug(session.userId, name),
      });
    }
  } catch (cause) {
    return { error: convexMessage(cause, "That meeting could not be saved.") };
  }
  revalidatePath("/onboarding/3");
  return {};

}

async function uniqueSlug(userId: string, name: string): Promise<string> {
  void userId; // the listing is scoped by the caller's own identity
  const base = slugify(name);

  const convex = await convexServer();
  const taken = new Set((await convex.query(api.meetingTypes.listOwn, {})).map((m) => m.slug));

  if (!taken.has(base)) return base;
  for (let n = 2; n < 200; n++) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

/** Seeds the design's default week the first time step 4 is opened. */
export async function completeOnboarding(): Promise<SaveResult> {
  const session = await requireSession();
  if (session.profile.onboarding_completed_at) return {};
  try {
    await (await convexServer()).mutation(api.profiles.updateOwn, {
      onboarding_completed_at: new Date().toISOString(),
    });
  } catch (cause) {
    return { error: convexMessage(cause, "Onboarding could not be completed.") };
  }
  revalidatePath("/dashboard");
  return {};

}
