#!/usr/bin/env node
/**
 * Supabase → Convex backfill, step 1: dump each table as JSONL in the shape
 * convex/schema.ts expects.
 *
 *   node scripts/export-supabase.mjs [outDir]
 *   npx convex import --table <name> --replace <outDir>/<name>.jsonl
 *
 * Idempotent and safe to re-run: it only READS from Supabase. Nothing here
 * writes to Postgres.
 *
 * Two transformations matter and are applied everywhere:
 *   · timestamptz → epoch milliseconds (see the note in convex/schema.ts)
 *   · every column the Convex schema requires is filled, because Convex
 *     validates on insert and Postgres defaults do not travel.
 */
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const outDir = resolve(process.argv[2] ?? ".migrate");
mkdirSync(outDir, { recursive: true });

// .env.local, without pulling in Next's loader.
const envFile = resolve(process.cwd(), ".env.local");
const env = { ...process.env };
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const ms = (v) => (v === null || v === undefined ? null : Date.parse(v));
const msReq = (v, fallback = Date.now()) => (v ? Date.parse(v) : fallback);
const str = (v) => (v === null || v === undefined ? "" : String(v));
const orNull = (v) => (v === undefined ? null : v);

const TABLES = {
  profiles: (r) => ({
    id: r.id,
    username: r.username,
    username_lower: String(r.username).toLowerCase(),
    full_name: str(r.full_name),
    job_title: str(r.job_title),
    email: str(r.email),
    timezone: r.timezone || "UTC",
    timezone_auto: r.timezone_auto ?? true,
    avatar_url: orNull(r.avatar_url),
    is_admin: !!r.is_admin,
    is_suspended: !!r.is_suspended,
    default_duration_minutes: r.default_duration_minutes ?? 30,
    default_notice_minutes: r.default_notice_minutes ?? 60,
    notify_new_booking: r.notify_new_booking ?? true,
    notify_booking_changed: r.notify_booking_changed ?? true,
    notify_booking_cancelled: r.notify_booking_cancelled ?? true,
    notify_daily_agenda: r.notify_daily_agenda ?? false,
    notify_product_news: r.notify_product_news ?? false,
    onboarding_completed_at: ms(r.onboarding_completed_at),
    welcomed_at: ms(r.welcomed_at),
    created_at: msReq(r.created_at),
    updated_at: msReq(r.updated_at, msReq(r.created_at)),
  }),
  meeting_types: (r) => ({
    id: r.id, user_id: r.user_id, name: r.name, description: str(r.description), slug: r.slug,
    duration_minutes: r.duration_minutes, buffer_minutes: r.buffer_minutes ?? 0,
    minimum_notice_minutes: r.minimum_notice_minutes ?? 60, booking_window_days: r.booking_window_days ?? 30,
    location: r.location || "google_meet", is_active: r.is_active ?? true,
    schedule_id: orNull(r.schedule_id),
    created_at: msReq(r.created_at), updated_at: msReq(r.updated_at, msReq(r.created_at)),
  }),
  availability_schedules: (r) => ({
    id: r.id, user_id: r.user_id, name: r.name, is_default: !!r.is_default,
    created_at: msReq(r.created_at), updated_at: msReq(r.updated_at, msReq(r.created_at)),
  }),
  availability_rules: (r) => ({
    id: r.id, user_id: r.user_id, schedule_id: r.schedule_id,
    weekday: r.weekday, start_minute: r.start_minute, end_minute: r.end_minute,
    created_at: msReq(r.created_at),
  }),
  bookings: (r) => ({
    id: r.id, reference: r.reference, host_id: r.host_id, meeting_type_id: orNull(r.meeting_type_id),
    meeting_name: r.meeting_name, duration_minutes: r.duration_minutes,
    guest_name: r.guest_name, guest_email: r.guest_email, guest_note: str(r.guest_note),
    guest_timezone: orNull(r.guest_timezone),
    starts_at: msReq(r.starts_at), ends_at: msReq(r.ends_at),
    status: r.status, cancelled_at: ms(r.cancelled_at), cancelled_by: orNull(r.cancelled_by),
    google_event_id: orNull(r.google_event_id), meet_url: orNull(r.meet_url),
    guest_rsvp: orNull(r.guest_rsvp), guest_rsvp_synced_at: ms(r.guest_rsvp_synced_at),
    guest_rsvp_notified_at: ms(r.guest_rsvp_notified_at),
    host_created: !!r.host_created, page_view_id: orNull(r.page_view_id),
    created_at: msReq(r.created_at), updated_at: msReq(r.updated_at, msReq(r.created_at)),
  }),
  booking_invitees: (r) => ({
    id: r.id, booking_id: r.booking_id, name: str(r.name), email: r.email, created_at: msReq(r.created_at),
  }),
  contacts: (r) => ({
    id: r.id, user_id: r.user_id, name: str(r.name), email: r.email, phone: str(r.phone),
    company: str(r.company), notes: str(r.notes), source: r.source || "manual",
    created_at: msReq(r.created_at), updated_at: msReq(r.updated_at, msReq(r.created_at)),
  }),
  notifications: (r) => ({
    id: r.id, user_id: r.user_id, kind: r.kind, title: r.title, body: str(r.body),
    booking_id: orNull(r.booking_id), read_at: ms(r.read_at), created_at: msReq(r.created_at),
  }),
  calendar_connections: (r) => ({
    id: r.id, user_id: r.user_id, provider: r.provider || "google",
    google_account_email: orNull(r.google_account_email), calendar_id: r.calendar_id || "primary",
    access_token: orNull(r.access_token), refresh_token: orNull(r.refresh_token),
    token_expires_at: ms(r.token_expires_at), scopes: r.scopes ?? [],
    needs_reconnect: !!r.needs_reconnect, last_error: orNull(r.last_error), last_error_at: ms(r.last_error_at),
    created_at: msReq(r.created_at), updated_at: msReq(r.updated_at, msReq(r.created_at)),
  }),
  booking_page_views: (r) => ({
    id: r.id, host_id: r.host_id, meeting_type_id: orNull(r.meeting_type_id), opened_at: msReq(r.opened_at),
  }),
  site_visits: (r) => ({
    visited_at: msReq(r.visited_at), visitor_hash: r.visitor_hash, path: r.path,
    referrer_host: orNull(r.referrer_host), country: orNull(r.country), region: orNull(r.region),
    city: orNull(r.city), device: r.device || "unknown", os: orNull(r.os), browser: orNull(r.browser),
    is_bot: !!r.is_bot,
  }),
  admin_activity: (r) => ({
    id: r.id, actor_id: orNull(r.actor_id), kind: r.kind, summary: r.summary, created_at: msReq(r.created_at),
  }),
  platform_settings: (r) => ({
    app_name: r.app_name, support_email: r.support_email, updated_at: msReq(r.updated_at),
  }),
  bootstrap_admins: (r) => ({ email: r.email, note: str(r.note), created_at: msReq(r.created_at) }),
  reserved_usernames: (r) => ({ username: r.username, reason: str(r.reason), reserved_at: msReq(r.reserved_at) }),
};

let total = 0;
for (const [table, shape] of Object.entries(TABLES)) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select("*").range(from, from + 999);
    if (error) { console.error(`${table}: ${error.message}`); process.exit(1); }
    rows.push(...data);
    if (data.length < 1000) break;
  }
  const jsonl = rows.map((r) => JSON.stringify(shape(r))).join("\n");
  writeFileSync(`${outDir}/${table}.jsonl`, jsonl ? `${jsonl}\n` : "");
  console.log(`  ${String(rows.length).padStart(5)}  ${table}`);
  total += rows.length;
}
console.log(`\n${total} rows written to ${outDir}`);
