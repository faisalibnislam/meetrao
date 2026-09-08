-- ─────────────────────────────────────────────────────────────────────────────
-- 0001 · Baseline schema
--
-- Snapshot of the Meetrao Supabase project as it stood before this build, so
-- the repo owns the schema and it can be replayed into a fresh project. It is
-- idempotent: every object is created only if it does not already exist, so
-- running it against the existing project is a no-op.
--
-- Entities follow BUILD-FROM-SCRATCH.md § "Data model": profile, meeting_type,
-- availability, booking, calendar_connection, platform_settings — plus the
-- admin activity feed and the two lookup tables that back account removal.
--
-- Instants are stored in UTC. The host's timezone is a string on the profile;
-- no wall-clock time is ever stored without one.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists btree_gist;

do $$ begin
  create type booking_status as enum ('confirmed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type cancelled_by as enum ('host', 'guest');
exception when duplicate_object then null; end $$;

-- ── profiles ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id                       uuid primary key references auth.users (id) on delete cascade,
  username                 text not null,
  full_name                text not null default '',
  job_title                text not null default '',
  email                    text not null default '',
  timezone                 text not null default 'UTC',
  avatar_url               text,
  is_admin                 boolean not null default false,
  is_suspended             boolean not null default false,
  default_duration_minutes integer not null default 30,
  default_notice_minutes   integer not null default 60,
  -- the five notification preferences, defaulted as the design specifies
  notify_new_booking       boolean not null default true,
  notify_booking_changed   boolean not null default true,
  notify_booking_cancelled boolean not null default true,
  notify_daily_agenda      boolean not null default false,
  notify_product_news      boolean not null default false,
  onboarding_completed_at  timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint profiles_username_format
    check (username ~ '^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$'),
  constraint profiles_default_duration_positive
    check (default_duration_minutes >= 5 and default_duration_minutes <= 480),
  constraint profiles_default_notice_nonneg check (default_notice_minutes >= 0)
);

create unique index if not exists profiles_username_key on public.profiles (lower(username));

-- ── meeting types ───────────────────────────────────────────────────────────
create table if not exists public.meeting_types (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references public.profiles (id) on delete cascade,
  name                   text not null,
  description            text not null default '',
  slug                   text not null,
  duration_minutes       integer not null default 30,
  buffer_minutes         integer not null default 0,
  minimum_notice_minutes integer not null default 60,
  booking_window_days    integer not null default 30,
  location               text not null default 'google_meet',
  is_active              boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint meeting_types_name_not_blank check (btrim(name) <> ''),
  constraint meeting_types_slug_format check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$'),
  constraint meeting_types_duration_valid check (duration_minutes >= 5 and duration_minutes <= 480),
  constraint meeting_types_buffer_valid check (buffer_minutes >= 0 and buffer_minutes <= 120),
  constraint meeting_types_notice_valid check (minimum_notice_minutes >= 0),
  constraint meeting_types_window_valid check (booking_window_days >= 1 and booking_window_days <= 365)
);

create unique index if not exists meeting_types_user_slug_key on public.meeting_types (user_id, slug);
create index if not exists meeting_types_user_active_idx on public.meeting_types (user_id) where is_active;

-- ── availability ────────────────────────────────────────────────────────────
-- One weekly schedule per profile (not per meeting type). Multiple ranges per
-- day is the requirement that makes a single start/end column wrong.
create table if not exists public.availability_rules (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  weekday      smallint not null,
  start_minute integer not null,
  end_minute   integer not null,
  created_at   timestamptz not null default now(),
  constraint availability_weekday_range check (weekday >= 0 and weekday <= 6),
  constraint availability_start_range check (start_minute >= 0 and start_minute <= 1440),
  constraint availability_end_range check (end_minute >= 0 and end_minute <= 1440),
  constraint availability_ordered check (end_minute > start_minute)
);

create index if not exists availability_rules_user_idx on public.availability_rules (user_id, weekday);

