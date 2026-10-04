import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

/* ─────────────────────────────────────────────────────────────────────────────
   Convex schema, a transcription of supabase/migrations, with three rules
   applied consistently. They are worth reading before changing anything here.

   1. THE POSTGRES UUIDs SURVIVE. Every row keeps its original `id` as an
      ordinary indexed field. Convex's own `_id` is an internal detail and is
      never handed to the application. This is what makes the migration a copy
      rather than a remap: foreign keys stay valid, `profiles.id` stays equal
      to the Supabase auth `sub`, and a dual-run can compare the two databases
      row for row.

   2. TIMESTAMPS ARE EPOCH MILLISECONDS. Postgres `timestamptz` arrives as an
      ISO string, and ISO strings only sort chronologically when their format
      is byte-identical, which it is not, because fractional seconds vary.
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
  /* Convex Auth's own tables, users, accounts, sessions, verification codes.
     `users` is extended with `supabase_id`: the Supabase UUID that is also
     `profiles.id`. That one field is what keeps every user-keyed row valid
     across the issuer change, and it is resolved in exactly one place,
     convex/lib/auth.ts:currentUserId, which every authorization path already
     goes through. Profiles.id and its foreign keys stay UUIDs, rewriting
     fifteen tables to Convex ids would buy nothing and would cost the ability
     to compare the two databases row for row. */
  ...authTables,

  /* Convex Auth's `users`, extended with ONE field.

     `supabase_id` is the Supabase UUID, which is also `profiles.id`. It is
     what keeps every user-keyed row valid across the issuer change, and it is
     resolved in exactly one place, convex/lib/auth.ts:currentUserId, which
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

  /* unique: lower(username), enforced in convex/profiles.ts */
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
        absent reads as ON, see convex/reminders.ts. */
    notify_reminders: v.optional(v.boolean()),
    /**
     * Minutes before a meeting that each reminder goes out, the long one and
     * the short one. Absent is the free default, 1440 and 60.
     *
     * Two slots rather than a list, because the two claim columns on
     * `bookings` are what make a reminder send once; a list would need a row
     * per lead and a migration to match.
     */
    reminder_long_minutes: v.optional(v.number()),
    reminder_short_minutes: v.optional(v.number()),
    notify_daily_agenda: v.boolean(),
    notify_product_news: v.boolean(),
    /**
     * "free" or "pro". Absent reads as free. Every profile written before
     * plans existed has none.
     *
     * Written ONLY by the Polar webhook. Nothing in the app sets it: a plan
     * that can be set from a screen is one that can be set by anybody who
     * finds the screen, and the payment processor is the only thing that
     * knows whether money changed hands.
     */
    plan: v.optional(v.string()),
    /* All optional, like every field added to a table that already holds
       rows: a profile written before plans existed has none of them, and
       absent has to be a legal state or the push is refused. */
    /** When the current period ends. Pro survives to here after a cancel. */
    plan_until: v.optional(nullableNumber),
    polar_customer_id: v.optional(nullableString),
    polar_subscription_id: v.optional(nullableString),
    /**
     * Pro given by an operator rather than bought, a friend, a refund in
     * kind, an early user, a charity.
     *
     * SEPARATE FROM `plan` ON PURPOSE. `plan` has exactly one writer, Polar's
     * webhook, and that is what makes it trustworthy: nothing inside the app
     * can grant itself a paid plan. A complimentary grant that wrote `plan`
     * would destroy that, and would also be erased by the next subscription
     * event to arrive. This field is read ALONGSIDE the plan, never instead.
     *
     * A date rather than a flag, so "three months on the house" is expressible
     * and expires by itself. Far-future means indefinite.
     */
    comp_until: v.optional(nullableNumber),
    /** Why, in the operator's words. Shown on the admin screen, never to the host. */
    comp_reason: v.optional(v.string()),
    comp_granted_by: v.optional(nullableString),
    comp_granted_at: v.optional(nullableNumber),
    /** Their own domain for the booking page, once DNS points at us. */
    custom_domain: v.optional(nullableString),
    custom_domain_verified_at: v.optional(nullableNumber),
    /**
     * Their own logo and colour on the booking page, in place of Meetrao's.
     *
     * Stored whatever the plan, and SERVED only while the plan is Pro, see
     * the projection in convex/publicBooking.ts. Keeping the rows means a host
     * who lapses and comes back does not have to upload anything again, and
     * one who lapses does not keep a paid-for feature by having set it once.
     *
     * `brand_logo_url` is what pages render; `brand_logo_storage_id` is what
     * deletion needs. Same split as avatar_url / avatar_storage_id above, for
     * the same reason.
     */
    brand_logo_url: v.optional(nullableString),
    brand_logo_storage_id: v.optional(v.union(v.id("_storage"), v.null())),
    /**
     * The two colours a host picks: the accent, and the page background.
     *
     * `brand_bg` absent is NOT "use Meetrao's grey", convex/lib/brand.ts
     * derives a pale wash of the accent instead, so one colour is enough to
     * clear our palette off the page. It is stored only when the host wants
     * something other than that.
     */
    brand_color: v.optional(nullableString),
    brand_bg: v.optional(nullableString),
    onboarding_completed_at: nullableNumber,
    welcomed_at: nullableNumber,
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_uuid", ["id"])
    .index("by_username_lower", ["username_lower"])
    .index("by_custom_domain", ["custom_domain"])
    .index("by_polar_customer", ["polar_customer_id"])
    .index("by_email", ["email"]),

  /* A team is a booking link several hosts answer, in turn.
  
     The owner is a host like any other. There is no separate account type and
     no seat to buy. Membership is by profile id, so a member's own hours,
     timezone and calendar are the ones consulted when it is their turn.

     Unique: lower(slug) product-wide, enforced in convex/teams.ts, which is
     also what keeps a team from taking a username that is already a host's. */
  teams: defineTable({
    id: v.string(),
    owner_id: v.string(),
    /**
     * Which company this rota belongs to, or null for a personal one.
     *
     * A team link is a company's: an agency running two clients wants one
     * client's rota out of the other's settings. Null is personal, which is
     * where every team written before companies existed starts.
     */
    company_id: v.optional(nullableString),
    name: v.string(),
    slug: v.string(),
    slug_lower: v.string(),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_uuid", ["id"])
    .index("by_owner", ["owner_id"])
    .index("by_owner_company", ["owner_id", "company_id"])
    .index("by_slug_lower", ["slug_lower"]),

  /* ── Companies ───────────────────────────────────────────────────────────
     A company owns a domain, a brand and a list of people. It is NOT a team:
     a team is a rota that answers one link, a person can be in several, and
     its meetings belong to its owner. Overloading one table would make "which
     team's brand is on this domain" a question with no good answer.

     How many you may own, and how many people each may hold, is decided by
     the OWNER's plan, in convex/lib/limits.ts. A member needs no plan: their
     page is entitled by the owner's, which is why every public read resolves
     the owner rather than the member.

     unique: (slug_lower) and (custom_domain), enforced in convex/companies.ts */
  companies: defineTable({
    id: v.string(),
    owner_id: v.string(),
    name: v.string(),
    slug: v.string(),
    slug_lower: v.string(),
    /** Their own domain for this company's booking pages, once DNS points here. */
    custom_domain: v.optional(nullableString),
    custom_domain_verified_at: v.optional(nullableNumber),
    /** The brand every page on this company's domain wears. */
    brand_color: v.optional(nullableString),
    brand_background: v.optional(nullableString),
    /** The wordmark across the top of this company's booking pages. */
    brand_logo_url: v.optional(nullableString),
    brand_logo_storage_id: v.optional(v.union(v.id("_storage"), v.null())),
    /**
     * A SQUARE mark, for the app's own chrome.
     *
     * Separate from the logo because they are different pictures doing
     * different jobs: a wordmark is unreadable at 20px, and a square icon
     * looks lost across the top of a booking page. Most companies have both
     * already, and asking for one picture to do both means one of the two
     * places is always wrong.
     */
    brand_avatar_url: v.optional(nullableString),
    brand_avatar_storage_id: v.optional(v.union(v.id("_storage"), v.null())),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_uuid", ["id"])
    .index("by_owner", ["owner_id"])
    .index("by_slug_lower", ["slug_lower"])
    .index("by_custom_domain", ["custom_domain"]),

  /* unique: (company_id, user_id) and (company_id, handle_lower), both
     enforced in convex/companies.ts.

     `handle` is the path segment on the company's domain, and is a per-company
     name rather than the global username: usernames are first come first
     served, so a company cannot be promised "sarah", and the same person can
     be "sarah" at one company and "s.jones" at another. It defaults to the
     username when a member is added. */
  company_members: defineTable({
    id: v.string(),
    company_id: v.string(),
    user_id: v.string(),
    role: v.union(v.literal("owner"), v.literal("member")),
    handle: v.string(),
    handle_lower: v.string(),
    created_at: v.number(),
  })
    .index("by_uuid", ["id"])
    .index("by_company", ["company_id"])
    .index("by_user", ["user_id"])
    .index("by_company_handle", ["company_id", "handle_lower"]),

  /* unique: (team_id, user_id), enforced in convex/teams.ts */
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

  /* unique: (user_id, slug), enforced in convex/meetingTypes.ts */
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
     * The seats are counted from the bookings themselves (there is no seat
     * table) so a cancellation frees one by existing less.
     */
    capacity: v.optional(v.number()),
    is_active: v.boolean(),
    /** null = the host's default schedule. See migration 0010. */
    schedule_id: nullableString,
    /**
     * Set when this meeting belongs to a TEAM rather than to one host. The
     * row still carries a user_id (the owner, who can edit it) but bookings
     * are assigned to whichever member is free and least recently booked.
     */
    team_id: v.optional(nullableString),
    /**
     * Which COMPANY this meeting belongs to, or null for a personal one.
     *
     * The dimension that decides what appears on a company's domain. A
     * meeting is always reachable at meetrao.com/<username>/<slug>, whichever
     * company it belongs to; a company's domain serves ONLY its own, so being
     * added to somebody's company never puts your personal meetings on their
     * branded pages.
     *
     * Absent and null both mean personal, because every row written before
     * companies existed has neither.
     */
    company_id: v.optional(nullableString),
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
    .index("by_company", ["company_id"])
    .index("by_user_slug", ["user_id", "slug"]),

  /* unique: (user_id, name) and one is_default per user, convex/availability.ts */
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
     mutation, proven in docs/spikes/convex-concurrency/. `by_host_starts` is
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
       meeting_name and duration_minutes, a host who switches a meeting from
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
    /**
     * Which company this booking belongs to, copied from the meeting type
     * when it is made. Null is personal.
     *
     * Denormalised rather than joined. Every bookings screen reads a range by
     * host and then needs the context of each row, and a join per booking
     * turns one indexed read into one per result.
     *
     * A booking keeps the company it was made under even if the meeting is
     * later moved or deleted, which is right: it records what happened, and
     * moving a meeting type cannot retroactively move money or a calendar
     * entry between two client workspaces.
     */
    company_id: v.optional(nullableString),
    reminded_24h_at: v.optional(v.number()),
    reminded_1h_at: v.optional(v.number()),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_uuid", ["id"])
    .index("by_reference", ["reference"])
    .index("by_host_starts", ["host_id", "starts_at"])
    .index("by_host_company", ["host_id", "company_id"])
    /* The reminder sweep asks "what starts soon" across every host, which
       by_host_starts cannot answer without a scan per host. Kept separate
       rather than widened: by_host_starts is the double-booking guard's read
       set and must stay narrow. */
    .index("by_starts", ["starts_at"])
    .index("by_meeting_type", ["meeting_type_id"]),

  /* ONE calendar day that does not follow the weekly pattern: a holiday, a
     day off, or a day with different hours. Keyed by the DATE as the host
     writes it ("2026-12-25"), not by an instant, "Christmas Day" is a day in
     the host's calendar, and an instant would drift a timezone either way.

     `ranges` empty means the day is closed. A day with ranges replaces the
     weekly rules for that date rather than adding to them, which is what a
     host means by "I work 14:00–17:00 that Friday".

     Unique: (schedule_id, date), enforced in convex/availability.ts */
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

  /* unique: (booking_id, email), enforced in convex/bookings.ts */
  booking_invitees: defineTable({
    id: v.string(),
    booking_id: v.string(),
    name: v.string(),
    email: v.string(),
    created_at: v.number(),
  })
    .index("by_uuid", ["id"])
    .index("by_booking", ["booking_id"]),

  /* unique: (user_id, email), enforced in convex/contacts.ts */
  contacts: defineTable({
    id: v.string(),
    user_id: v.string(),
    /**
     * Which company's contact list this row is in. Null is personal.
     *
     * NOT the same thing as `company` below, which is free text naming the
     * guest's own employer and predates companies entirely. One is who they
     * work for; this is whose list they are on. The names are close enough to
     * be worth saying out loud.
     *
     * The same address can appear in two of these lists, deliberately: an
     * agency keeping one client's contacts out of another's is the reason
     * contacts are scoped at all, so uniqueness is per (user, company, email).
     */
    company_id: v.optional(nullableString),
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
    .index("by_user_email", ["user_id", "email"])
    .index("by_user_company", ["user_id", "company_id"])
    .index("by_user_company_email", ["user_id", "company_id", "email"]),

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
     function touching it is an internalQuery/internalMutation. It is not
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
    /* The Polar products Pro is sold as.
    
       Here rather than in the environment because an operator creating them
       from the admin console cannot set an env var, and a redeploy to record
       two ids somebody just generated is a strange way to sell a plan. The
       TOKEN stays in the environment. A credential is not configuration. */
    polar_product_monthly: v.optional(nullableString),
    polar_product_yearly: v.optional(nullableString),
    /* And the two Business is sold as. Separate fields rather than a map,
       because the webhook compares an incoming product id against these to
       decide which tier was bought, and a typo'd key in a map would silently
       grant the lower one. */
    polar_product_business_monthly: v.optional(nullableString),
    polar_product_business_yearly: v.optional(nullableString),
    updated_at: v.number(),
  }),

  /* An API key, stored as a HASH and never again as itself.
  
     The plaintext is shown once, at creation, and cannot be recovered: a
     leaked database should not be a leaked set of live credentials, and a
     support screen that can print somebody's key is a support screen that can
     be social-engineered. `prefix` is the first few characters, kept so a host
     can tell two keys apart in a list.

     Unique: hash, enforced by the CSPRNG that makes the key. */
  api_keys: defineTable({
    id: v.string(),
    user_id: v.string(),
    name: v.string(),
    prefix: v.string(),
    hash: v.string(),
    last_used_at: nullableNumber,
    revoked_at: nullableNumber,
    created_at: v.number(),
  })
    .index("by_uuid", ["id"])
    .index("by_user", ["user_id"])
    .index("by_hash", ["hash"]),

  /* Where to POST when something happens to this host's bookings.
  
     The secret is readable by the owner, unlike an API key: a receiver has to
     hold the same secret to verify the signature, and one that cannot be read
     back is one that has to be rotated the first time somebody redeploys. */
  webhooks: defineTable({
    id: v.string(),
    user_id: v.string(),
    url: v.string(),
    secret: v.string(),
    is_active: v.boolean(),
    /** The outcome of the last attempt, so a broken endpoint is visible. */
    last_status: nullableNumber,
    last_error: nullableString,
    last_attempt_at: nullableNumber,
    created_at: v.number(),
  })
    .index("by_uuid", ["id"])
    .index("by_user", ["user_id"]),

  /* Fixed-window counters for the guest path. Postgres had nothing like this
     because nothing enforced a limit there either, `create_booking` was
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
