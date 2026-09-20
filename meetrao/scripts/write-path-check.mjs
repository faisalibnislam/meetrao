#!/usr/bin/env node
/**
 * Exercises the Convex WRITE path as a real host, then puts everything back.
 *
 * Only touches rows it creates itself, and asserts the row count returns to
 * its starting value — a test that leaves debris behind is a test that will be
 * switched off.
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

let failures = 0;
const check = (label, ok, detail) => {
  console.log(`    ${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
};

async function sessionFor(email) {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data: v, error: e } = await anon.auth.verifyOtp({ type: "magiclink", token_hash: data.properties.hashed_token });
  if (e) throw e;
  return v.session.access_token;
}

const { data: profiles } = await admin.from("profiles").select("id, email, username").order("created_at").limit(1);
const host = profiles[0];
console.log(`\n  Acting as ${host.username} <${host.email}>\n`);

const convex = new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL);
convex.setAuth(await sessionFor(host.email));

// ── contacts: create → update → upsert-by-email → delete ────────────────────
const before = (await convex.query("contacts:listOwn", {})).length;
const email = `write-path-check+${Date.now()}@example.com`;

const id = await convex.mutation("contacts:save", {
  name: "Write Path", email, phone: "", company: "Acme", notes: "",
});
let rows = await convex.query("contacts:listOwn", {});
check("create adds exactly one", rows.length === before + 1, `${before} → ${rows.length}`);
check("created row is readable", rows.some((c) => c.id === id && c.email === email));

await convex.mutation("contacts:save", { id, name: "Renamed", email, phone: "123", company: "Acme", notes: "n" });
rows = await convex.query("contacts:listOwn", {});
const updated = rows.find((c) => c.id === id);
check("update changes fields in place", updated?.name === "Renamed" && updated?.phone === "123", JSON.stringify({ n: updated?.name, p: updated?.phone }));
check("update does not add a row", rows.length === before + 1, `${rows.length}`);

const same = await convex.mutation("contacts:save", { name: "Again", email, phone: "", company: "", notes: "" });
rows = await convex.query("contacts:listOwn", {});
check("saving the same email upserts, not duplicates", same === id && rows.length === before + 1, `id match ${same === id}, rows ${rows.length}`);

// ── import chunk: one new, one existing ─────────────────────────────────────
const second = `write-path-check-2+${Date.now()}@example.com`;
const imported = await convex.mutation("contacts:importChunk", {
  rows: [
    { name: "Existing", email, phone: "", company: "", notes: "" },
    { name: "Fresh", email: second, phone: "", company: "", notes: "" },
  ],
});
check("import reports 1 added / 1 updated", imported.added === 1 && imported.updated === 1, JSON.stringify(imported));

// ── cleanup ─────────────────────────────────────────────────────────────────
for (const c of await convex.query("contacts:listOwn", {})) {
  if (c.email === email || c.email === second) await convex.mutation("contacts:remove", { id: c.id });
}
rows = await convex.query("contacts:listOwn", {});
check("cleanup restores the original count", rows.length === before, `${rows.length} vs ${before}`);

// ── schedules: create → rename → default rules seeded → delete ──────────────
const schedBefore = (await convex.query("availability:listSchedules", {})).length;
const created = await convex.mutation("availability:createSchedule", { name: `wp-check-${Date.now()}`, makeDefault: false });
const seeded = await convex.query("availability:listRules", { scheduleId: created.id });
check("a new schedule is seeded Mon–Fri 09:00–17:00", seeded.length === 5 && seeded.every((r) => r.start_minute === 540 && r.end_minute === 1020), `${seeded.length} rules`);

await convex.mutation("availability:renameSchedule", { scheduleId: created.id, name: "wp-renamed" });
const afterRename = (await convex.query("availability:listSchedules", {})).find((s) => s.id === created.id);
check("rename lands", afterRename?.name === "wp-renamed", afterRename?.name);

let refused = null;
try { await convex.mutation("availability:deleteSchedule", { scheduleId: (await convex.query("availability:listSchedules", {})).find((s) => s.is_default).id }); }
catch (e) { refused = e?.data?.message ?? e.message; }
check("deleting the default is refused", refused !== null && /default/i.test(refused), refused);

await convex.mutation("availability:deleteSchedule", { scheduleId: created.id });
const schedAfter = (await convex.query("availability:listSchedules", {})).length;
check("cleanup restores the schedule count", schedAfter === schedBefore, `${schedAfter} vs ${schedBefore}`);
const orphans = await convex.query("availability:listRules", { scheduleId: created.id });
check("deleting a schedule takes its rules with it", orphans.length === 0, `${orphans.length} left`);

console.log(failures === 0 ? "\nWrite path clean.\n" : `\n${failures} failure(s).\n`);
process.exit(failures ? 1 : 0);