-- ── bookings ────────────────────────────────────────────────────────────────
create table if not exists public.bookings (
  id                     uuid primary key default gen_random_uuid(),
  reference              text not null unique default encode(gen_random_bytes(16), 'hex'),
  host_id                uuid not null references public.profiles (id) on delete cascade,
  meeting_type_id        uuid references public.meeting_types (id) on delete set null,
  meeting_name           text not null,
  duration_minutes       integer not null,
  guest_name             text not null,
  guest_email            text not null,
  guest_note             text not null default '',
  guest_timezone         text,
  starts_at              timestamptz not null,
  ends_at                timestamptz not null,
  status                 booking_status not null default 'confirmed',
  cancelled_at           timestamptz,
  cancelled_by           cancelled_by,
  google_event_id        text,
  meet_url               text,
  guest_rsvp             text,
  guest_rsvp_synced_at   timestamptz,
  guest_rsvp_notified_at timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint bookings_interval_ordered check (ends_at > starts_at),
  constraint bookings_guest_name_not_blank check (btrim(guest_name) <> ''),
  constraint bookings_guest_email_shape
    check (guest_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  constraint bookings_cancel_fields_consistent check (
    (status = 'cancelled' and cancelled_at is not null) or
    (status = 'confirmed' and cancelled_at is null)
  ),
  constraint bookings_guest_rsvp_valid check (
    guest_rsvp is null or guest_rsvp in ('needsAction', 'accepted', 'declined', 'tentative')
  )
);

-- The double-booking guard. Two confirmed bookings can never overlap for one
-- host, whatever the application layer does.
do $$ begin
  alter table public.bookings add constraint bookings_no_overlap
    exclude using gist (
      host_id with =,
      tstzrange(starts_at, ends_at, '[)') with &&
    ) where (status = 'confirmed');
exception when duplicate_object then null; end $$;

create index if not exists bookings_host_starts_idx on public.bookings (host_id, starts_at desc);
create index if not exists bookings_host_upcoming_idx
  on public.bookings (host_id, starts_at) where (status = 'confirmed');

-- ── calendar connections ────────────────────────────────────────────────────
-- No RLS policy by design: OAuth tokens are reachable only through the
-- service role, never from a browser session.
create table if not exists public.calendar_connections (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null unique references public.profiles (id) on delete cascade,
  provider             text not null default 'google',
  google_account_email text,
  calendar_id          text not null default 'primary',
  access_token         text,
  refresh_token        text,
  token_expires_at     timestamptz,
  scopes               text[] not null default '{}',
  needs_reconnect      boolean not null default false,
  last_error           text,
  last_error_at        timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ── platform + admin ────────────────────────────────────────────────────────
create table if not exists public.platform_settings (
  id            boolean primary key default true,
  app_name      text not null default 'Meetrao',
  support_email text not null default 'support@meetrao.com',
  updated_at    timestamptz not null default now(),
  constraint platform_settings_singleton check (id)
);

insert into public.platform_settings (id) values (true) on conflict (id) do nothing;

create table if not exists public.admin_activity (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references public.profiles (id) on delete set null,
  kind       text not null,
  summary    text not null,
  created_at timestamptz not null default now()
);

create index if not exists admin_activity_recent_idx on public.admin_activity (created_at desc);

-- Seeded addresses that become admins on first sign-up.
create table if not exists public.bootstrap_admins (
  email      text primary key,
  note       text not null default '',
  created_at timestamptz not null default now(),
  constraint bootstrap_admins_email_lowercase check (email = lower(email))
);

-- Usernames freed by account removal are held back rather than re-registrable.
create table if not exists public.reserved_usernames (
  username    text primary key,
  reason      text not null default 'account removed',
  reserved_at timestamptz not null default now(),
  constraint reserved_usernames_lowercase check (username = lower(username))
);

-- ── functions ───────────────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path to 'public', 'pg_temp' as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

create or replace function public.generate_username(seed text)
returns text language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare
  base text; candidate text; n integer := 0;
begin
  base := lower(coalesce(seed, ''));
  base := regexp_replace(base, '@.*$', '');
  base := regexp_replace(base, '[^a-z0-9]+', '-', 'g');
  base := btrim(base, '-');
  base := left(base, 32);
  if base is null or base = '' then base := 'host'; end if;
  if base !~ '^[a-z0-9]' then base := 'h' || base; end if;
  base := btrim(base, '-');

  candidate := base;
  loop
    exit when not exists (select 1 from public.profiles p where lower(p.username) = candidate)
          and not exists (select 1 from public.reserved_usernames r where r.username = candidate);
    n := n + 1;
    candidate := base || n::text;
  end loop;
  return candidate;
end;
$$;

create or replace function public.reject_reserved_username()
returns trigger language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
begin
  if exists (select 1 from public.reserved_usernames r where r.username = lower(new.username)) then
    raise exception 'username % is reserved', new.username using errcode = '23505';
  end if;
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare
  display_name text; bootstrap boolean;
begin
  display_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    ''
  );
  bootstrap := exists (
    select 1 from public.bootstrap_admins b where b.email = lower(btrim(coalesce(new.email, '')))
  );

  insert into public.profiles (id, username, full_name, email, is_admin)
  values (
    new.id,
    public.generate_username(coalesce(nullif(display_name, ''), new.email)),
    display_name,
    coalesce(new.email, ''),
    bootstrap
  )
  on conflict (id) do nothing;

  insert into public.admin_activity (actor_id, kind, summary)
  values (new.id, 'user_created',
          coalesce(nullif(display_name, ''), new.email, 'A user') || ' created an account');

  return new;
end;
$$;

create or replace function public.seed_default_availability(p_user_id uuid)
returns void language sql security definer set search_path to 'public', 'pg_temp' as $$
  -- Mon 09:00–12:00 + 14:00–17:00 · Tue–Thu 09:00–17:00 · Fri 09:00–15:00 · weekend off
  insert into public.availability_rules (user_id, weekday, start_minute, end_minute)
  select p_user_id, w, s, e
  from (values (1, 540, 720), (1, 840, 1020), (2, 540, 1020),
               (3, 540, 1020), (4, 540, 1020), (5, 540, 900)) as v(w, s, e)
  where not exists (select 1 from public.availability_rules a where a.user_id = p_user_id);
$$;

create or replace function public.log_booking_activity()
returns trigger language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare who text;
begin
  select coalesce(nullif(btrim(p.full_name), ''), p.username)
    into who from public.profiles p where p.id = new.host_id;

  if tg_op = 'INSERT' then
    insert into public.admin_activity (actor_id, kind, summary)
    values (new.host_id, 'booking_created', coalesce(who, 'A user') || ' received a new booking');
  elsif new.status = 'cancelled' and old.status <> 'cancelled' then
    insert into public.admin_activity (actor_id, kind, summary)
    values (new.host_id, 'booking_cancelled', coalesce(who, 'A user') || ' had a booking cancelled');
  end if;
  return new;
end;
$$;

create or replace function public.log_calendar_connected()
returns trigger language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare who text;
begin
  select coalesce(nullif(btrim(p.full_name), ''), p.username)
    into who from public.profiles p where p.id = new.user_id;
  insert into public.admin_activity (actor_id, kind, summary)
  values (new.user_id, 'calendar_connected', coalesce(who, 'A user') || ' connected Google Calendar');
  return new;
end;
$$;

create or replace function public.log_meeting_type_created()
returns trigger language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare who text;
begin
  select coalesce(nullif(btrim(p.full_name), ''), p.username)
    into who from public.profiles p where p.id = new.user_id;
  insert into public.admin_activity (actor_id, kind, summary)
  values (new.user_id, 'meeting_created', coalesce(who, 'A user') || ' created "' || new.name || '"');
  return new;
end;
$$;

-- ── public read API ─────────────────────────────────────────────────────────
-- A guest reads a host's public booking data with no session at all. These are
-- the only doors into that data, and each returns exactly the public columns.
create or replace function public.get_public_host(p_username text)
returns table (id uuid, username text, full_name text, job_title text, timezone text, avatar_url text)
language sql stable security definer set search_path to 'public', 'pg_temp' as $$
  select p.id, p.username, p.full_name, p.job_title, p.timezone, p.avatar_url
  from public.profiles p
  where lower(p.username) = lower(btrim(p_username))
  limit 1;
$$;

create or replace function public.get_public_meeting_types(p_username text)
returns table (id uuid, name text, description text, slug text, duration_minutes integer,
               buffer_minutes integer, minimum_notice_minutes integer, booking_window_days integer,
               location text)
language sql stable security definer set search_path to 'public', 'pg_temp' as $$
  select m.id, m.name, m.description, m.slug, m.duration_minutes, m.buffer_minutes,
         m.minimum_notice_minutes, m.booking_window_days, m.location
  from public.meeting_types m
  join public.profiles p on p.id = m.user_id
  where lower(p.username) = lower(btrim(p_username)) and m.is_active
  order by m.created_at;
$$;

create or replace function public.get_public_availability(p_user_id uuid)
returns table (weekday smallint, start_minute integer, end_minute integer)
language sql stable security definer set search_path to 'public', 'pg_temp' as $$
  select a.weekday, a.start_minute, a.end_minute
  from public.availability_rules a
  where a.user_id = p_user_id
  order by a.weekday, a.start_minute;
$$;

-- Only the interval is exposed — never what the host has booked, or with whom.
create or replace function public.get_busy_intervals(
  p_user_id uuid, p_from timestamptz, p_to timestamptz
)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path to 'public', 'pg_temp' as $$
  select b.starts_at, b.ends_at
  from public.bookings b
  where b.host_id = p_user_id
    and b.status = 'confirmed'
    and b.ends_at > p_from
    and b.starts_at < p_to
  order by b.starts_at;
$$;

-- Suspension is reversible; removal is not. They are deliberately separate.
create or replace function public.admin_remove_account(p_user_id uuid)
returns table (removed_username text, removed_email text)
language plpgsql security definer set search_path to 'public', 'auth', 'pg_temp' as $$
declare v_username text; v_email text;
begin
  select p.username, p.email into v_username, v_email
  from public.profiles p where p.id = p_user_id;

  if v_username is null then raise exception 'no such account'; end if;

  insert into public.reserved_usernames (username, reason)
  values (lower(v_username), 'account removed')
  on conflict (username) do nothing;

  delete from auth.users where id = p_user_id;

  removed_username := v_username;
  removed_email := v_email;
  return next;
end;
$$;

-- ── triggers ────────────────────────────────────────────────────────────────
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles for each row execute function public.touch_updated_at();

drop trigger if exists profiles_reject_reserved_username on public.profiles;
create trigger profiles_reject_reserved_username
  before insert or update of username on public.profiles
  for each row execute function public.reject_reserved_username();

drop trigger if exists meeting_types_touch_updated_at on public.meeting_types;
create trigger meeting_types_touch_updated_at
  before update on public.meeting_types for each row execute function public.touch_updated_at();

drop trigger if exists meeting_types_log_created on public.meeting_types;
create trigger meeting_types_log_created
  after insert on public.meeting_types for each row execute function public.log_meeting_type_created();

drop trigger if exists bookings_touch_updated_at on public.bookings;
create trigger bookings_touch_updated_at
  before update on public.bookings for each row execute function public.touch_updated_at();

drop trigger if exists bookings_log_created on public.bookings;
create trigger bookings_log_created
  after insert on public.bookings for each row execute function public.log_booking_activity();

drop trigger if exists bookings_log_cancelled on public.bookings;
create trigger bookings_log_cancelled
  after update of status on public.bookings for each row execute function public.log_booking_activity();

drop trigger if exists calendar_connections_touch_updated_at on public.calendar_connections;
create trigger calendar_connections_touch_updated_at
  before update on public.calendar_connections for each row execute function public.touch_updated_at();

drop trigger if exists calendar_connections_log_created on public.calendar_connections;
create trigger calendar_connections_log_created
  after insert on public.calendar_connections for each row execute function public.log_calendar_connected();

drop trigger if exists platform_settings_touch_updated_at on public.platform_settings;
create trigger platform_settings_touch_updated_at
  before update on public.platform_settings for each row execute function public.touch_updated_at();

-- ── row-level security ──────────────────────────────────────────────────────
-- Written from the start, not retrofitted: a guest reads public booking data
-- with no session (through the definer functions above), a host reads only
-- their own, an admin reads everything.
alter table public.profiles enable row level security;
alter table public.meeting_types enable row level security;
alter table public.availability_rules enable row level security;
alter table public.bookings enable row level security;
alter table public.calendar_connections enable row level security;
alter table public.platform_settings enable row level security;
alter table public.admin_activity enable row level security;
alter table public.bootstrap_admins enable row level security;
alter table public.reserved_usernames enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin on public.profiles
  for select to authenticated using (public.is_admin());

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists meeting_types_own on public.meeting_types;
create policy meeting_types_own on public.meeting_types
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists meeting_types_select_admin on public.meeting_types;
create policy meeting_types_select_admin on public.meeting_types
  for select to authenticated using (public.is_admin());

drop policy if exists availability_own on public.availability_rules;
create policy availability_own on public.availability_rules
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists availability_select_admin on public.availability_rules;
create policy availability_select_admin on public.availability_rules
  for select to authenticated using (public.is_admin());

drop policy if exists bookings_select_own on public.bookings;
create policy bookings_select_own on public.bookings
  for select to authenticated using (host_id = (select auth.uid()));

drop policy if exists bookings_update_own on public.bookings;
create policy bookings_update_own on public.bookings
  for update to authenticated using (host_id = (select auth.uid())) with check (host_id = (select auth.uid()));

drop policy if exists bookings_select_admin on public.bookings;
create policy bookings_select_admin on public.bookings
  for select to authenticated using (public.is_admin());

drop policy if exists platform_settings_select on public.platform_settings;
create policy platform_settings_select on public.platform_settings
  for select to authenticated using (true);

drop policy if exists platform_settings_update_admin on public.platform_settings;
create policy platform_settings_update_admin on public.platform_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists admin_activity_select_admin on public.admin_activity;
create policy admin_activity_select_admin on public.admin_activity
  for select to authenticated using (public.is_admin());
