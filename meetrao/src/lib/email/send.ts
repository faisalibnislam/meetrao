import "server-only";

import { hasResend, resendApiKey, resendFrom } from "@/lib/env";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export type SendResult =
  | { ok: true; id: string }
  | { ok: false; reason: "unconfigured" | "rejected" | "network"; detail?: string };

type SendInput = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  /**
   * Stable per (event, recipient). Resend deduplicates on this for 24 hours, so
   * a retried request — a webhook redelivery, a user double-submitting, a
   * serverless function retried after a timeout — sends once rather than twice.
   * Booking mail is the case that matters: two "you're booked" emails for one
   * booking reads as two bookings.
   */
  idempotencyKey?: string;
};

/**
 * One place that talks to Resend. Raw fetch rather than the SDK, matching how
 * the Google integration is written and keeping the dependency list as it is.
 *
 * Never throws. Email is a side effect of an action that has already succeeded
 * — a booking is made, an account exists — so a mail failure must not fail that
 * action. Callers log the result; the caller's own work stands either way.
 */
export async function sendEmail(input: SendInput): Promise<SendResult> {
  if (!hasResend()) {
    return { ok: false, reason: "unconfigured" };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${resendApiKey()}`,
    "Content-Type": "application/json",
  };
  if (input.idempotencyKey) {
    headers["Idempotency-Key"] = input.idempotencyKey;
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers,
      cache: "no-store",
      body: JSON.stringify({
        from: resendFrom(),
        to: [input.to],
        subject: input.subject,
        html: input.html,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
    });

    const json = (await res.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
      name?: string;
    };

    if (!res.ok) {
      return {
        ok: false,
        reason: "rejected",
        detail: json.message ?? json.name ?? `HTTP ${res.status}`,
      };
    }

    return { ok: true, id: json.id ?? "" };
  } catch (cause) {
    return {
      ok: false,
      reason: "network",
      detail: cause instanceof Error ? cause.message : String(cause),
    };
  }
}

/**
 * Send and log, for callers that cannot act on a failure anyway. Keeps the
 * "email must never break the action" rule in one place instead of repeated at
 * every call site.
 */
export async function sendAndLog(
  label: string,
  input: SendInput,
): Promise<SendResult> {
  const result = await sendEmail(input);

  if (!result.ok) {
    if (result.reason === "unconfigured") {
      console.warn(`[email] ${label} not sent: RESEND_API_KEY is not set`);
    } else {
      console.error(`[email] ${label} failed (${result.reason})`, result.detail);
    }
  }

  return result;
}
