import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

/* ─────────────────────────────────────────────────────────────────────────────
   Convex schema — a transcription of supabase/migrations, with three rules
   applied consistently. They are worth reading before changing anything here.

   1. THE POSTGRES UUIDs SURVIVE. Every row keeps its original `id` as an
      ordinary indexed field. Convex's own `_id` is an internal detail and is
      never handed to the application. This is what makes the migration a copy
      rather than a remap: foreign keys stay valid, `profiles.id` stays equal
      to the Supabase auth `sub`, and a dual-run can compare the two databases
      row for row.

   2. TIMESTAMPS ARE EPOCH MILLISECONDS. Postgres `timestamptz` arrives as an
      ISO string, and ISO strings only sort chronologically when their format
      is byte-identical — which it is not, because fractional seconds vary.
      Anything that is range-queried or ordered would then be subtly wrong, so
      every instant is a number here and is converted back to the app's ISO
      string shape at the boundary in `convex/lib/serialize.ts`.

   3. FIELD NAMES STAY snake_case. They match the Postgres columns and the
      existing `src/lib/types.ts`, so the application layer keeps its types.
      This is deliberate churn-avoidance, not an accident of porting.

   Convex has no unique indexes. Every uniqueness rule that Postgres enforced
   with one is re-enforced inside a mutation instead; each is noted below and
   implemented in the module that owns the table.
   ───────────────────────────────────────────────────────────────────────────── */

const nullableString = v.union(v.string(), v.null());
const nullableNumber = v.union(v.number(), v.null());

