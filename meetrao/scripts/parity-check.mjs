#!/usr/bin/env node
/**
 * Supabase vs Convex, same user, same question, same answer?
 *
 * Reads only. Mints a session for each real host with generateLink (which does
 * NOT send mail) so the comparison runs as that host — the point being that
 * Convex's authorization code and Postgres's RLS have to agree about what a
 * given person can see, not just about what rows exist.
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
const convexUrl = env.NEXT_PUBLIC_CONVEX_URL;

let failures = 0;
const check = (label, ok, detail) => {
  console.log(`    ${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** A session for an existing user, without their password and without email. */
async function sessionFor(email) {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data: verified, error: vErr } = await anon.auth.verifyOtp({
    type: "magiclink", token_hash: data.properties.hashed_token,
  });
  if (vErr) throw vErr;
  return { token: verified.session.access_token, client: anon };
}

const { data: profiles } = await admin.from("profiles").select("id, email, username, is_admin").order("created_at");

for (const p of profiles) {
  console.log(`\n  ${p.username} <${p.email}>${p.is_admin ? " [admin]" : ""}`);
  let s;
  try { s = await sessionFor(p.email); }
  catch (e) { check("could mint a session", false, e.message); continue; }

  const convex = new ConvexHttpClient(convexUrl);
  convex.setAuth(s.token);
  const asUser = s.client; // carries the same session, so RLS applies

  // ── notifications ────────────────────────────────────────────────────────
  const cNotif = await convex.query("notifications:listOwn", { limit: 100 });
  const { data: pNotif } = await asUser
    .from("notifications").select("id, kind, title, body, booking_id, read_at, created_at")
    .eq("user_id", p.id).order("created_at", { ascending: false }).limit(100);
  check("notifications: same ids, same order",
    same(cNotif.map((n) => n.id), (pNotif ?? []).map((n) => n.id)),
    `convex ${cNotif.length} / pg ${(pNotif ?? []).length}`);

  const cUnread = await convex.query("notifications:unreadCount", {});
  const { count: pUnread } = await asUser
    .from("notifications").select("id", { count: "exact", head: true }).eq("user_id", p.id).is("read_at", null);
  check("notifications: unread count", cUnread === (pUnread ?? 0), `convex ${cUnread} / pg ${pUnread ?? 0}`);

  // ── schedules ────────────────────────────────────────────────────────────
  const cSched = await convex.query("availability:listSchedules", {});
  const { data: pSched } = await asUser
    .from("availability_schedules").select("id, name, is_default").eq("user_id", p.id)
    .order("is_default", { ascending: false }).order("created_at");
  check("schedules: same ids, same order",
    same(cSched.map((r) => r.id), (pSched ?? []).map((r) => r.id)),
    `convex ${cSched.length} / pg ${(pSched ?? []).length}`);

  // ── contacts screen ──────────────────────────────────────────────────────
  const cScreen = await convex.query("contacts:listForScreen", {});
  const { data: pContacts } = await asUser
    .from("contacts").select("*").eq("user_id", p.id).order("created_at", { ascending: false }).order("id");
  check("contacts: same ids, same order",
    same(cScreen.contacts.map((c) => c.id), (pContacts ?? []).map((c) => c.id)),
    `convex ${cScreen.contacts.length} / pg ${(pContacts ?? []).length}`);

  const { data: pBookings } = await asUser.from("bookings").select("id").eq("host_id", p.id);
  check("contacts: same booking set",
    same([...cScreen.bookings.map((b) => b.id)].sort(), [...(pBookings ?? []).map((b) => b.id)].sort()),
    `convex ${cScreen.bookings.length} / pg ${(pBookings ?? []).length}`);

  // ── analytics (admin only) ───────────────────────────────────────────────
  if (p.is_admin) {
    for (const days of [7, 30, 90]) {
      const cOv = await convex.query("analytics:overview", { days });
      const { data: pOvRaw } = await asUser.rpc("analytics_overview", { p_days: days });
      const pOv = Array.isArray(pOvRaw) ? pOvRaw[0] : pOvRaw;
      const n = (x) => Number(x ?? 0);
      check(`analytics ${days}d: visits/visitors/countries/bots`,
        n(cOv.visits) === n(pOv?.visits) && n(cOv.visitors) === n(pOv?.visitors) &&
        n(cOv.countries) === n(pOv?.countries) && n(cOv.bots) === n(pOv?.bots),
        `convex ${cOv.visits}/${cOv.visitors}/${cOv.countries}/${cOv.bots} · pg ${n(pOv?.visits)}/${n(pOv?.visitors)}/${n(pOv?.countries)}/${n(pOv?.bots)}`);

      const cTop = await convex.query("analytics:top", { dimension: "path", days, limit: 8 });
      const { data: pTop } = await asUser.rpc("analytics_top", { p_dimension: "path", p_days: days, p_limit: 8 });
      check(`analytics ${days}d: top paths`,
        same(cTop.map((r) => [r.label, r.visits, r.visitors]),
             (pTop ?? []).map((r) => [r.label, Number(r.visits), Number(r.visitors)])),
        `convex ${cTop.length} rows / pg ${(pTop ?? []).length}`);
    }
  }
}

console.log(failures === 0 ? "\nParity clean.\n" : `\n${failures} mismatch(es).\n`);
process.exit(failures ? 1 : 0);
