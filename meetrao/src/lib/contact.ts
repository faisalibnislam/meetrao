/* ─────────────────────────────────────────────────────────────────────────────
   Who Meetrao is, and where to reach it.

   One definition, because these two strings appear in the footer, in six email
   templates, on the Privacy Policy, on the Terms, and in the Google OAuth
   consent screen's own configuration. An address that disagrees with itself
   across those places is not a typo — it is the thing a verification reviewer
   notices, and the thing a regulator asks about.

   `src/lib/contact-address.test.ts` fails if a second address on one of our own
   domains appears anywhere a visitor can see.
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * The postal address, as it should appear to a reader — one line.
 *
 * Anti-spam law (CAN-SPAM, and the equivalents elsewhere) requires a physical
 * address in commercial email, which is why the templates carry it. The site
 * footer carries it for the same reason Google's review does: so the operator
 * of a service that reads people's calendars is not anonymous.
 */
export const POSTAL_ADDRESS = "44/A Judge Court Road, Cumilla 3500, Bangladesh";

/** The one address a visitor is ever shown. See lib/actions/support.ts. */
export const SUPPORT_EMAIL = "support@meetrao.com";

/**
 * How Meetrao describes its operator in legal text.
 *
 * A sole proprietorship, deliberately not a person's name: the service is
 * identified by its name, its address and its support address. If Meetrao ever
 * incorporates, this is the one line to change — the Terms and the Privacy
 * Policy both read from it.
 */
export const OPERATOR = "Meetrao, an independently operated service";
