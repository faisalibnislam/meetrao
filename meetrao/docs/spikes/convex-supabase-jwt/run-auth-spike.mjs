import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api.js";
import { readFileSync } from "node:fs";

const url = /CONVEX_URL=(.*)/.exec(readFileSync(".env.local", "utf8"))[1].trim();
const t = JSON.parse(readFileSync("tokens.json", "utf8"));
const ok = (s) => `\x1b[32m${s}\x1b[0m`, bad = (s) => `\x1b[31m${s}\x1b[0m`;
let failures = 0;
const check = (label, cond, detail) => {
  console.log(`  ${cond ? ok("PASS") : bad("FAIL")}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!cond) failures++;
};

async function whoAmI(token) {
  const c = new ConvexHttpClient(url);
  if (token) c.setAuth(token);
  try { return { ...(await c.query(api.identity.whoAmI, {})) }; }
  catch (e) { return { error: e?.message ?? String(e) }; }
}

console.log("\nSupabase-shaped JWT against a Convex customJwt provider (ES256, aud=authenticated)\n");

const a = await whoAmI(t.valid);
check("valid token authenticates", a.authenticated === true, JSON.stringify(a));
check("subject survives as the Supabase user id", a.subject === "11111111-1111-1111-1111-111111111111", a.subject);
check("issuer is preserved", a.issuer === "http://127.0.0.1:4455/auth/v1", a.issuer);
check("email claim is readable", a.email === "host@example.com", String(a.email));

const b = await whoAmI(t.wrongAud);
check("wrong audience is REJECTED", b.authenticated !== true, b.error ? b.error.slice(0, 80) : JSON.stringify(b));

const c = await whoAmI(t.expired);
check("expired token is REJECTED", c.authenticated !== true, c.error ? c.error.slice(0, 80) : JSON.stringify(c));

const d = await whoAmI(null);
check("no token is unauthenticated", d.authenticated === false, JSON.stringify(d));

console.log(failures === 0 ? ok("\nAll checks passed.\n") : bad(`\n${failures} check(s) failed.\n`));
process.exit(failures ? 1 : 0);
