-- Meetrao — core schema
--
-- Domain notes that shaped this:
--   * Availability is ONE weekly schedule per account, not per meeting type
--     (handoff open question #2). A weekday with no rows is unavailable.
--   * Bookings snapshot the meeting name and duration, because a host may
--     rename or delete a meeting type after someone has booked it.
--   * Double-booking is prevented by a database exclusion constraint, not by
--     an application-level read-then-write. See bookings_no_overlap.

create extension if not exists "pgcrypto";
-- btree_gist lets an exclusion constraint mix equality (host_id) with range
-- overlap (the booked interval) in a single index.
create extension if not exists "btree_gist";

-- ── profiles ───────────────────────────────────────────────────────────────
-- One row per auth.users row, created by the handle_new_user trigger.

create table public.profiles (
  id                       uuid primary key references auth.users (id) on delete cascade,
  username                 text not null,
  full_name                text not null default '',
  job_title                text not null default '',
  email                    text not null default '',
  timezone                 text not null default 'UTC',
  avatar_url               text,
  is_admin                 boolean not null default false,

  -- Settings › Booking defaults, applied to every new meeting type.
  default_duration_minutes integer not null default 30,
  default_notice_minutes   integer not null default 60,

  onboarding_completed_at  timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),

  -- 1 char, or 2–40 chars starting and ending alphanumeric.
  constraint profiles_username_format
    check (username ~ '^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$'),
  constraint profiles_default_duration_positive
    check (default_duration_minutes between 5 and 480),
  constraint profiles_default_notice_nonneg
    check (default_notice_minutes >= 0)
);

create unique index profiles_username_key on public.profiles (lower(username));

-- ── calendar_connections ───────────────────────────────────────────────────
-- Google OAuth tokens. Deliberately has NO row-level policies: only the
-- service role (which bypasses RLS) may ever read this table, so tokens can
-- never reach a browser.

create table public.calendar_connections (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null unique references public.profiles (id) on delete cascade,
  provider             text not null default 'google',
  google_account_email text,
  calendar_id          text not null default 'primary',
  access_token         text,
  refresh_token        text,
  token_expires_at     timestamptz,
  scopes               text[] not null default '{}',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ── meeting_types ──────────────────────────────────────────────────────────

create table public.meeting_types (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references public.profiles (id) on delete cascade,
  name                   text not null,
  description            text not null default '',
  slug                   text not null,
  duration_minutes       integer not null default 30,
  buffer_minutes         integer not null default 0,
  minimum_notice_minutes integer not null default 60,
  booking_window_days    integer not null default 30,
  -- "Only option in this release" — a text column so adding Zoom/phone later
  -- does not need a migration of the enum.
  location               text not null default 'google_meet',
  is_active              boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  constraint meeting_types_name_not_blank check (btrim(name) <> ''),
  constraint meeting_types_duration_valid check (duration_minutes between 5 and 480),
  constraint meeting_types_buffer_valid    check (buffer_minutes between 0 and 120),
  constraint meeting_types_notice_valid    check (minimum_notice_minutes >= 0),
  constraint meeting_types_window_valid    check (booking_window_days between 1 and 365),
  constraint meeting_types_slug_format     check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$')
);

create unique index meeting_types_user_slug_key
  on public.meeting_types (user_id, slug);
create index meeting_types_user_active_idx
  on public.meeting_types (user_id) where is_active;

-- ── availability_rules ─────────────────────────────────────────────────────
-- Minutes from local midnight, interpreted in the profile's timezone.
-- A weekday with no rows is "Unavailable".

create table public.availability_rules (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  weekday      smallint not null,          -- 0 = Sunday … 6 = Saturday (JS getDay)
  start_minute integer not null,
  end_minute   integer not null,
  created_at   timestamptz not null default now(),

  constraint availability_weekday_range check (weekday between 0 and 6),
  constraint availability_start_range   check (start_minute between 0 and 1440),
  constraint availability_end_range     check (end_minute between 0 and 1440),
  constraint availability_ordered       check (end_minute > start_minute)
);

create index availability_rules_user_idx
  on public.availability_rules (user_id, weekday);

-- ── bookings ───────────────────────────────────────────────────────────────

create type public.booking_status as enum ('confirmed', 'cancelled');
create type public.cancelled_by as enum ('host', 'guest');

create table public.bookings (
  id               uuid primary key default gen_random_uuid(),
  -- Unguessable public handle. The guest's confirmation and cancellation
  -- pages are addressed by this, so it doubles as a capability token.
  reference        text not null unique default encode(gen_random_bytes(16), 'hex'),

  host_id          uuid not null references public.profiles (id) on delete cascade,
  meeting_type_id  uuid references public.meeting_types (id) on delete set null,

  -- Snapshots, so the booking still reads correctly after an edit or delete.
  meeting_name     text not null,
  duration_minutes integer not null,

  guest_name       text not null,
  guest_email      text not null,
  guest_note       text not null default '',
  guest_timezone   text,

  starts_at        timestamptz not null,
  ends_at          timestamptz not null,

  status           public.booking_status not null default 'confirmed',
  cancelled_at     timestamptz,
  cancelled_by     public.cancelled_by,

  google_event_id  text,
  meet_url         text,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint bookings_interval_ordered check (ends_at > starts_at),
  constraint bookings_guest_name_not_blank check (btrim(guest_name) <> ''),
  constraint bookings_guest_email_shape check (guest_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  constraint bookings_cancel_fields_consistent check (
    (status = 'cancelled' and cancelled_at is not null)
    or (status = 'confirmed' and cancelled_at is null)
  )
);

-- The real double-booking guard. Two confirmed bookings for the same host can
-- never overlap; a conflicting INSERT raises SQLSTATE 23P01, which the booking
-- endpoint translates into HTTP 409. This holds even under concurrent requests
-- hitting different application instances.
alter table public.bookings
  add constraint bookings_no_overlap
  exclude using gist (
    host_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status = 'confirmed');

create index bookings_host_starts_idx on public.bookings (host_id, starts_at desc);
create index bookings_host_upcoming_idx
  on public.bookings (host_id, starts_at)
  where status = 'confirmed';

-- ── admin_activity ─────────────────────────────────────────────────────────
-- Feed shown on Admin › Dashboard. Written by triggers below.

create table public.admin_activity (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references public.profiles (id) on delete set null,
  kind       text not null,
  summary    text not null,
  created_at timestamptz not null default now()
);

create index admin_activity_recent_idx on public.admin_activity (created_at desc);

-- ── updated_at ─────────────────────────────────────────────────────────────

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

create trigger calendar_connections_touch_updated_at
  before update on public.calendar_connections
  for each row execute function public.touch_updated_at();

create trigger meeting_types_touch_updated_at
  before update on public.meeting_types
  for each row execute function public.touch_updated_at();

create trigger bookings_touch_updated_at
  before update on public.bookings
  for each row execute function public.touch_updated_at();
