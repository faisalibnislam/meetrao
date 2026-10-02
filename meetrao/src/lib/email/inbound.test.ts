import { createHmac, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  asAttachments,
  chooseAttachments,
  forwardHtml,
  parseReceived,
  refuseToForward,
  skippedNote,
  verifyWebhook,
  type ReceivedAttachment,
} from "./inbound";

/* The signature check is the whole security boundary of the inbound route:
   anyone can POST to it, and a broken check means anyone can make Meetrao send
   mail. So the tests sign payloads the way Svix does rather than mocking the
   verifier. */

const SECRET = `whsec_${randomBytes(24).toString("base64")}`;

function sign(body: string, opts: { secret?: string; id?: string; timestamp?: number } = {}) {
  const id = opts.id ?? "msg_2abc";
  const timestamp = opts.timestamp ?? Math.floor(Date.now() / 1000);
  const key = Buffer.from((opts.secret ?? SECRET).replace(/^whsec_/, ""), "base64");
  const mac = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64");

  return new Headers({
    "svix-id": id,
    "svix-timestamp": String(timestamp),
    "svix-signature": `v1,${mac}`,
  });
}

const escape = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

describe("verifyWebhook", () => {
  const body = JSON.stringify({ type: "email.received", data: { id: "1" } });

  // Everything else here signs with the same code path it verifies, which would
  // pass just as happily if both halves were wrong in the same way. This vector
  // is published by Svix, so it checks the scheme rather than the symmetry.
  it("matches the published Svix test vector", () => {
    const headers = new Headers({
      "svix-id": "msg_p5jXN8AQM9LWM0D4loKWxJek",
      "svix-timestamp": "1614265330",
      "svix-signature": "v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=",
    });
    const verified = verifyWebhook({
      secret: "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw",
      body: '{"test": 2432232314}',
      headers,
      now: 1614265330,
    });
    expect(verified).toEqual({ ok: true });
  });

  it("accepts a correctly signed delivery", () => {
    expect(verifyWebhook({ secret: SECRET, body, headers: sign(body) })).toEqual({ ok: true });
  });

  it("accepts white-labelled webhook-* headers", () => {
    const svix = sign(body);
    const headers = new Headers({
      "webhook-id": svix.get("svix-id")!,
      "webhook-timestamp": svix.get("svix-timestamp")!,
      "webhook-signature": svix.get("svix-signature")!,
    });
    expect(verifyWebhook({ secret: SECRET, body, headers })).toEqual({ ok: true });
  });

  it("accepts when one of several signatures matches, as during a rotation", () => {
    const headers = sign(body);
    const real = headers.get("svix-signature")!;
    headers.set("svix-signature", `v1,${randomBytes(32).toString("base64")} ${real}`);
    expect(verifyWebhook({ secret: SECRET, body, headers }).ok).toBe(true);
  });

  it("rejects a body altered after signing", () => {
    const headers = sign(body);
    const tampered = JSON.stringify({ type: "email.received", data: { id: "2" } });
    expect(verifyWebhook({ secret: SECRET, body: tampered, headers }).ok).toBe(false);
  });

  it("rejects a signature made with a different secret", () => {
    const headers = sign(body, { secret: `whsec_${randomBytes(24).toString("base64")}` });
    expect(verifyWebhook({ secret: SECRET, body, headers }).ok).toBe(false);
  });

  it("rejects a replay from outside the tolerance window", () => {
    const stale = Math.floor(Date.now() / 1000) - 600;
    const headers = sign(body, { timestamp: stale });
    expect(verifyWebhook({ secret: SECRET, body, headers }).ok).toBe(false);
  });

  it("rejects when the endpoint has no secret configured", () => {
    expect(verifyWebhook({ secret: "", body, headers: sign(body) }).ok).toBe(false);
  });

  it("rejects an unsigned request", () => {
    expect(verifyWebhook({ secret: SECRET, body, headers: new Headers() }).ok).toBe(false);
  });

  it("does not throw on a signature of the wrong length", () => {
    const headers = sign(body);
    headers.set("svix-signature", "v1,c2hvcnQ=");
    expect(verifyWebhook({ secret: SECRET, body, headers }).ok).toBe(false);
  });
});

