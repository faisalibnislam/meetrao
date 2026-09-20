/* Convex Auth is the identity provider, and the only one.
 *
 * It used to sit beside a `customJwt` entry for Supabase so that both issuers
 * were accepted at once and the cutover was reversible in either direction.
 * That entry is gone: the cutover happened, every account signs in here now,
 * and an issuer we no longer control is an issuer nobody should be able to
 * present a token from.
 *
 * `CONVEX_SITE_URL` is set by Convex itself on every deployment — nothing to
 * configure, and nothing that can drift between dev and production.
 */
const authConfig = {
  providers: [{ domain: process.env.CONVEX_SITE_URL, applicationID: "convex" }],
};

export default authConfig;
