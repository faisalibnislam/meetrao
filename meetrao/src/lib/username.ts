/* ─────────────────────────────────────────────────────────────────────────────
   The booking link name.

   One validator for both surfaces, onboarding step 1 and Settings → Profile,
   so the two can never disagree about what is allowed. `checking` means the
   syntax rules passed and the availability lookup is next.
   ───────────────────────────────────────────────────────────────────────────── */

export type UsernameStatus =
  | "empty"
  | "short"
  | "long"
  | "chars"
  | "hyphen"
  | "reserved"
  | "checking"
  | "ok"
  | "taken";

/** Words the product needs for its own routes, or that would mislead a guest. */
export const RESERVED = new Set([
  "admin", "administrator", "api", "app", "auth", "login", "logout", "signup", "signin",
  "register", "settings", "account", "dashboard", "help", "support", "terms", "privacy",
  "legal", "about", "blog", "www", "mail", "email", "static", "assets", "cdn", "status",
  "pricing", "billing", "invoice", "book", "booking", "bookings", "new", "edit", "meetrao",
  "root", "system", "null", "undefined", "onboarding", "availability", "meetings", "verify",
  "forgot", "reset", "public", "internal",
]);

/** What the field accepts as you type: lowercase letters, digits and hyphens. */
export function sanitizeUsername(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

/** The syntax half of the check. Never touches the database. */
export function usernameStatus(raw: string): UsernameStatus {
  const v = raw.trim().toLowerCase();
  if (!v) return "empty";
  if (v.length < 3) return "short";
  if (v.length > 30) return "long";
  if (!/^[a-z0-9-]+$/.test(v)) return "chars";
  if (v.startsWith("-") || v.endsWith("-") || v.includes("--")) return "hyphen";
  if (RESERVED.has(v)) return "reserved";
  return "checking";
}

export function isBadStatus(status: UsernameStatus): boolean {
  return ["taken", "short", "long", "chars", "hyphen", "reserved"].includes(status);
}

/** The line under the field. Copy is specified, not suggested. */
export function usernameNote(status: UsernameStatus, value: string, hasIdeas = false): string {
  const v = value.trim().toLowerCase();
  switch (status) {
    case "ok":
      return `meetrao.com/${v} is available.`;
    case "taken":
      return `meetrao.com/${v} is already taken.${
        hasIdeas ? " Try one of these, or edit it above." : " Try a different one."
      }`;
    case "checking":
      return "Checking availability…";
    case "short":
      return "A little longer: at least 3 characters.";
    case "long":
      return "Too long: 30 characters at most.";
    case "chars":
      return "Letters, numbers and hyphens only.";
    case "hyphen":
      return "Hyphens can't start, end, or double up.";
    case "reserved":
      return "That word is reserved by Meetrao. Pick another.";
    default:
      return "";
  }
}

/**
 * Alternatives built from what they typed and their own name. Only shapes that
 * pass the syntax rules are offered; whether each is actually free is confirmed
 * by the caller against the database.
 */
export function usernameIdeas(raw: string, fullName = ""): string[] {
  const v = sanitizeUsername(raw.trim());
  if (!v) return [];

  const nameParts = fullName
    .toLowerCase()
    .replace(/[^a-z ]/g, "")
    .split(" ")
    .filter(Boolean);

  const pool = [`${v}-calls`, `talk-to-${v}`, `${v}-meet`, nameParts.join("-"), `${v}1`, `${v}-co`];

  const out: string[] = [];
  for (const candidate of pool) {
    if (out.length >= 3) break;
    if (usernameStatus(candidate) === "checking" && !out.includes(candidate)) out.push(candidate);
  }
  return out;
}

/** meetrao.com/<name>, and the same with a meeting slug appended. */
export function bookingLink(username: string, slug?: string): string {
  return slug ? `meetrao.com/${username}/${slug}` : `meetrao.com/${username}`;
}

/**
 * Where a COMPANY's meeting lives, which is not where its host's own does.
 *
 * A personal meeting is at meetrao.com/<username>/<meeting>. A company's is
 * at meetrao.com/<company>/<handle>/<meeting>, or on the company's own domain
 * once that is verified, and the two must never be shown in place of each
 * other: a company and the people in it are different things with different
 * links, which is the whole point of a company having a domain at all.
 *
 * An UNVERIFIED domain does not resolve yet, so it is not offered. Showing it
 * would be handing somebody an address that 404s.
 */
export function companyBookingLink(
  company: { slug: string; domain: string | null; domainVerified: boolean },
  handle: string,
  slug: string,
): string {
  return company.domain && company.domainVerified
    ? `${company.domain}/${handle}/${slug}`
    : `meetrao.com/${company.slug}/${handle}/${slug}`;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 78) || "meeting";
}
