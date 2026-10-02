"use server";

import { Resend } from "resend";
import { z } from "zod";
import { SUPPORT_EMAIL } from "@/lib/contact";
import { env } from "@/lib/env";
import { escapeHtml } from "@/lib/email/send";
import { optionalSession } from "@/lib/data/session";
import { convexAnonymous } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";

/* The contact form. Signed in, the identity comes from the account rather than
   from two fields the sender could get wrong. */

/**
 * The one address a visitor is ever shown.
 *
 * An admin can point `platform_settings.support_email` somewhere else, and the
 * form will deliver there, but this is what the failure message offers when
 * sending did not work, so it has to be an address that is genuinely watched
 * rather than whatever the row happens to hold. That is lib/contact.ts, which
 * is also what the Support page prints two clicks earlier; a fallback address
 * that disagrees with the one on screen helps nobody.
 */

const TOPICS = ["account", "calendar", "booking", "billing", "other"] as const;

const Body = z.object({
  name: z.string().trim().max(120).optional().default(""),
  email: z.string().trim().max(200).optional().default(""),
  topic: z.enum(TOPICS),
  message: z
    .string()
    .trim()
    .min(10, "A sentence or two is enough: we just need something to go on."),
});

export type SupportResult = { error?: string; sentTo?: string };

export async function sendSupportMessage(input: {
  name: string;
  email: string;
  topic: string;
  message: string;
}): Promise<SupportResult> {
  const parsed = Body.safeParse(input);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the form and try again.",
    };
  }

  const session = await optionalSession();
  const fromName = session
    ? session.profile.full_name || session.profile.username
    : parsed.data.name;
  const fromEmail = session ? session.profile.email : parsed.data.email;

  if (!fromName.trim()) return { error: "Tell us who you are." };
  if (!fromEmail.includes("@")) return { error: "We need somewhere to reply." };

  // Read anonymously: the support form is reachable while signed out.
  const settings = await convexAnonymous().query(api.platformSettings.get, {});

  const to = (settings?.support_email as string | undefined) || SUPPORT_EMAIL;

  // Every value here was typed by the sender, so every value is escaped.
  const html = `
    <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#1A1917">
      <p style="margin:0 0 12px"><strong>${escapeHtml(fromName)}</strong> &lt;${escapeHtml(fromEmail)}&gt;</p>
      <p style="margin:0 0 12px">Topic: ${escapeHtml(parsed.data.topic)}${session ? " · signed in" : " · signed out"}</p>
      <hr style="border:0;border-top:1px solid #E0DDD4;margin:16px 0">
      <p style="margin:0;white-space:pre-wrap">${escapeHtml(parsed.data.message)}</p>
    </div>`;

  try {
    const e = env();
    const { error } = await new Resend(e.RESEND_API_KEY).emails.send({
      from: e.EMAIL_FROM,
      to,
      replyTo: fromEmail,
      subject: `Support · ${parsed.data.topic} · ${fromName}`,
      html,
    });

    if (error)
      return {
        error: `That did not send. Email us directly at ${SUPPORT_EMAIL}.`,
      };
  } catch {
    return {
      error: `That did not send. Email us directly at ${SUPPORT_EMAIL}.`,
    };
  }

  return { sentTo: fromEmail };
}
