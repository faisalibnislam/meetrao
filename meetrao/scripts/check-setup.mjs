#!/usr/bin/env node
/**
 * Setup doctor. Reports what is configured, what is missing, and what each
 * missing piece actually costs you — so a half-configured deployment is
 * obvious rather than mysterious.
 *
 *   npm run setup:check
 */
import { createClient } from "@supabase/supabase-js";

const ok = (s) => `\x1b[32m✓\x1b[0m ${s}`;
const bad = (s) => `\x1b[31m✗\x1b[0m ${s}`;
const warn = (s) => `\x1b[33m!\x1b[0m ${s}`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

const env = process.env;
let blocking = 0;

console.log("\nMeetrao — setup check\n");

/* ── 1. Environment ─────────────────────────────────────────────────────── */
console.log("Environment");

for (const name of [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
]) {
  if (env[name]) {
    console.log("  " + ok(name));
  } else {
    blocking++;
    console.log("  " + bad(`${name} — the app cannot talk to Supabase at all`));
  }
}

console.log(
  "  " +
    (env.SUPABASE_SERVICE_ROLE_KEY
      ? ok("SUPABASE_SERVICE_ROLE_KEY")
      : warn(
          "SUPABASE_SERVICE_ROLE_KEY — every screen still renders, but nobody can complete a booking",
        )),
);

const google = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
console.log(
  "  " +
    (google
      ? ok("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET")
      : warn(
          "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET — no calendar conflict checks and no Meet links",
        )),
);

const site = (env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
if (!site) {
  console.log(
    "  " + warn("NEXT_PUBLIC_SITE_URL — defaulting to http://localhost:3000"),
  );
} else {
  console.log("  " + ok(`NEXT_PUBLIC_SITE_URL = ${site}`));
  if (google) {
    console.log(
      "    " +
        dim(`Google redirect URI must be exactly ${site}/api/google/callback`),
    );
  }
}

const base = site || "http://localhost:3000";

/* ── 2. Database ────────────────────────────────────────────────────────── */
if (blocking === 0) {
  console.log("\nDatabase");

  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } },
  );

  try {
    // Hits the public booking surface — exactly what a guest's browser uses.
    const { error } = await supabase.rpc("get_public_host", {
      p_username: "__setup_check__",
    });

    if (error) {
      blocking++;
      console.log("  " + bad(`RPC get_public_host failed: ${error.message}`));

      // Reaching the host and finding no function are different problems with
      // different fixes; say which one this is.
      const looksLikeNetwork =
        /allowlist|egress|ENOTFOUND|ECONNREFUSED|EAI_AGAIN|certificate|proxy|fetch failed|timed out/i.test(
          error.message,
        );

      console.log(
        "    " +
          dim(
            looksLikeNetwork
              ? "This is a connectivity problem, not a schema one — the Supabase host is unreachable from here."
              : "Have the migrations in supabase/migrations been applied, in order?",
          ),
      );
    } else {
      console.log("  " + ok("migrations applied — public booking RPCs reachable"));

      const demo = env.NEXT_PUBLIC_DEMO_USERNAME;
      if (demo) {
        const { data } = await supabase.rpc("get_public_host", {
          p_username: demo,
        });
        if (data?.length) {
          const types = await supabase.rpc("get_public_meeting_types", {
            p_username: demo,
          });
          console.log(
            "  " +
              ok(
                `demo host "${demo}" is bookable — ${types.data?.length ?? 0} active meeting(s)`,
              ),
          );
          console.log("    " + dim(`try ${base}/${demo}`));
        } else {
          console.log(
            "  " +
              warn(`NEXT_PUBLIC_DEMO_USERNAME is "${demo}" but no such host exists`),
          );
        }
      }
    }
  } catch (err) {
    blocking++;
    console.log("  " + bad(`could not reach Supabase: ${err.message}`));
  }
}

/* ── Verdict ────────────────────────────────────────────────────────────── */
console.log(
  "\n" +
    (blocking === 0
      ? ok("Ready. Run `npm run dev`.")
      : bad(`${blocking} blocking problem(s) — see above.`)) +
    "\n",
);

process.exit(blocking === 0 ? 0 : 1);
