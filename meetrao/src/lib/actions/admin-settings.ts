"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function savePlatformSettings(input: {
  appName: string;
  supportEmail: string;
}): Promise<{ ok: boolean; message?: string }> {
  const appName = input.appName.trim();
  const supportEmail = input.supportEmail.trim();

  if (!appName) return { ok: false, message: "The app needs a name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(supportEmail)) {
    return { ok: false, message: "Enter a valid support email." };
  }

  // RLS restricts this update to admins; no extra check is needed here.
  const supabase = await createClient();
  const { error } = await supabase
    .from("platform_settings")
    .update({ app_name: appName, support_email: supportEmail })
    .eq("id", true);

  if (error) return { ok: false, message: "Could not save those settings." };

  refresh();
  return { ok: true };
}

export async function saveAdminProfile(input: {
  fullName: string;
  email: string;
}): Promise<{ ok: boolean; message?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You are signed out." };

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: input.fullName.trim(),
      email: input.email.trim(),
    })
    .eq("id", user.id);

  if (error) return { ok: false, message: "Could not save your details." };

  refresh();
  return { ok: true };
}
