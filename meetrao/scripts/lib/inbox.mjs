/**
 * Reading a verification code out of the mail that was actually sent.
 *
 * The codes are stored sha256-hashed, so the database cannot tell you what was
 * emailed — which is the correct design, and is why these checks used to stop
 * at "a code was issued" and leave the rest to a manual test.
 *
 * Resend's API is the inbox. It keeps the rendered body of every message this
 * project sends, so a check can read the code the recipient would have read and
 * finish the flow. The key is this project's own; nothing here can see any
 * other account's mail.
 *
 * The throwaway accounts use Resend's `delivered+…@resend.dev` sink, which
 * accepts and discards, so no real inbox is touched.
 */

const API = "https://api.resend.com/emails";

async function get(path, key) {
  const r = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${key}` } });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
  return await r.json();
}

/**
 * The newest message sent to `to`, or null.
 *
 * Polls, because "sent" and "listed" are not the same instant — the action has
 * returned by the time the check looks, but Resend has its own queue.
 */
export async function latestEmailTo(to, key, { attempts = 15, waitMs = 1000 } = {}) {
  for (let i = 0; i < attempts; i++) {
    const list = await get("?limit=25", key);
    const hit = (list.data ?? []).find((e) => (e.to ?? []).includes(to));
    if (hit) return await get(`/${hit.id}`, key);
    await new Promise((r) => setTimeout(r, waitMs));
  }
  return null;
}

/** The `code` query parameter out of the link in the message body. */
export function codeFromEmail(email) {
  const body = `${email?.html ?? ""}${email?.text ?? ""}`;
  const m = /[?&]code=([A-Za-z0-9._~%-]+)/.exec(body);
  return m ? decodeURIComponent(m[1]) : null;
}
