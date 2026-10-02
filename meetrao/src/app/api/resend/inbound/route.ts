import { Resend } from "resend";
import { env } from "@/lib/env";
import { escapeHtml } from "@/lib/email/send";
import {
  asAttachments,
  chooseAttachments,
  forwardHtml,
  forwardSubject,
  parseReceived,
  refuseToForward,
  skippedNote,
  verifyWebhook,
  type ReceivedAttachment,
} from "@/lib/email/inbound";

/**
 * Where mail to hello@meetrao.com ends up.
 *
 * Resend's inbound product delivers by webhook, not by mailbox: without this
 * route a message sits in Resend's store and nobody is told it arrived. This
 * turns it back into ordinary email in a real inbox.
 *
 * Two variables switch it on, both optional so a deployment without them keeps
 * working. It simply does not forward:
 *
 *   RESEND_WEBHOOK_SECRET  the `whsec_…` signing secret Resend shows once, when
 *                          the webhook is created. Without it nothing is
 *                          processed: unverified mail is anonymous mail.
 *   SUPPORT_INBOX          the address forwards are sent to.
 *
 * Status codes matter here, Resend retries a webhook that fails. A refusal we
 * will never change our mind about (wrong event, no destination) answers 200 so
 * the retries stop; a send that failed answers 500 so they continue.
 */
export async function POST(request: Request) {
  const e = env();
  const secret = e.RESEND_WEBHOOK_SECRET.trim();
  const destination = e.SUPPORT_INBOX.trim();

  // The raw text, not request.json(). The signature covers these exact bytes,
  // and JSON.stringify(await request.json()) is not guaranteed to reproduce them.
  const raw = await request.text();

  const verified = verifyWebhook({ secret, body: raw, headers: request.headers });
  if (!verified.ok) {
    console.error(`[inbound] rejected a delivery: ${verified.reason}`);
    // 401, not 500: a signature that does not match is not a transient fault,
    // and retrying it would only produce the same answer.
    return Response.json({ error: verified.reason }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return Response.json({ error: "body was not JSON" }, { status: 400 });
  }

  const mail = parseReceived(payload);
  if (!mail) return Response.json({ ignored: "not an email.received event" });

  if (!destination) {
    console.error(
      `[inbound] mail from ${mail.from || "an unknown sender"} has nowhere to go: set SUPPORT_INBOX. ` +
        `The message is still readable in Resend under Emails → Receiving${mail.id ? ` (id ${mail.id})` : ""}.`,
    );
    return Response.json({ ignored: "SUPPORT_INBOX is not set" });
  }

  const refusal = refuseToForward(destination);
  if (refusal) {
    console.error(`[inbound] refusing to forward: ${refusal}`);
    return Response.json({ ignored: refusal });
  }

  const resend = new Resend(e.RESEND_API_KEY);

  /* The webhook is an envelope, not a message: `email.received` carries no
     `text`, no `html` and no attachment bytes, only metadata. Everything a
     person actually wants to read has to be fetched. Skipping this step is why
     every forward for a week said "this message arrived with no readable body".

     Failing here must not lose the mail. A forward with an envelope and no body
     is poor; no forward at all is worse, and the sender is not told either
     way. So this narrows what gets sent rather than aborting. */
  let attachments: ReceivedAttachment[] = mail.attachments;
  try {
    // data_uri, so inline images arrive embedded in the HTML rather than as
    // broken `cid:` references. chooseAttachments() then drops them from the
    // attachment list, which would otherwise show every signature logo twice.
    const { data: full } = await resend.emails.receiving.get(mail.id, { html_format: "data_uri" });
    if (full) {
      mail.html = full.html ?? "";
      mail.text = full.text ?? "";
      // Same fields as the webhook's list, plus the sizes the budget needs.
      attachments = asAttachments(full.attachments);
    }
  } catch (cause) {
    console.error(
      `[inbound] could not read the body of ${mail.id}: ${cause instanceof Error ? cause.message : "unknown"}`,
    );
  }

  /* Each file is passed to the send as a signed URL rather than downloaded and
     re-uploaded: Resend fetches it itself, so a 12 MB PDF never occupies this
     function's memory and never crosses the wire twice. The URLs are short-
     lived, which is fine. The send happens seconds later. */
  const { send, skipped } = chooseAttachments(attachments);
  const files: { filename: string; path: string; contentType: string }[] = [];
  const unresolved: ReceivedAttachment[] = [];

  for (const attachment of send) {
    try {
      const { data } = await resend.emails.receiving.attachments.get({
        emailId: mail.id,
        id: attachment.id,
      });
      if (data?.download_url) {
        files.push({
          filename: attachment.filename,
          path: data.download_url,
          contentType: attachment.contentType,
        });
      } else {
        unresolved.push(attachment);
      }
    } catch (cause) {
      console.error(
        `[inbound] could not resolve ${attachment.filename}: ${cause instanceof Error ? cause.message : "unknown"}`,
      );
      unresolved.push(attachment);
    }
  }

  try {
    const { error } = await resend.emails.send(
      {
        from: e.EMAIL_FROM,
        to: destination,
        // Reply goes to whoever wrote in, not to the app's own address.
        replyTo: mail.from || undefined,
        subject: forwardSubject(mail),
        html: forwardHtml(mail, escapeHtml, skippedNote([...skipped, ...unresolved], escapeHtml)),
        attachments: files.length > 0 ? files : undefined,
        headers: { "X-Meetrao-Forwarded": "1" },
      },
      // A retried delivery forwards the same message once, not twice.
      mail.id ? { idempotencyKey: `inbound-forward:${mail.id}` } : undefined,
    );

    if (error) {
      console.error(`[inbound] forward failed: ${error.message}`);
      return Response.json({ error: error.message }, { status: 500 });
    }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "forward failed";
    console.error(`[inbound] forward threw: ${message}`);
    return Response.json({ error: message }, { status: 500 });
  }

  return Response.json({ forwarded: true });
}
