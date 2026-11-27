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
export const POSTAL_ADDRESS = "5242 Elbetee Lane, Alexandria, VA 22312, USA";

/**
 * The legal entity that operates Meetrao. Meetrao is the product; this is the
 * company behind it, named in the Terms, the Privacy Policy, the footer, the
 * email footers and the Organization structured data.
 */
export const OPERATOR_NAME = "Space Cherries LLC";

/** The operator's own website, linked wherever the operator is named. */
export const OPERATOR_URL = "https://www.spacecherries.com";

/** The operator's website as a reader sees it, without the scheme. */
export const OPERATOR_SITE = "www.spacecherries.com";

/**
 * The line at the foot of every email: who operates the service and where.
 * The default for EMAIL_POSTAL_ADDRESS, and the value that setting should
 * hold on every Convex deployment.
 */
export const OPERATOR_LINE = `Meetrao is operated by ${OPERATOR_NAME}, ${POSTAL_ADDRESS}`;

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

