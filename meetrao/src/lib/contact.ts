/* ─────────────────────────────────────────────────────────────────────────────
   Who Meetrao is, and where to reach it.

   One definition, because these two strings appear in the footer, in six email
   templates, on the Privacy Policy, on the Terms, and in the Google OAuth
   consent screen's own configuration. An address that disagrees with itself
   across those places is not a typo. It is the thing a verification reviewer
   notices, and the thing a regulator asks about.

   `src/lib/contact-address.test.ts` fails if a second address on one of our own
   domains appears anywhere a visitor can see.
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * The postal address, as it should appear to a reader, one line.
 *
 * Anti-spam law (CAN-SPAM, and the equivalents elsewhere) requires a physical
 * address in commercial email, which is why the templates carry it. The site
 * footer carries it for the same reason Google's review does: so the operator
 * of a service that reads people's calendars is not anonymous.
 */
export const POSTAL_ADDRESS = "44/A Judge Court Road, Cumilla 3500, Bangladesh";

/**
 * The one address a visitor is ever shown, and the one Meetrao sends from.
 *
 * hello@, not support@, for the plainest possible reason: hello@ is the only
 * mailbox that exists. An address nobody can read is worse than no address,
 * it is a promise of a reply that cannot arrive, printed on the Support page,
 * the Privacy Policy, the Terms and the footer of every email.
 *
 * Everything imports this. Four files used to spell it out instead, which is
 * why changing it once took a commit rather than a keystroke; see the
 * "defined exactly once" rule in contact-address.test.ts.
 */
export const SUPPORT_EMAIL = "hello@meetrao.com";

/**
 * How Meetrao describes its operator in legal text.
 *
 * A sole proprietorship, deliberately not a person's name: the service is
 * identified by its name, its address and its support address. If Meetrao ever
 * incorporates, this is the one line to change. The Terms and the Privacy
 * Policy both read from it.
 */
export const OPERATOR = "Meetrao, an independently operated service";
