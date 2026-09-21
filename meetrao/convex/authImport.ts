import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

/* ─────────────────────────────────────────────────────────────────────────────
   Importing the Supabase users into Convex Auth.

   One `users` row and one `authAccounts` row per person. The account's
   `secret` is the bcrypt hash straight from `auth.users.encrypted_password`;
   convex/authCrypto.ts verifies it on first sign-in and every new password is
   written as Scrypt, so nobody is asked to reset anything.

   `supabase_id` is the load-bearing field: it is what convex/lib/auth.ts
   resolves to keep `profiles.id` — and therefore every user-keyed row —
   valid across the issuer change.

   Idempotent. Re-running updates rather than duplicating, because the import
   WILL be re-run: the hashes change whenever someone changes their password,
   and the real cutover wants a fresh copy.
   ───────────────────────────────────────────────────────────────────────────── */

export const importUsers = internalMutation({
  args: {
    users: v.array(
      v.object({
        supabaseId: v.string(),
        email: v.string(),
        name: v.optional(v.string()),
        emailVerified: v.boolean(),
        /** bcrypt from Supabase, or null for a Google-only account. */
        passwordHash: v.union(v.string(), v.null()),
        hasGoogle: v.boolean(),
      }),
    ),
  },
  handler: async (ctx, a) => {
    let created = 0, updated = 0, passwords = 0, googles = 0;

    for (const u of a.users) {
      const email = u.email.trim().toLowerCase();

      const existing = await ctx.db
        .query("users")
        .withIndex("by_supabase_id", (q) => q.eq("supabase_id", u.supabaseId))
        .unique();

      const fields = {
        email,
        name: u.name,
        // Supabase's confirmed-at drives the /verify gate; carrying it over
        // means a verified host is not asked to verify again.
        emailVerificationTime: u.emailVerified ? Date.now() : undefined,
        supabase_id: u.supabaseId,
      };

      const userId = existing
        ? (await ctx.db.patch(existing._id, fields), updated++, existing._id)
        : (created++, await ctx.db.insert("users", fields));

      if (u.passwordHash) {
        const account = await ctx.db
          .query("authAccounts")
          .withIndex("providerAndAccountId", (q) =>
            q.eq("provider", "password").eq("providerAccountId", email),
          )
          .unique();

        const accountFields = {
          userId,
          provider: "password",
          providerAccountId: email,
          secret: u.passwordHash,
          emailVerified: u.emailVerified ? email : undefined,
        };
        if (account) await ctx.db.patch(account._id, accountFields);
        else await ctx.db.insert("authAccounts", accountFields);
        passwords++;
      }

      if (u.hasGoogle) {
        const account = await ctx.db
          .query("authAccounts")
          .withIndex("providerAndAccountId", (q) =>
            q.eq("provider", "google").eq("providerAccountId", email),
          )
          .unique();
        // Google accounts are matched on verified email at first sign-in, so
        // only the link is seeded here — never a token.
        if (!account) {
          await ctx.db.insert("authAccounts", {
            userId, provider: "google", providerAccountId: email, emailVerified: email,
          });
        }
        googles++;
      }
    }

    return { created, updated, passwords, googles };
  },
});

export const importedUsers = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("users").collect();
    return rows.map((u) => ({
      email: u.email,
      supabase_id: u.supabase_id ?? null,
      verified: Boolean(u.emailVerificationTime),
    }));
  },
});

/** Removes an imported account. Verification scripts must leave nothing behind. */
export const purgeUser = internalMutation({
  args: { supabaseId: v.string() },
  handler: async (ctx, a) => {
    const user = await ctx.db
      .query("users").withIndex("by_supabase_id", (q) => q.eq("supabase_id", a.supabaseId)).unique();
    if (!user) return { users: 0, accounts: 0 };
    let accounts = 0;
    for (const acc of await ctx.db.query("authAccounts").withIndex("userIdAndProvider", (q) => q.eq("userId", user._id)).collect()) {
      await ctx.db.delete(acc._id);
      accounts++;
    }
    await ctx.db.delete(user._id);
    return { users: 1, accounts };
  },
});

