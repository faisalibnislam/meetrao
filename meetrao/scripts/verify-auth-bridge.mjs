#!/usr/bin/env node
/**
 * Closes the gap left open in docs/decisions/auth-provider.md: a REAL
 * Supabase-issued token, presented to Convex.
 *
 * Creates a throwaway user, signs in, calls Convex, then deletes the user and
 * the rows the handle_new_user trigger left behind in Postgres. Run it and the
 * database ends where it started.
 */
import { createClient } from "@supabase/supabase-js";
import { ConvexHttpClient } from "convex/browser";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const env = { ...process.env };
const f = resolve(process.cwd(), ".env.local");
if (existsSync(f)) for (const line of readFileSync(f, "utf8").split("\n")) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });

const email = `convex-bridge-check+${Date.now()}@meetrao.com`;
const password = `${crypto.randomUUID()}Aa1!`;
let userId = null;
let failures = 0;
const check = (label, ok, detail) => {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
};

try {
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name: "Bridge Check" },
  });
  if (createErr) throw createErr;
  userId = created.user.id;
  console.log(`\nThrowaway user ${userId}\n`);

  const { data: signIn, error: signInErr } = await anon.auth.signInWithPassword({ email, password });
  if (signInErr) throw signInErr;
  const token = signIn.session.access_token;

  const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
  const header = JSON.parse(Buffer.from(token.split(".")[0], "base64").toString());
  check("token is ES256", header.alg === "ES256", header.alg);
  check("audience is 'authenticated'", claims.aud === "authenticated", String(claims.aud));
  check("sub is the user id", claims.sub === userId, claims.sub);

  const convex = new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL);
  convex.setAuth(token);
  const who = await convex.query("whoami:identity", {});
  check("Convex ACCEPTS the real Supabase token", who.authenticated === true, JSON.stringify(who));
  check("subject survives into Convex", who.subject === userId, String(who.subject));
  check("issuer is the Supabase project", String(who.issuer).includes("/auth/v1"), String(who.issuer));

  const anonClient = new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL);
  const anonWho = await anonClient.query("whoami:identity", {});
  check("no token reads as unauthenticated", anonWho.authenticated === false, JSON.stringify(anonWho));
} catch (e) {
  check("bridge check ran", false, e?.message ?? String(e));
} finally {
  if (userId) {
    await admin.from("admin_activity").delete().eq("actor_id", userId);
    const { error } = await admin.auth.admin.deleteUser(userId);
    console.log(`\nCleanup: user deleted${error ? ` (FAILED: ${error.message})` : ""}`);
    const { count } = await admin.from("profiles").select("*", { count: "exact", head: true }).eq("id", userId);
    console.log(`Cleanup: profiles rows remaining for that id = ${count ?? 0}`);
  }
}
process.exit(failures ? 1 : 0);
