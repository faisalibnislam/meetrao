/* ─────────────────────────────────────────────────────────────────────────────
   The host's own video meeting link (Zoom, Google Meet, Teams, Whereby…).

   A "Video call" meeting sends every guest to this one address, so it has to
   be a real web address a guest can open: https, no credentials in it. A link
   pasted without its scheme ("zoom.us/j/123") is given https:// rather than
   refused, since that is how most people copy them.
   ───────────────────────────────────────────────────────────────────────────── */

export function normalizeVideoLink(input: string): { ok: true; link: string | null } | { ok: false; error: string } {
  const raw = input.trim();
  if (!raw) return { ok: true, link: null };
  if (raw.length > 500) return { ok: false, error: "That link is too long." };
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return { ok: false, error: "That is not a web address." };
  }
  if (url.protocol !== "https:") return { ok: false, error: "Use the https:// link your video app gives you." };
  if (url.username || url.password) return { ok: false, error: "Use the link without a username or password in it." };
  if (!url.hostname.includes(".")) return { ok: false, error: "That is not a web address." };
  return { ok: true, link: url.toString() };
}
