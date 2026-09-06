-- Meetrao — functions and triggers

-- ── Admin check ────────────────────────────────────────────────────────────
-- SECURITY DEFINER so that policies on `profiles` can call it without
-- recursing back through the very policy being evaluated.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, service_role;

-- ── Username generation ────────────────────────────────────────────────────
-- Slugify a seed and append a numeric suffix until it is free. Used at signup
-- so a new host always lands on a usable booking link.

create or replace function public.generate_username(seed text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  base      text;
  candidate text;
  n         integer := 0;
begin
  base := lower(coalesce(seed, ''));
  base := regexp_replace(base, '@.*$', '');          -- drop an email domain
  base := regexp_replace(base, '[^a-z0-9]+', '-', 'g');
  base := btrim(base, '-');
  base := left(base, 32);

  if base is null or base = '' then
    base := 'host';
  end if;

  -- The format check requires the first and last character to be alphanumeric.
  if base !~ '^[a-z0-9]' then
    base := 'h' || base;
  end if;
  base := btrim(base, '-');

  candidate := base;
  loop
    exit when not exists (
      select 1 from public.profiles p where lower(p.username) = candidate
    );
    n := n + 1;
    candidate := base || n::text;
  end loop;

  return candidate;
end;
$$;

revoke all on function public.generate_username(text) from public;
grant execute on function public.generate_username(text) to service_role;

-- ── New user → profile ─────────────────────────────────────────────────────
-- Fires for both email/password signup and Google OAuth. Google supplies
-- `full_name` (or `name`) in raw_user_meta_data.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  display_name text;
begin
  display_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    ''
  );

  insert into public.profiles (id, username, full_name, email)
  values (
    new.id,
    public.generate_username(coalesce(nullif(display_name, ''), new.email)),
    display_name,
    coalesce(new.email, '')
  )
  on conflict (id) do nothing;

  insert into public.admin_activity (actor_id, kind, summary)
  values (
    new.id,
    'user_created',
    coalesce(nullif(display_name, ''), new.email, 'A user') || ' created an account'
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Default availability ───────────────────────────────────────────────────
-- Mon 09:00–12:00 + 14:00–17:00, Tue–Thu 09:00–17:00, Fri 09:00–15:00,
-- weekends off — the defaults the onboarding step ships with.

create or replace function public.seed_default_availability(p_user_id uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.availability_rules (user_id, weekday, start_minute, end_minute)
  select p_user_id, w, s, e
  from (values
    (1, 540, 720),   -- Monday    09:00–12:00
    (1, 840, 1020),  -- Monday    14:00–17:00
    (2, 540, 1020),  -- Tuesday   09:00–17:00
    (3, 540, 1020),  -- Wednesday 09:00–17:00
    (4, 540, 1020),  -- Thursday  09:00–17:00
    (5, 540, 900)    -- Friday    09:00–15:00
  ) as v(w, s, e)
  where not exists (
    select 1 from public.availability_rules a where a.user_id = p_user_id
  );
$$;

revoke all on function public.seed_default_availability(uuid) from public;
grant execute on function public.seed_default_availability(uuid) to authenticated, service_role;

-- ── Activity feed triggers ─────────────────────────────────────────────────

create or replace function public.log_meeting_type_created()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  who text;
begin
  select coalesce(nullif(btrim(p.full_name), ''), p.username)
    into who from public.profiles p where p.id = new.user_id;

  insert into public.admin_activity (actor_id, kind, summary)
  values (new.user_id, 'meeting_created',
          coalesce(who, 'A user') || ' created "' || new.name || '"');
  return new;
end;
$$;

create trigger meeting_types_log_created
  after insert on public.meeting_types
  for each row execute function public.log_meeting_type_created();

create or replace function public.log_booking_activity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  who text;
begin
  select coalesce(nullif(btrim(p.full_name), ''), p.username)
    into who from public.profiles p where p.id = new.host_id;

  if tg_op = 'INSERT' then
    insert into public.admin_activity (actor_id, kind, summary)
    values (new.host_id, 'booking_created',
            coalesce(who, 'A user') || ' received a new booking');
  elsif new.status = 'cancelled' and old.status <> 'cancelled' then
    insert into public.admin_activity (actor_id, kind, summary)
    values (new.host_id, 'booking_cancelled',
            coalesce(who, 'A user') || ' had a booking cancelled');
  end if;

  return new;
end;
$$;

create trigger bookings_log_created
  after insert on public.bookings
  for each row execute function public.log_booking_activity();

create trigger bookings_log_cancelled
  after update of status on public.bookings
  for each row execute function public.log_booking_activity();

create or replace function public.log_calendar_connected()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  who text;
begin
  select coalesce(nullif(btrim(p.full_name), ''), p.username)
    into who from public.profiles p where p.id = new.user_id;

  insert into public.admin_activity (actor_id, kind, summary)
  values (new.user_id, 'calendar_connected',
          coalesce(who, 'A user') || ' connected Google Calendar');
  return new;
end;
$$;

create trigger calendar_connections_log_created
  after insert on public.calendar_connections
  for each row execute function public.log_calendar_connected();
