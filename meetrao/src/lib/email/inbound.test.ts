import { createHmac, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { forwardHtml, parseReceived, refuseToForward, verifyWebhook } from "./inbound";

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
      data: { id: "e1", from: "a@b.com", to: ["support@meetrao.com"], subject: "Help", text: "hi" },
    });
    expect(mail).toMatchObject({ id: "e1", from: "a@b.com", to: ["support@meetrao.com"], subject: "Help" });
  });

  it("ignores events that are not inbound mail", () => {
    expect(parseReceived({ type: "email.delivered", data: { id: "e1" } })).toBeNull();
    expect(parseReceived(null)).toBeNull();
    expect(parseReceived("nope")).toBeNull();
  });

  it("reads `to` however Resend shapes it", () => {
    const shapes = [
      "support@meetrao.com",
      ["support@meetrao.com"],
      [{ address: "support@meetrao.com" }],
      [{ email: "support@meetrao.com" }],
    ];
    for (const to of shapes) {
      expect(parseReceived({ type: "email.received", data: { to } })?.to).toEqual(["support@meetrao.com"]);
    }
  });

  it("survives a payload missing every optional field", () => {
    const mail = parseReceived({ type: "email.received" });
    expect(mail).toEqual({ id: "", from: "", to: [], subject: "", text: "", html: "" });
  });
});

describe("refuseToForward", () => {
  it("allows an ordinary inbox", () => {
    expect(refuseToForward("someone@gmail.com")).toBeNull();
  });

  it("refuses meetrao.com, which would loop back into Resend", () => {
    // Receiving is enabled at the root, so every address on the domain — not
    // only support@ — comes straight back through this webhook.
    expect(refuseToForward("support@meetrao.com")).toContain("loop");
    expect(refuseToForward("anything@meetrao.com")).toContain("loop");
    expect(refuseToForward("Anything@Mail.Meetrao.com")).toContain("loop");
  });

  it("refuses something that is not an address", () => {
    expect(refuseToForward("faisal")).toContain("not an email address");
  });
});

describe("forwardHtml", () => {
  const base = { id: "e1", from: "a@b.com", to: ["support@meetrao.com"], subject: "Help", text: "", html: "" };

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
