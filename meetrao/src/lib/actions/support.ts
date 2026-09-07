"use server";

import { sendAndLog } from "@/lib/email/send";
import { supportEmail } from "@/lib/env";

export type SupportState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | {
      status: "error";
      formError?: string;
      errors?: { name?: string; email?: string; message?: string };
      values?: { name: string; email: string; topic: string; message: string };
    };

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * The contact form's submit endpoint. Sends the message to the support address
 * through Resend, with the sender's address as reply-to so a reply goes
 * straight back to them.
 *
 * Plain-text-ish HTML rather than one of the six templates: those are
 * product mail addressed to a host or guest, and this is an internal
 * message to the support inbox.
 */
export async function submitSupportRequest(
  _prev: SupportState,
  formData: FormData,
): Promise<SupportState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const topic = String(formData.get("topic") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const values = { name, email, topic, message };

  const errors: { name?: string; email?: string; message?: string } = {};
  if (!name) errors.name = "Tell us who you are.";
  if (!email) errors.email = "We need somewhere to reply.";
  else if (!EMAIL.test(email)) errors.email = "That does not look like an email address.";
  if (!message) errors.message = "A sentence or two is enough.";

  if (Object.keys(errors).length > 0) {
    return { status: "error", errors, values };
  }

  const result = await sendAndLog("support-request", {
    to: supportEmail(),
    replyTo: email,
    subject: `Support · ${topic} · ${name}`,
    html: supportHtml({ name, email, topic, message }),
  });

  if (!result.ok) {
    return {
      status: "error",
      formError: `Something went wrong sending that. Email ${supportEmail()} instead.`,
      values,
    };
  }

  return { status: "sent", email };
}

/** Escapes everything the sender typed — all four fields are attacker-controlled. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function supportHtml(input: {
  name: string;
  email: string;
  topic: string;
  message: string;
}): string {
  const rows = [
    ["From", `${escapeHtml(input.name)} &lt;${escapeHtml(input.email)}&gt;`],
    ["Topic", escapeHtml(input.topic)],
  ]
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#66635C;font:13px Arial,sans-serif">${label}</td>` +
        `<td style="padding:4px 0;color:#1A1917;font:13px Arial,sans-serif">${value}</td></tr>`,
    )
    .join("");

  return [
    '<div style="font:14px/1.6 Arial,sans-serif;color:#1A1917">',
    `<table cellpadding="0" cellspacing="0" border="0">${rows}</table>`,
    '<hr style="border:0;border-top:1px solid #E0DDD4;margin:14px 0">',
    `<div style="white-space:pre-wrap">${escapeHtml(input.message)}</div>`,
    "</div>",
  ].join("");
}
