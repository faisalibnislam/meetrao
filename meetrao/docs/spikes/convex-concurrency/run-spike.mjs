import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api.js";
import { readFileSync } from "node:fs";

const url = /CONVEX_URL=(.*)/.exec(readFileSync(".env.local", "utf8"))[1].trim();
const client = new ConvexHttpClient(url);

const SLOT = Date.parse("2026-10-01T10:00:00Z");
const ok = (s) => `\x1b[32m${s}\x1b[0m`;
const bad = (s) => `\x1b[31m${s}\x1b[0m`;

/** Fire n mutations with no await between them, so they are genuinely in flight together. */
async function race(calls) {
  const results = await Promise.allSettled(calls.map((c) => client.mutation(api.booking.createBooking, c)));
  const won = results.filter((r) => r.status === "fulfilled");
  const taken = results.filter((r) => r.status === "rejected" && /slot taken/.test(r.reason?.message ?? ""));
  const other = results.filter((r) => r.status === "rejected" && !/slot taken/.test(r.reason?.message ?? ""));
  return { won, taken, other, results };
}


/** The real invariant, and the one the EXCLUDE constraint enforces in Postgres:
 *  no two committed confirmed bookings may conflict under the buffer rule. */
function noPairConflicts(rows, bufferMinutes) {
  const B = bufferMinutes * 60_000;
  for (let i = 0; i < rows.length; i++)
    for (let j = i + 1; j < rows.length; j++) {
      const [a, b] = [rows[i], rows[j]];
      if (b.endsAt + B > a.startsAt && b.startsAt - B < a.endsAt) return `rows ${i},${j} conflict`;
    }
  return null;
}

const booking = (over = {}) => ({
  hostId: "host-a", startsAt: SLOT, durationMinutes: 30, bufferMinutes: 0,
  guestEmail: "g@example.com", ...over,
});

let failures = 0;
const check = (label, cond, detail) => {
  console.log(`  ${cond ? ok("PASS") : bad("FAIL")}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!cond) failures++;
};

// ── Test 1: N concurrent bookings for the identical slot ────────────────────
console.log("\nTest 1 — 25 concurrent requests, identical slot");
await client.mutation(api.booking.reset, {});
{
  const N = 25;
  const { won, taken, other } = await race(
    Array.from({ length: N }, (_, i) => booking({ guestEmail: `guest${i}@example.com` })),
  );
  const rows = await client.query(api.booking.confirmedFor, { hostId: "host-a" });
  check("exactly one request succeeded", won.length === 1, `${won.length} won / ${taken.length} "slot taken"`);
  check("exactly one row committed", rows.length === 1, `${rows.length} rows`);
  check("no unexpected error reached the client", other.length === 0,
    other.length ? other[0].reason?.message?.slice(0, 120) : "none");
}

// ── Test 2: the buffer window, not just exact equality ──────────────────
// NOTE: "exactly one winner" is the WRONG assertion here. Starts are 5 min
// apart with a 30 min duration and a 15 min buffer, so the first and last
// candidates are buffer-adjacent and may both legally commit. Assert the
// invariant instead of a winner count.
console.log("\nTest 2 — 10 concurrent requests, staggered starts inside a 15-min buffer");
await client.mutation(api.booking.reset, {});
{
  const { won, taken, other } = await race(
    Array.from({ length: 10 }, (_, i) =>
      booking({ startsAt: SLOT + i * 5 * 60_000, bufferMinutes: 15, guestEmail: `b${i}@example.com` }),
    ),
  );
  const rows = (await client.query(api.booking.confirmedFor, { hostId: "host-a" })).sort((a, b) => a.startsAt - b.startsAt);
  const clash = noPairConflicts(rows, 15);
  check("no two committed bookings conflict", clash === null, clash ?? `${rows.length} committed, all legal`);
  check("winners match committed rows", won.length === rows.length, `${won.length} won / ${taken.length} "slot taken" / ${rows.length} rows`);
  check("no unexpected error reached the client", other.length === 0,
    other.length ? other[0].reason?.message?.slice(0, 120) : "none");
}

// ── Test 3: non-conflicting concurrency must NOT be rejected ────────────────
console.log("\nTest 3 — 20 concurrent NON-overlapping bookings (false-rejection check)");
await client.mutation(api.booking.reset, {});
{
  const { won, taken, other } = await race(
    Array.from({ length: 20 }, (_, i) =>
      booking({ startsAt: SLOT + i * 60 * 60_000, guestEmail: `n${i}@example.com` }),
    ),
  );
  const rows = await client.query(api.booking.confirmedFor, { hostId: "host-a" });
  check("all 20 succeeded", won.length === 20, `${won.length} won / ${taken.length} rejected`);
  check("20 rows committed", rows.length === 20, `${rows.length} rows`);
  check("no unexpected error reached the client", other.length === 0,
    other.length ? other[0].reason?.message?.slice(0, 120) : "none");
}

// ── Test 4: repeat the hot race to catch flakiness ──────────────────────────
console.log("\nTest 4 — 30 repeated trials of the hot race (8 racers each)");
{
  let everyTrialExactlyOne = true;
  let worst = null;
  for (let t = 0; t < 30; t++) {
    await client.mutation(api.booking.reset, {});
    const { won, other } = await race(
      Array.from({ length: 8 }, (_, i) => booking({ guestEmail: `t${t}-${i}@example.com` })),
    );
    const rows = await client.query(api.booking.confirmedFor, { hostId: "host-a" });
    if (won.length !== 1 || rows.length !== 1 || noPairConflicts(rows, 0)) { everyTrialExactlyOne = false; worst = { t, won: won.length, rows: rows.length }; }
    if (other.length) { everyTrialExactlyOne = false; worst = { t, err: other[0].reason?.message }; }
  }
  check("all 30 trials committed exactly one booking", everyTrialExactlyOne,
    worst ? JSON.stringify(worst) : "240 racers, 30 winners, 0 double-bookings");
}

console.log(failures === 0 ? ok("\nAll checks passed.\n") : bad(`\n${failures} check(s) failed.\n`));
process.exit(failures === 0 ? 0 : 1);
