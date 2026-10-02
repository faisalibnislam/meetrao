import Google from "@auth/core/providers/google";
import Resend from "@auth/core/providers/resend";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { passwordCrypto } from "./authCrypto";
import { sendResetEmail, sendVerifyEmail } from "./lib/emails";
import type { DataModel } from "./_generated/dataModel";
import { createProfileForNewUser } from "./profiles";

/* ─────────────────────────────────────────────────────────────────────────────
   Convex Auth.

   The only identity provider. It ran beside Supabase Auth during the cutover,
   with convex/auth.config.ts accepting both issuers at once so the app could be
   repointed either way; that entry is gone now.

   Two properties are deliberate and both fail silently if lost:

     · sign-in must give ONE message for "no such account" and "wrong
       password", or the form becomes an account-enumeration oracle;
     · password reset must not reveal whether an address is registered.

   Convex Auth does not leak either by default; the risk is in what the UI does
   with the errors, so both are enforced in src/components/auth/auth-form.tsx,
   one `GENERIC` string for every sign-in failure, and a reset that routes to
   the same confirmation whether or not the address exists.
   ───────────────────────────────────────────────────────────────────────────── */

const passwordProvider = Password<DataModel>({
  // Scrypt for everything created here, plus bcrypt for anything imported.
  // See the note in convex/authCrypto.ts. The bcrypt half has no users left
  // and is kept only because removing a verifier is a one-way door.
  crypto: passwordCrypto,

  /**
   * Email is the identity, and it is normalised here so that
   * `Guest@Example.COM` and `guest@example.com` cannot become two accounts,
   * which is what `lower(btrim(...))` did on the Postgres side.
   */
  profile(params) {
    const email = String(params.email ?? "").trim().toLowerCase();
    const name = String(params.name ?? "").trim();
    return { email, name: name || undefined };
  },

  /** The app's own rule, kept verbatim: at least 8 characters. */
  validatePasswordRequirements(password: string) {
    if (password.length < 8) throw new Error("Use at least 8 characters.");
  },

  /* Verification and reset both go through Resend, which already sends every
     other transactional email this product produces.

     `sendVerificationRequest` is overridden on BOTH, and that override is the
     whole point: without it Auth.js sends its own default template, so the
     only two messages in the product that are not Meetrao-branded (and the
     only two with no postal address in the footer) were the two that arrive
     before anyone has an account. See convex/lib/emails.ts.

     `token` is the plaintext code. The stored copy is sha256-hashed, so this
     callback is the only place it is ever legible; it must not be logged and
     must not be returned. */
  verify: Resend({
    apiKey: process.env.AUTH_RESEND_KEY,
    from: process.env.EMAIL_FROM,
    sendVerificationRequest: async ({ identifier, token, expires }) =>
      await sendVerifyEmail(identifier, token, expires),
  }),
  reset: Resend({
    apiKey: process.env.AUTH_RESEND_KEY,
    from: process.env.EMAIL_FROM,
    sendVerificationRequest: async ({ identifier, token, expires }) =>
      await sendResetEmail(identifier, token, expires),
  }),
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  /* THE REPLACEMENT FOR `handle_new_user`.
     Postgres created a profile, generated a username and set the admin flag on
     every insert into auth.users, without anyone asking. Convex Auth has no
     triggers either, but it does have this hook, which is the same guarantee
     in the same place: every path that can produce a user runs it, so a
     sign-up cannot end with an account that has no profile.

     Deliberately not done in the app after signIn: that would be one more
     thing every new entry point has to remember, and forgetting it produces an
     account that can authenticate and then lands on "no profile" forever. */
  callbacks: {
    async afterUserCreatedOrUpdated(ctx, { userId, existingUserId }) {
      if (existingUserId) return; // an existing account signing in again
      await createProfileForNewUser(ctx, userId);
    },
  },
  providers: [
    passwordProvider,
    // The SAME OAuth client the calendar integration uses, so a host is not
    // asked to authorise Google twice.
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
});
