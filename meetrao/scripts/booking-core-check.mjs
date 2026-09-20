#!/usr/bin/env node
/**
 * The booking core, against the real Convex deployment.
 *
 * Creates bookings for a real host on a date far in the future, asserts the
 * guard, the trigger effects and the rate limiter, then deletes everything it
 * made. Nothing it touches belongs to anyone else.
 */
import { createClient } from "@supabase/supabase-js";
import { ConvexHttpClient } from "convex/browser";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

const env = { ...process.env };
const f = resolve(process.cwd(), ".env.local");
if (existsSync(f)) for (const line of readFileSync(f, "utf8").split("\n")) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const URL_ = env.NEXT_PUBLIC_CONVEX_URL;

let failures = 0;
const check = (label, ok, detail) => {
  console.log(`    ${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
};
const msg = (e) => e?.data?.message ?? e?.message ?? String(e);

async function sessionFor(email) {
  const { data } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data: v } = await anon.auth.verifyOtp({ type: "magiclink", token_hash: data.properties.hashed_token });
  return v.session.access_token;
}

const guest = new ConvexHttpClient(URL_);

/* The host is DISCOVERED, never named.
   src/lib/contact-address.test.ts forbids retired identities appearing in the
   source, and hardcoding a username here tripped it — correctly. Picking the
   first host that has an active meeting type also means this keeps working
   when the seed data changes. */
const { data: candidates } = await admin
  .from("profiles")
  .select("id, username, email, is_suspended")
  .eq("is_suspended", false)
  .order("created_at");

let host = null;
let types = [];
for (const c of candidates ?? []) {
  const found = await guest.query("publicBooking:getMeetingTypes", { username: c.username });
  if (found.length) { host = c; types = found; break; }
}
if (!host) {
  console.error("No host with an active meeting type — nothing to check.");
  process.exit(1);
}
const username = host.username;
const slug = types[0].slug;
console.log(`\n  Host ${username}, meeting "${types[0].name}" (${types[0].duration_minutes}m)\n`);

const hostToken = await sessionFor(host.email);
const asHost = new ConvexHttpClient(URL_);
asHost.setAuth(hostToken);

const made = [];
const baseline = {
  notifications: (await asHost.query("notifications:listOwn", {})).length,
  contacts: (await asHost.query("contacts:listOwn", {})).length,
};

/** A Monday far out, 10:00 in the host's zone — inside the seeded 09:00–17:00. */
function mondayAt(weeksAhead, hour) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + weeksAhead * 7);
  while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(hour, 0, 0, 0);
  return d.getTime();
}

// The booking window caps how far ahead we may book; stay inside it.
const avail = await guest.query("publicBooking:getMeetingAvailability", { username, slug });
const windowDays = avail.meeting.booking_window_days;
const target = mondayAt(1, 4); // 04:00 UTC = 10:00 Asia/Dhaka
check("target is inside the booking window", target < Date.now() + windowDays * 864e5, `${windowDays}d window`);

// ── 1. concurrency, against the real deployment ─────────────────────────────
const RACERS = 12;
const results = await Promise.allSettled(
  Array.from({ length: RACERS }, (_, i) =>
    guest.mutation("publicBooking:createBooking", {
      username, slug, startsAt: target,
      guestName: `Racer ${i}`, guestEmail: `booking-core-check+${i}@example.com`,
    }),
  ),
);
const won = results.filter((r) => r.status === "fulfilled");
const taken = results.filter((r) => r.status === "rejected" && /slot taken/i.test(msg(r.reason)));
for (const w of won) made.push(w.value.reference);
check(`${RACERS} concurrent guests, one slot: exactly one wins`, won.length === 1, `${won.length} won / ${taken.length} "slot taken"`);

// ── 2. the trigger effects fired ────────────────────────────────────────────
const notifsAfter = await asHost.query("notifications:listOwn", {});
const contactsAfter = await asHost.query("contacts:listOwn", {});
check("a notification was written for the host", notifsAfter.length === baseline.notifications + 1, `${baseline.notifications} → ${notifsAfter.length}`);
check("the guest became a contact", contactsAfter.length === baseline.contacts + 1, `${baseline.contacts} → ${contactsAfter.length}`);
check("the notification names the guest and meeting", /Racer \d+ booked/.test(notifsAfter[0]?.title ?? ""), notifsAfter[0]?.title);

// ── 3. the guards still refuse what Postgres refused ────────────────────────
/* The unavailable time is DERIVED by scanning, using the SAME host-local
   weekday/minute computation the server uses (convex/lib/zoned.ts).

   Two earlier versions got this wrong and blamed the guard: one assumed Sunday
   was closed, and the harness picked a host who works Sundays; the next tried
   to do timezone arithmetic by hand. Asking Intl the same question the server
   asks is the only version that cannot drift. */
const hostProfile = (await admin.from("profiles").select("timezone").eq("id", host.id).single()).data;
const hostTimezone = hostProfile.timezone || "UTC";

function hostLocal(atMs) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: hostTimezone, weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(atMs));
  const get = (t) => parts.find((p) => p.type === t)?.value ?? "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { weekday, minute: (Number(get("hour")) % 24) * 60 + Number(get("minute")) };
}

function unavailableSlot() {
  const duration = avail.meeting.duration_minutes;
  // Start well inside the booking window so only availability can refuse it.
  for (let step = 0; step < 14 * 48; step++) {
    const at = Date.now() + 3 * 864e5 + step * 30 * 60_000;
    const { weekday, minute } = hostLocal(at);
    const fits = avail.rules.some(
      (r) => r.weekday === weekday && minute >= r.start_minute && minute + duration <= r.end_minute,
    );
    if (!fits) return { at, why: `${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][weekday]} ${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")} host-local` };
  }
  return null;
}

