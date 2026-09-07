import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * The six templates in `src/emails/` are the design's send-ready HTML, used
 * as-is: table layout, inlined styles, Outlook conditionals, the lot. Nothing
 * here rewrites them — it only fills in the merge fields.
 *
 * They shipped with literal example values ("John Smith", a sample Meet URL),
 * not placeholders, so the copies in `src/emails/` have those values replaced
 * by the `{{field}}` names the design's own gallery documents. The markup is
 * byte-for-byte the design's; only the example values moved.
 *
 * THE LOGO IS STILL DRAWN IN TYPE — a green rounded square containing "M" plus
 * an Arial wordmark — because a repo-relative asset cannot resolve in a
 * recipient's mail client. Swapping in a hosted https PNG is a per-template
 * edit at the logo cell, which is sized for a 22px square; search the templates
 * for `LOGO` to find it. Left as type deliberately: a broken image is worse
 * than type, and there is no hosted asset yet.
 */
export type TemplateName =
  | "verify-email"
  | "welcome"
  | "booking-new-host"
  | "booking-new-guest"
  | "booking-changed"
  | "booking-cancelled";

/**
 * Read at request time from the app directory. `next.config.ts` lists this
 * directory in `outputFileTracingIncludes` so the files ship with the
 * serverless bundle — without that they exist locally and 404 in production.
 */
const TEMPLATE_DIR = path.join(process.cwd(), "src", "emails");

const cache = new Map<TemplateName, string>();

function load(name: TemplateName): string {
  const cached = cache.get(name);
  if (cached) return cached;

  const html = readFileSync(path.join(TEMPLATE_DIR, `${name}.html`), "utf8");
  cache.set(name, html);
  return html;
}

/**
 * Values reach the template as HTML, and a guest controls several of them —
 * their name, and the free-text note. Escaping is what stops a note containing
 * `<script>` or a stray `</td>` from rewriting the email.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type MergeFields = Record<string, string>;

/**
 * Substitute `{{field}}` throughout. Resend's transactional send API does no
 * templating of its own, so this has to happen before the call.
 *
 * An unfilled field is a bug worth failing on rather than emailing someone a
 * literal `{{guest_name}}`, so any left over throws.
 */
export function renderTemplate(
  name: TemplateName,
  fields: MergeFields,
): string {
  let html = load(name);

  for (const [key, value] of Object.entries(fields)) {
    html = html.split(`{{${key}}}`).join(escapeHtml(value));
  }

  const unresolved = [...new Set(html.match(/\{\{[a-z_]+\}\}/g) ?? [])];
  if (unresolved.length > 0) {
    throw new Error(
      `Email template "${name}" has unfilled fields: ${unresolved.join(", ")}`,
    );
  }

  return html;
}

/** Fills the subject line's own `{{field}}` refs, which the gallery also uses. */
export function renderSubject(subject: string, fields: MergeFields): string {
  let out = subject;
  for (const [key, value] of Object.entries(fields)) {
    out = out.split(`{{${key}}}`).join(value);
  }
  return out;
}
