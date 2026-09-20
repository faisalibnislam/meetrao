import Google from "@auth/core/providers/google";
import Resend from "@auth/core/providers/resend";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { passwordCrypto } from "./authCrypto";
import type { DataModel } from "./_generated/dataModel";
import { createProfileForNewUser } from "./profiles";

/* ─────────────────────────────────────────────────────────────────────────────
   Convex Auth.

   Running BESIDE Supabase Auth, not instead of it — convex/auth.config.ts
   accepts both issuers at once, so this can be switched on, watched, and
   switched back without anyone being locked out. Supabase stays the live
   identity provider until the app is repointed.

   Two properties of src/lib/actions/auth.ts must survive the port here,
   because both are deliberate and both fail silently if lost:

     · sign-in must give ONE message for "no such account" and "wrong
       password", or the form becomes an account-enumeration oracle;
     · password reset must not reveal whether an address is registered.

   Convex Auth does not leak either by default; the risk is in what the UI
   does with the errors, so the check belongs in the port of the forms rather
   than here. It is on the runbook's checklist.
   ───────────────────────────────────────────────────────────────────────────── */

const passwordProvider = Password<DataModel>({
  // Verifies bcrypt (imported from Supabase) and Scrypt (everything since).
  // See the note in convex/authCrypto.ts.
  crypto: passwordCrypto,

  /**
   * Email is the identity, and it is normalised here so that
   * `Guest@Example.COM` and `guest@example.com` cannot become two accounts —
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

  // Verification and reset both go through Resend, which already sends every
  // other transactional email this product produces.
  verify: Resend({ apiKey: process.env.AUTH_RESEND_KEY, from: process.env.EMAIL_FROM }),
  reset: Resend({ apiKey: process.env.AUTH_RESEND_KEY, from: process.env.EMAIL_FROM }),
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  /* THE REPLACEMENT FOR `handle_new_user`.
     Postgres created a profile, generated a username and set the admin flag on
     every insert into auth.users, without anyone asking. Convex Auth has no
     triggers either, but it does have this hook — which is the same guarantee
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