/** Removes only a password account, leaving the user row intact. Test cleanup. */
export const purgePasswordAccount = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, a) => {
    const acc = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", a.email.trim().toLowerCase()),
      )
      .unique();
    if (!acc) return { removed: 0 };
    await ctx.db.delete(acc._id);
    return { removed: 1 };
  },
});

/**
 * The most recent verification code for an address.
 *
 * Migration-only, and internal: it hands out a code that would let the caller
 * complete a password reset, which is exactly why no client may reach it. It
 * exists so the reset flow can be verified end to end without anyone's inbox
 * — the delivery half is Resend's, and Resend is already proven.
 */
export const latestVerificationCode = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, a) => {
    const email = a.email.trim().toLowerCase();
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) => q.eq("provider", "password").eq("providerAccountId", email))
      .unique();
    if (!account) return null;

    const codes = await ctx.db
      .query("authVerificationCodes")
      .withIndex("accountId", (q) => q.eq("accountId", account._id))
      .collect();
    if (!codes.length) return null;

    const newest = codes.sort((x, y) => y._creationTime - x._creationTime)[0];
    return { code: newest.code, expires: newest.expirationTime };
  },
});

/** Removes an account created BY Convex Auth, and everything it owns. */
export const purgeNewUser = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, a) => {
    const email = a.email.trim().toLowerCase();
    const user = await ctx.db.query("users").withIndex("email", (q) => q.eq("email", email)).unique();
    if (!user) return { users: 0 };

    const owner = user._id as unknown as string;
    let rows = 0;
    for (const t of ["contacts", "meeting_types", "notifications", "availability_rules", "availability_schedules"] as const) {
      for (const r of await ctx.db.query(t).withIndex("by_user", (q) => q.eq("user_id", owner)).collect()) {
        await ctx.db.delete(r._id);
        rows++;
      }
    }
    const profile = await ctx.db.query("profiles").withIndex("by_uuid", (q) => q.eq("id", owner)).unique();
    if (profile) await ctx.db.delete(profile._id);

    for (const act of await ctx.db.query("admin_activity").withIndex("by_created").order("desc").take(200)) {
      if (act.actor_id === owner) await ctx.db.delete(act._id);
    }
    for (const acc of await ctx.db.query("authAccounts").withIndex("userIdAndProvider", (q) => q.eq("userId", user._id)).collect()) {
      await ctx.db.delete(acc._id);
    }
    await ctx.db.delete(user._id);
    return { users: 1, profile: profile ? 1 : 0, rows };
  },
});

/** The profile belonging to an address. Verification only. */
/**
 * What KIND of password an account holds — never the hash itself.
 *
 * Answers "should this password still work?" without anyone having to reason
 * from a changelog. A bcrypt secret came in from Supabase at the cutover and
 * the old password is expected to work; a Scrypt one was set here since; none
 * means the account has no password credential at all and only Google or a
 * reset can get in.
 *
 * internalQuery, so no client can reach it, and it returns a word rather than
 * anything derived from the secret.
 */
export const passwordKind = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, a) => {
    const email = a.email.trim().toLowerCase();
    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", email),
      )
      .collect();

    const google = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "google").eq("providerAccountId", email),
      )
      .collect();

    return {
      passwordAccounts: accounts.length,
      googleAccounts: google.length,
      kind: accounts.map((acc) => {
        const secret = (acc as { secret?: string }).secret;
        if (!secret) return "none";
        if (/^\$2[aby]?\$/.test(secret)) return "bcrypt (imported from Supabase)";
        return "scrypt (set on Convex)";
      }),
    };
  },
});

export const profileFor = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, a) => {
    const user = await ctx.db
      .query("users").withIndex("email", (q) => q.eq("email", a.email.trim().toLowerCase())).unique();
    if (!user) return null;
    const p = await ctx.db
      .query("profiles").withIndex("by_uuid", (q) => q.eq("id", user._id as unknown as string)).unique();
    if (!p) return null;
    return { id: p.id, username: p.username, email: p.email, onboarding_completed_at: p.onboarding_completed_at };
  },
});