describe("parseReceived", () => {
  it("reads a received message", () => {
    const mail = parseReceived({
      type: "email.received",
      data: { id: "e1", from: "a@b.com", to: ["hello@meetrao.com"], subject: "Help", text: "hi" },
    });
    expect(mail).toMatchObject({ id: "e1", from: "a@b.com", to: ["hello@meetrao.com"], subject: "Help" });
  });

  it("ignores events that are not inbound mail", () => {
    expect(parseReceived({ type: "email.delivered", data: { id: "e1" } })).toBeNull();
    expect(parseReceived(null)).toBeNull();
    expect(parseReceived("nope")).toBeNull();
  });

  it("reads `to` however Resend shapes it", () => {
    const shapes = [
      "hello@meetrao.com",
      ["hello@meetrao.com"],
      [{ address: "hello@meetrao.com" }],
      [{ email: "hello@meetrao.com" }],
    ];
    for (const to of shapes) {
      expect(parseReceived({ type: "email.received", data: { to } })?.to).toEqual(["hello@meetrao.com"]);
    }
  });

  /* The real DMARC-report delivery captured from this endpoint. Attachment
     metadata is the only part of the message the webhook does carry, so the
     parser has to pick it up. The route needs the ids to fetch the files. */
  it("reads attachment metadata off a real delivery", () => {
    const mail = parseReceived({
      type: "email.received",
      data: {
        email_id: "f8fa99bd",
        from: "noreply-dmarc-support@google.com",
        to: ["hello@meetrao.com"],
        subject: "Report domain: meetrao.com",
        attachments: [
          {
            id: "6480e2f5",
            filename: "google.com!meetrao.com!1789084800!1789171199.zip",
            content_type: "application/zip",
            content_id: null,
            content_disposition: "attachment",
          },
        ],
      },
    });
    expect(mail?.id).toBe("f8fa99bd");
    expect(mail?.attachments).toHaveLength(1);
    expect(mail?.attachments[0].id).toBe("6480e2f5");
    // And the thing that made this a bug: no body anywhere in the payload.
    expect(mail?.html).toBe("");
    expect(mail?.text).toBe("");
  });

  it("survives a payload missing every optional field", () => {
    const mail = parseReceived({ type: "email.received" });
    expect(mail).toEqual({ id: "", from: "", to: [], subject: "", text: "", html: "", attachments: [] });
  });
});

describe("refuseToForward", () => {
  it("allows an ordinary inbox", () => {
    expect(refuseToForward("someone@gmail.com")).toBeNull();
  });

  it("refuses meetrao.com, which would loop back into Resend", () => {
    // Receiving is enabled at the root, so every address on the domain, not
    // only support@, comes straight back through this webhook.
    expect(refuseToForward("hello@meetrao.com")).toContain("loop");
    expect(refuseToForward("anything@meetrao.com")).toContain("loop");
    expect(refuseToForward("Anything@Mail.Meetrao.com")).toContain("loop");
  });

  it("refuses something that is not an address", () => {
    expect(refuseToForward("faisal")).toContain("not an email address");
  });
});

describe("forwardHtml", () => {
  const base = {
    id: "e1",
    from: "a@b.com",
    to: ["hello@meetrao.com"],
    subject: "Help",
    text: "",
    html: "",
    attachments: [],
  };

  it("keeps the sender's own HTML intact", () => {
    const html = forwardHtml({ ...base, html: "<p>original <b>body</b></p>" }, escape);
    expect(html).toContain("<p>original <b>body</b></p>");
  });

  it("escapes a plain-text body rather than injecting it as markup", () => {
    const html = forwardHtml({ ...base, text: "<script>alert(1)</script>" }, escape);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes the envelope, which the sender also controls", () => {
    const html = forwardHtml({ ...base, subject: '<img src=x onerror="1">' }, escape);
    expect(html).not.toContain("<img");
  });

  it("still says something when a message has no body at all", () => {
    const html = forwardHtml(base, escape);
    expect(html).toContain("Receiving");
    expect(html).toContain("e1");
  });
});

/* ── attachments ───────────────────────────────────────────────────────────
   The bug these exist for: `email.received` carries the envelope and nothing
   else (no body, no attachment bytes) so a forward built from the webhook
   alone is an empty notification. Every support email sent before this was
   written arrived that way. The route now fetches the message; these cover the
   pure half of what it does with the result. */

