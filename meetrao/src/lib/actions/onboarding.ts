"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/data/session";
import { supabaseServer } from "@/lib/supabase/server";
import { sanitizeUsername, slugify, usernameIdeas, usernameStatus } from "@/lib/username";

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
  const supabase = await supabaseServer();

  const { data } = await supabase.rpc("username_available", {
    p_username: value,
    p_for_user: session.userId,
  });

  if (data === true) return { status: "ok", ideas: [] };

  // Only offer alternatives that are themselves free.
  const candidates = usernameIdeas(value, session.profile.full_name);
  const free: string[] = [];
  for (const candidate of candidates) {
    const { data: ok } = await supabase.rpc("username_available", {
      p_username: candidate,
      p_for_user: session.userId,
    });
    if (ok === true) free.push(candidate);
  }

  return { status: "taken", ideas: free };
}

export type SaveResult = { error?: string };

export async function claimUsername(raw: string): Promise<SaveResult> {
  const value = sanitizeUsername(raw);
  if (usernameStatus(value) !== "checking") return { error: "Pick a name that follows the rules above." };

  const session = await requireSession();
  const supabase = await supabaseServer();

  const { data: free } = await supabase.rpc("username_available", {
    p_username: value,
    p_for_user: session.userId,
  });
  if (free !== true) return { error: "That booking link was taken a moment ago. Pick another." };

  const { error } = await supabase.from("profiles").update({ username: value }).eq("id", session.userId);
  if (error) return { error: "That booking link was taken a moment ago. Pick another." };

  revalidatePath("/onboarding/1");
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
  const supabase = await supabaseServer();

  const { data: existing } = await supabase
    .from("meeting_types")
    .select("id")
    .eq("user_id", session.userId)
    .order("created_at")
    .limit(1);

  const payload = {
    name,
    description: input.description.trim(),
    duration_minutes: input.duration,
    minimum_notice_minutes: session.profile.default_notice_minutes,
  };

  // Re-running step 3 edits the first meeting rather than piling up duplicates.
  const { error } = existing?.length
    ? await supabase.from("meeting_types").update(payload).eq("id", existing[0].id)
    : await supabase.from("meeting_types").insert({
        ...payload,
        user_id: session.userId,
        slug: await uniqueSlug(session.userId, name),
      });

  if (error) return { error: error.message };

  revalidatePath("/onboarding/3");
  return {};
}

async function uniqueSlug(userId: string, name: string): Promise<string> {
  const supabase = await supabaseServer();
  const base = slugify(name);

  const { data } = await supabase.from("meeting_types").select("slug").eq("user_id", userId);
  const taken = new Set((data ?? []).map((r) => r.slug as string));

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

  const supabase = await supabaseServer();
  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", session.userId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return {};
}
