import { internalMutation } from "./_generated/server";
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
