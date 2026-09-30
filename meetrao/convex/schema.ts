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
    /** Optional: every profile written before reminders existed has none, and
        absent reads as ON — see convex/reminders.ts. */
    notify_reminders: v.optional(v.boolean()),
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

  /* A team is a booking link several hosts answer, in turn.
  
     The owner is a host like any other — there is no separate account type and
     no seat to buy. Membership is by profile id, so a member's own hours,
     timezone and calendar are the ones consulted when it is their turn.

     unique: lower(slug) product-wide — enforced in convex/teams.ts, which is
     also what keeps a team from taking a username that is already a host's. */
  teams: defineTable({
    id: v.string(),
    owner_id: v.string(),
    name: v.string(),
    slug: v.string(),
    slug_lower: v.string(),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_uuid", ["id"])
    .index("by_owner", ["owner_id"])
    .index("by_slug_lower", ["slug_lower"]),

  /* unique: (team_id, user_id) — enforced in convex/teams.ts */
  team_members: defineTable({
    id: v.string(),
    team_id: v.string(),
    user_id: v.string(),
    role: v.union(v.literal("owner"), v.literal("member")),
    created_at: v.number(),
  })
    .index("by_uuid", ["id"])
    .index("by_team", ["team_id"])
    .index("by_user", ["user_id"]),

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
    /**
     * How the meeting happens: "google_meet", "phone", "in_person" or
     * "custom". Kept as a plain string rather than a union because every row
     * written before the other three existed holds "google_meet" and a union
     * would have to be widened anyway; the allow-list lives in
     * convex/meetingTypes.ts, which is the boundary.
     */
    location: v.string(),
    /** The number to call, the address, or whatever "custom" means here. */
    location_detail: v.optional(v.string()),
    /**
     * How many guests may take the same slot. Absent or 1 is the one-to-one
     * meeting this product started as; above 1 makes it a class, a workshop or
     * an office hour, where several bookings share one time.
     *
     * The seats are counted from the bookings themselves — there is no seat
     * table — so a cancellation frees one by existing less.
     */
    capacity: v.optional(v.number()),
    is_active: v.boolean(),
    /** null = the host's default schedule. See migration 0010. */
    schedule_id: nullableString,
    /**
     * Set when this meeting belongs to a TEAM rather than to one host. The
     * row still carries a user_id — the owner, who can edit it — but bookings
     * are assigned to whichever member is free and least recently booked.
     */
    team_id: v.optional(nullableString),
    /**
     * What the guest is asked besides name, email and the free-text note.
     * Optional because every meeting written before questions existed has
     * none, and none is the same as an empty list.
     *
     * `id` is stable across edits so an answer can be matched back to the
     * question that was asked; the ANSWER still stores the label it was shown
     * under, because a host rewording a question must not rewrite history.
     */
    questions: v.optional(
      v.array(
        v.object({
          id: v.string(),
          label: v.string(),
          kind: v.union(v.literal("short"), v.literal("long")),
          required: v.boolean(),
        }),
      ),
    ),
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
    /** The guest's answers, each carrying the label it was asked under. */
    answers: v.optional(v.array(v.object({ label: v.string(), value: v.string() }))),
    /* Where this booking happens, snapshotted at booking time beside
       meeting_name and duration_minutes — a host who switches a meeting from
       Meet to a phone call next month has not moved last month's meeting. */
    location: v.optional(v.string()),
    location_detail: v.optional(v.string()),
    /**
     * How many times this booking has been moved. Optional because every row
     * written before reschedule existed has no such field, and absent means 0.
     * The .ics SEQUENCE is read from it: a calendar client ignores a re-import
     * of the same UID unless the sequence has gone up.
     */
    revision: v.optional(v.number()),
    /**
     * When each reminder was claimed, not when Resend accepted it. Claiming
     * before sending is the welcome email's rule: a reminder that goes missing
     * is a small thing, one that arrives twice is why people turn them off.
     * Optional because every row written before reminders existed has neither.
     */
    reminded_24h_at: v.optional(v.number()),
    reminded_1h_at: v.optional(v.number()),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_uuid", ["id"])
    .index("by_reference", ["reference"])
    .index("by_host_starts", ["host_id", "starts_at"])
    /* The reminder sweep asks "what starts soon" across every host, which
       by_host_starts cannot answer without a scan per host. Kept separate
       rather than widened: by_host_starts is the double-booking guard's read
       set and must stay narrow. */
    .index("by_starts", ["starts_at"])
    .index("by_meeting_type", ["meeting_type_id"]),

  /* ONE calendar day that does not follow the weekly pattern: a holiday, a
     day off, or a day with different hours. Keyed by the DATE as the host
     writes it ("2026-12-25"), not by an instant — "Christmas Day" is a day in
     the host's calendar, and an instant would drift a timezone either way.

     `ranges` empty means the day is closed. A day with ranges replaces the
     weekly rules for that date rather than adding to them, which is what a
     host means by "I work 14:00–17:00 that Friday".

     unique: (schedule_id, date) — enforced in convex/availability.ts */
  availability_overrides: defineTable({
    id: v.string(),
    user_id: v.string(),
    schedule_id: v.string(),
    /** "YYYY-MM-DD" in the host's own timezone. */
    date: v.string(),
    ranges: v.array(v.object({ start_minute: v.number(), end_minute: v.number() })),
    note: v.string(),
    created_at: v.number(),
  })
    .index("by_uuid", ["id"])
    .index("by_schedule", ["schedule_id"])
    .index("by_schedule_date", ["schedule_id", "date"])
    .index("by_user", ["user_id"]),

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
    kind: v.union(
      v.literal("booking_new"),
      v.literal("booking_cancelled"),
      v.literal("booking_changed"),
      /* The guest answered the calendar invitation. Written only by the RSVP
         sweep, which reads the events Meetrao itself created. */
      v.literal("booking_declined"),
    ),
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