export default defineSchema({
  /* Convex Auth's own tables — users, accounts, sessions, verification codes.
     `users` is extended with `supabase_id`: the Supabase UUID that is also
     `profiles.id`. That one field is what keeps every user-keyed row valid
     across the issuer change, and it is resolved in exactly one place,
     convex/lib/auth.ts:currentUserId, which every authorization path already
     goes through. profiles.id and its foreign keys stay UUIDs — rewriting
     fifteen tables to Convex ids would buy nothing and would cost the ability
     to compare the two databases row for row. */
  ...authTables,

  /* Convex Auth's `users`, extended with ONE field.

     `supabase_id` is the Supabase UUID, which is also `profiles.id`. It is
     what keeps every user-keyed row valid across the issuer change, and it is
     resolved in exactly one place — convex/lib/auth.ts:currentUserId, which
     every authorization path already goes through. Nothing else in the
     codebase learns that identity changed shape.

     Spelled out rather than spread from authTables because the table needs a
     field and an index of its own; the other fields mirror Convex Auth's own
     definition and must stay in step with it across upgrades. */
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    supabase_id: v.optional(v.string()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_supabase_id", ["supabase_id"]),

  /* unique: lower(username) — enforced in convex/profiles.ts */
  profiles: defineTable({
    id: v.string(),
    username: v.string(),
    /** Denormalised lower(username). Postgres had a functional unique index. */
    username_lower: v.string(),
    full_name: v.string(),
    job_title: v.string(),
    email: v.string(),
    timezone: v.string(),
    timezone_auto: v.boolean(),
    /** The URL the app renders. During the migration this is either a legacy
        Supabase Storage URL or a Convex one; `avatar_storage_id` is set only
        for the latter, and is what deletion needs. */
    avatar_url: nullableString,
    avatar_storage_id: v.optional(v.union(v.id("_storage"), v.null())),
    is_admin: v.boolean(),
    is_suspended: v.boolean(),
    default_duration_minutes: v.number(),
    default_notice_minutes: v.number(),
    notify_new_booking: v.boolean(),
    notify_booking_changed: v.boolean(),
    notify_booking_cancelled: v.boolean(),
    notify_daily_agenda: v.boolean(),
    notify_product_news: v.boolean(),
    onboarding_completed_at: nullableNumber,
    welcomed_at: nullableNumber,
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_uuid", ["id"])
    .index("by_username_lower", ["username_lower"])
    .index("by_email", ["email"]),

  /* unique: (user_id, slug) — enforced in convex/meetingTypes.ts */
  meeting_types: defineTable({
    id: v.string(),
    user_id: v.string(),
    name: v.string(),
    description: v.string(),
    slug: v.string(),
    duration_minutes: v.number(),
    buffer_minutes: v.number(),
    minimum_notice_minutes: v.number(),
    booking_window_days: v.number(),
    location: v.string(),
    is_active: v.boolean(),
    /** null = the host's default schedule. See migration 0010. */
    schedule_id: nullableString,
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_uuid", ["id"])
    .index("by_user", ["user_id"])
    .index("by_user_slug", ["user_id", "slug"]),

  /* unique: (user_id, name) and one is_default per user — convex/availability.ts */
  availability_schedules: defineTable({
    id: v.string(),
    user_id: v.string(),
    name: v.string(),
    is_default: v.boolean(),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_uuid", ["id"])
    .index("by_user", ["user_id"]),

  availability_rules: defineTable({
    id: v.string(),
    user_id: v.string(),
    schedule_id: v.string(),
    weekday: v.number(),
    start_minute: v.number(),
    end_minute: v.number(),
    created_at: v.number(),
  })
    .index("by_uuid", ["id"])
    .index("by_schedule", ["schedule_id"])
    .index("by_user", ["user_id"])
    .index("by_user_weekday", ["user_id", "weekday"]),

  /* The double-booking guard lived in an EXCLUDE USING gist constraint. Convex
     has no equivalent, so it is a read-then-insert inside one serializable
     mutation — proven in docs/spikes/convex-concurrency/. `by_host_starts` is
     the index that read uses, and it must stay narrow. */
  bookings: defineTable({
    id: v.string(),
    reference: v.string(),
    host_id: v.string(),
    meeting_type_id: nullableString,
    meeting_name: v.string(),
    duration_minutes: v.number(),
    guest_name: v.string(),
    guest_email: v.string(),
    guest_note: v.string(),
    guest_timezone: nullableString,
    starts_at: v.number(),
    ends_at: v.number(),
    status: v.union(v.literal("confirmed"), v.literal("cancelled")),
    cancelled_at: nullableNumber,
    cancelled_by: v.union(v.literal("host"), v.literal("guest"), v.null()),
    google_event_id: nullableString,
    meet_url: nullableString,
    guest_rsvp: nullableString,
    guest_rsvp_synced_at: nullableNumber,
    guest_rsvp_notified_at: nullableNumber,
    host_created: v.boolean(),
    page_view_id: nullableString,
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_uuid", ["id"])
    .index("by_reference", ["reference"])
    .index("by_host_starts", ["host_id", "starts_at"])
    .index("by_meeting_type", ["meeting_type_id"]),

  /* unique: (booking_id, email) — enforced in convex/bookings.ts */
  booking_invitees: defineTable({
    id: v.string(),
    booking_id: v.string(),
    name: v.string(),
    email: v.string(),
    created_at: v.number(),
  })
    .index("by_uuid", ["id"])
    .index("by_booking", ["booking_id"]),

  /* unique: (user_id, email) — enforced in convex/contacts.ts */
  contacts: defineTable({
    id: v.string(),
    user_id: v.string(),
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    company: v.string(),
    notes: v.string(),
    source: v.union(v.literal("manual"), v.literal("booking"), v.literal("import")),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_uuid", ["id"])
    .index("by_user", ["user_id"])
    .index("by_user_email", ["user_id", "email"]),

  notifications: defineTable({
    id: v.string(),
    user_id: v.string(),
    kind: v.union(v.literal("booking_new"), v.literal("booking_cancelled"), v.literal("booking_changed")),
    title: v.string(),
    body: v.string(),
    booking_id: nullableString,
    read_at: nullableNumber,
    created_at: v.number(),
  })
    .index("by_uuid", ["id"])
    .index("by_user", ["user_id"])
    .index("by_user_unread", ["user_id", "read_at"]),

  /* Google OAuth tokens. In Postgres this table had RLS on and NO policy, so
     only the service role could reach it. The Convex equivalent is that every
     function touching it is an internalQuery/internalMutation — it is not
     reachable from a client at all. Do not add a public function here. */
  calendar_connections: defineTable({
    id: v.string(),
    user_id: v.string(),
    provider: v.string(),
    google_account_email: nullableString,
    calendar_id: v.string(),
    access_token: nullableString,
    refresh_token: nullableString,
    token_expires_at: nullableNumber,
    scopes: v.array(v.string()),
    needs_reconnect: v.boolean(),
    last_error: nullableString,
    last_error_at: nullableNumber,
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_uuid", ["id"])
    .index("by_user", ["user_id"]),

  booking_page_views: defineTable({
    id: v.string(),
    host_id: v.string(),
    meeting_type_id: nullableString,
    opened_at: v.number(),
  })
    .index("by_uuid", ["id"])
    .index("by_host", ["host_id", "opened_at"]),

  site_visits: defineTable({
    visited_at: v.number(),
    visitor_hash: v.string(),
    path: v.string(),
    referrer_host: nullableString,
    country: nullableString,
    region: nullableString,
    city: nullableString,
    device: v.string(),
    os: nullableString,
    browser: nullableString,
    is_bot: v.boolean(),
  })
    .index("by_visited", ["visited_at"])
    .index("by_hash", ["visitor_hash"]),

  admin_activity: defineTable({
    id: v.string(),
    actor_id: nullableString,
    kind: v.string(),
    summary: v.string(),
    created_at: v.number(),
  })
    .index("by_uuid", ["id"])
    .index("by_created", ["created_at"]),

  /* Singleton. Postgres enforced it with `id boolean primary key check (id)`;
     here the mutation refuses to create a second row. */
  platform_settings: defineTable({
    app_name: v.string(),
    support_email: v.string(),
    updated_at: v.number(),
  }),

  /* Fixed-window counters for the guest path. Postgres had nothing like this
     because nothing enforced a limit there either — `create_booking` was
     granted to `anon` and the publishable key ships to every browser, so the
     door was open. Convex has no built-in rate limiting, so this is it. */
  rate_limits: defineTable({
    key: v.string(),
    window_start: v.number(),
    count: v.number(),
  }).index("by_key", ["key"]),

  bootstrap_admins: defineTable({
    email: v.string(),
    note: v.string(),
    created_at: v.number(),
  }).index("by_email", ["email"]),

  reserved_usernames: defineTable({
    username: v.string(),
    reason: v.string(),
    reserved_at: v.number(),
  }).index("by_username", ["username"]),
});
