import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import bcrypt from "bcryptjs";
import { Scrypt } from "lucia";

/* ─────────────────────────────────────────────────────────────────────────────
   Password hashing across the migration.

   Supabase stores bcrypt (`$2a$10$`, 60 characters) in
   `auth.users.encrypted_password`. Convex Auth hashes with Scrypt by default.
   Rather than force four people to reset their passwords, `verifySecret`
   accepts BOTH: a bcrypt hash is verified with bcrypt, anything else with
   Scrypt.

   `hashSecret` only ever writes Scrypt, so an imported bcrypt hash is a
   one-way door in the right direction, the first password change moves that
   account to the modern hash and it never goes back.

   `bcryptjs` rather than `bcrypt`: the latter is a native binding and will not
   load in Convex's runtime.

   And `compareSync`, not `compare`. The async form yields with `setTimeout`,
   which Convex forbids outside actions, sign-in fails with "Can't use
   setTimeout in queries". The synchronous form does the same work without
   yielding. It is CPU-bound for a few milliseconds at cost 10, which is the
   point of a password hash.
   ───────────────────────────────────────────────────────────────────────────── */

const scrypt = new Scrypt();

const isBcrypt = (hash: string) => /^\$2[aby]?\$/.test(hash);

export const passwordCrypto = {
  /** New and changed passwords. Never bcrypt. That is inbound only. */
  async hashSecret(secret: string): Promise<string> {
    return await scrypt.hash(secret);
  },

  async verifySecret(secret: string, hash: string): Promise<boolean> {
    try {
      return isBcrypt(hash) ? bcrypt.compareSync(secret, hash) : await scrypt.verify(hash, secret);
    } catch {
      // A malformed or unrecognised hash is a failed sign-in, not a crash.
      return false;
    }
  },
};

/** Proof that both hashers run in this runtime. Migration-only. */
export const probe = internalAction({
  args: { password: v.string(), hash: v.string() },
  handler: async (_ctx, a) => {
    const matches = await passwordCrypto.verifySecret(a.password, a.hash);
    const wrong = await passwordCrypto.verifySecret(`${a.password}-wrong`, a.hash);
    const roundTrip = await passwordCrypto.verifySecret(
      a.password,
      await passwordCrypto.hashSecret(a.password),
    );
    return {
      kind: isBcrypt(a.hash) ? "bcrypt" : "scrypt",
      matches,
      wrongRejected: !wrong,
      scryptRoundTrip: roundTrip,
    };
  },
});