const file = (over: Partial<ReceivedAttachment> = {}): ReceivedAttachment => ({
  id: "a1",
  filename: "report.pdf",
  contentType: "application/pdf",
  contentId: null,
  inline: false,
  size: 1024,
  ...over,
});

describe("asAttachments", () => {
  it("reads the webhook's shape, which carries no size", () => {
    const list = asAttachments([
      {
        id: "6480e2f5",
        filename: "google.com!meetrao.com!1789084800!1789171199.zip",
        content_type: "application/zip",
        content_id: null,
        content_disposition: "attachment",
      },
    ]);
    expect(list).toEqual([
      {
        id: "6480e2f5",
        filename: "google.com!meetrao.com!1789084800!1789171199.zip",
        contentType: "application/zip",
        contentId: null,
        inline: false,
        size: 0,
      },
    ]);
  });

  it("reads the GET endpoint's shape, which does", () => {
    const [a] = asAttachments([
      { id: "a1", filename: "shot.png", content_type: "image/png", content_disposition: "inline", size: 4096, content_id: "cid1" },
    ]);
    expect(a).toMatchObject({ size: 4096, inline: true, contentId: "cid1" });
  });

  it("gives a nameless attachment a name", () => {
    expect(asAttachments([{ id: "a1" }])[0]).toMatchObject({
      filename: "attachment",
      contentType: "application/octet-stream",
    });
  });

  it("drops entries with no id, which cannot be fetched", () => {
    expect(asAttachments([{ filename: "ghost.pdf" }, null, "nope"])).toEqual([]);
    expect(asAttachments(undefined)).toEqual([]);
  });
});

describe("chooseAttachments", () => {
  it("sends what fits", () => {
    const { send, skipped } = chooseAttachments([file(), file({ id: "a2" })]);
    expect(send).toHaveLength(2);
    expect(skipped).toEqual([]);
  });

  /* Inline images are already embedded as data: URIs by the html_format the
     route asks for. Attaching them again shows every signature logo twice. */
  it("leaves inline images out, they are already in the body", () => {
    const { send, skipped } = chooseAttachments([file({ inline: true }), file({ id: "a2" })]);
    expect(send.map((a) => a.id)).toEqual(["a2"]);
    expect(skipped).toEqual([]);
  });

  it("names what does not fit rather than dropping it silently", () => {
    const { send, skipped } = chooseAttachments(
      [file({ id: "a1", size: 900 }), file({ id: "a2", size: 900 })],
      1000,
    );
    expect(send.map((a) => a.id)).toEqual(["a1"]);
    expect(skipped.map((a) => a.id)).toEqual(["a2"]);
  });

  it("skips a single file bigger than the whole budget", () => {
    const { send, skipped } = chooseAttachments([file({ size: 5000 })], 1000);
    expect(send).toEqual([]);
    expect(skipped).toHaveLength(1);
  });

  /* Unknown size is 0, which must not read as "free". One is admitted, because
     a forward carrying the attachment is the point; the rest wait behind it. */
  it("admits unsized files without pretending they are weightless", () => {
    const { send } = chooseAttachments([file({ id: "a1", size: 0 }), file({ id: "a2", size: 0 })], 1000);
    expect(send.length).toBeGreaterThanOrEqual(1);
  });
});

describe("skippedNote", () => {
  it("says nothing when everything travelled", () => {
    expect(skippedNote([], escape)).toBe("");
  });

  it("names the files left behind, and where to get them", () => {
    const note = skippedNote([file({ filename: "huge.zip" })], escape);
    expect(note).toContain("huge.zip");
    expect(note).toContain("Receiving");
  });

  it("escapes the filename, which the sender chose", () => {
    const note = skippedNote([file({ filename: '<img src=x onerror="1">.pdf' })], escape);
    expect(note).not.toContain("<img");
  });
});

describe("forwardHtml with a notice", () => {
  it("puts the notice above the body without disturbing it", () => {
    const mail = {
      id: "e1",
      from: "a@b.com",
      to: ["hello@meetrao.com"],
      subject: "Help",
      text: "",
      html: "<p>body</p>",
      attachments: [],
    };
    const html = forwardHtml(mail, escape, "<p>NOTICE</p>");
    expect(html).toContain("<p>NOTICE</p>");
    expect(html).toContain("<p>body</p>");
    expect(html.indexOf("NOTICE")).toBeLessThan(html.indexOf("<p>body</p>"));
  });
});
