"use server";

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
 * The contact form's submit endpoint.
 *
 * There is deliberately no mail provider wired in here. Meetrao has no
 * transactional email at all yet — that is START-HERE change 4, which is not in
 * this batch — so sending would mean inventing an integration and a secret.
 * Instead the request is validated and logged server-side, which is honest
 * about where it goes, and the single call below is the only line that changes
 * when a provider is chosen.
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

  try {
    // Where a provider goes. Until change 4 lands there is nowhere to send it,
    // so the request is recorded rather than silently dropped.
    console.info("[support] request received", {
      name,
      email,
      topic,
      length: message.length,
      at: new Date().toISOString(),
    });
  } catch {
    return {
      status: "error",
      formError: "Something went wrong sending that. Email hello@airlystudio.com instead.",
      values,
    };
  }

  return { status: "sent", email };
}