const unavailable = unavailableSlot();
check("found a time this host is not available", unavailable !== null, unavailable?.why);
const guards = [
  ...(unavailable ? [[`outside availability (${unavailable.why})`, { startsAt: unavailable.at, guestEmail: "booking-core-check-g1@example.com" }, /outside availability/i]] : []),
  ["beyond the booking window", { startsAt: Date.now() + (windowDays + 30) * 864e5, guestEmail: "booking-core-check-g2@example.com" }, /booking window/i],
  ["inside minimum notice", { startsAt: Date.now() + 60_000, guestEmail: "booking-core-check-g3@example.com" }, /minimum notice|outside availability/i],
];
for (const [label, over, pattern] of guards) {
  try {
    const r = await guest.mutation("publicBooking:createBooking", {
      username, slug, guestName: "Guard", ...over,
    });
    made.push(r.reference);
    check(label, false, "was ACCEPTED");
  } catch (e) {
    check(label, pattern.test(msg(e)), msg(e).slice(0, 60));
  }
}

// ── 4. the rate limiter bites ───────────────────────────────────────────────
// Slots two days apart so nothing can collide: the limiter must be the ONLY
// reason an attempt is refused. An earlier version spaced them by an hour,
// some collided with existing bookings, and the run never made a sixth VALID
// attempt — so it reported the limiter broken when the limiter was fine.
function weekdaySlot(dayOffset) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + dayOffset);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(4, 0, 0, 0); // 10:00 Asia/Dhaka, inside the seeded 09:00–17:00
  return d.getTime();
}

const rateEmail = `booking-core-check-rate-${Date.now()}@example.com`;
let accepted = 0;
let limited = null;
for (let i = 0; i < 9 && !limited; i++) {
  try {
    const r = await guest.mutation("publicBooking:createBooking", {
      username, slug, startsAt: weekdaySlot(2 + i * 2),
      guestName: "Repeat", guestEmail: rateEmail,
    });
    made.push(r.reference);
    accepted++;
  } catch (e) {
    const m = msg(e);
    if (/try again shortly/i.test(m)) limited = m;
    // Anything else (a genuine clash with real data) is skipped, not counted.
  }
}
check("the limiter refuses the 6th booking from one guest", limited !== null && accepted === 5, `${accepted} accepted, then ${limited ? "limited" : "never limited"}`);

// ── cleanup ─────────────────────────────────────────────────────────────────
// Through the CLI because purging is an internal mutation, deliberately not
// reachable from a client. Needs the same Convex auth the rest of the repo's
// tooling uses.
console.log(`\n  Purging ${made.length} test booking(s) and their side effects…`);
const purged = execFileSync(
  "npx",
  ["convex", "run", "testCleanup:purgeByReferences", JSON.stringify({
    references: made,
    emailPrefix: "booking-core-check",
    summaryContains: ["Racer ", "Repeat ", "Guard "],
  })],
  { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
);
console.log(purged.trim().split("\n").slice(-9).join("\n"));

console.log(failures === 0 ? "\nBooking core clean.\n" : `\n${failures} failure(s).\n`);
process.exit(failures ? 1 : 0);
