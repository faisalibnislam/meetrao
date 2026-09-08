-- ─────────────────────────────────────────────────────────────────────────────
-- 0002 · The guest-facing booking API
--
-- Three things a guest does with no session at all: create a booking, read one
-- back by its reference, and cancel it. Each is a SECURITY DEFINER function so
-- the tables stay closed to anon.
--
-- Plus the booking-page telemetry the dashboard's "Avg. reply time" card needs
-- — it measures link-opened → booked, which nothing recorded before.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── booking-page telemetry ──────────────────────────────────────────────────
create table if not exists public.booking_page_views (
  id              uuid primary key default gen_random_uuid(),
  host_id         uuid not null references public.profiles (id) on delete cascade,
  meeting_type_id uuid references public.meeting_types (id) on delete set null,
  opened_at       timestamptz not null default now()
);

create index if not exists booking_page_views_host_idx
  on public.booking_page_views (host_id, opened_at desc);

alter table public.booking_page_views enable row level security;

drop policy if exists booking_page_views_select_own on public.booking_page_views;
create policy booking_page_views_select_own on public.booking_page_views
  for select to authenticated using (host_id = (select auth.uid()));

drop policy if exists booking_page_views_select_admin on public.booking_page_views;
create policy booking_page_views_select_admin on public.booking_page_views
  for select to authenticated using (public.is_admin());

-- The view that produced a booking, so the gap between the two is measurable.
alter table public.bookings
  add column if not exists page_view_id uuid references public.booking_page_views (id) on delete set null;

create or replace function public.record_booking_page_view(
  p_host_id uuid,
  p_meeting_type_id uuid default null
)
returns uuid
language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare v_id uuid;
begin
  insert into public.booking_page_views (host_id, meeting_type_id)
  values (p_host_id, p_meeting_type_id)
  returning id into v_id;
  return v_id;
end;
$$;

-- Average time from a booking page being opened to a booking being made.
-- Returns null when nothing has been measured yet — the card renders "—"
-- rather than inventing a figure.
create or replace function public.avg_reply_minutes(p_user_id uuid, p_days integer default 30)
returns numeric
language sql stable security definer set search_path to 'public', 'pg_temp' as $$
  select avg(extract(epoch from (b.created_at - v.opened_at)) / 60.0)
  from public.bookings b
  join public.booking_page_views v on v.id = b.page_view_id
  where b.host_id = p_user_id
    and b.created_at > now() - make_interval(days => p_days)
    and b.created_at >= v.opened_at;
$$;

-- ── create a booking ────────────────────────────────────────────────────────
-- The caller has already re-run the slot engine (availability, notice, window,
-- buffer) against fresh data. This is the atomic half: it re-checks conflicts
-- inside the transaction that inserts, so the "someone booked it while you were
-- filling this in" state the design renders is the truth and not a guess.
--
-- Raises SQLSTATE 'MR409' when the slot is gone. Everything else propagates.
create or replace function public.create_booking(
  p_username        text,
  p_slug            text,
  p_starts_at       timestamptz,
  p_guest_name      text,
  p_guest_email     text,
  p_guest_note      text default '',
  p_guest_timezone  text default null,
  p_page_view_id    uuid default null
)
returns table (
  reference     text,
  id            uuid,
  starts_at     timestamptz,
  ends_at       timestamptz,
  meeting_name  text,
  duration      integer,
  host_id       uuid
)
language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare
  v_host      public.profiles%rowtype;
  v_type      public.meeting_types%rowtype;
  v_ends      timestamptz;
  v_buffer    interval;
  v_new       public.bookings%rowtype;
begin
  select * into v_host from public.profiles p where lower(p.username) = lower(btrim(p_username));
  if v_host.id is null then
    raise exception 'unknown host' using errcode = 'MR404';
  end if;
  if v_host.is_suspended then
    raise exception 'host is not accepting bookings' using errcode = 'MR403';
  end if;

  select * into v_type
  from public.meeting_types m
  where m.user_id = v_host.id and m.slug = p_slug and m.is_active;
  if v_type.id is null then
    raise exception 'unknown meeting' using errcode = 'MR404';
  end if;

  v_ends := p_starts_at + make_interval(mins => v_type.duration_minutes);
  v_buffer := make_interval(mins => v_type.buffer_minutes);

  -- Minimum notice and booking window, re-checked against the clock now.
  if p_starts_at < now() + make_interval(mins => v_type.minimum_notice_minutes) then
    raise exception 'inside minimum notice' using errcode = 'MR409';
  end if;
  if p_starts_at > now() + make_interval(days => v_type.booking_window_days) then
    raise exception 'beyond booking window' using errcode = 'MR409';
  end if;

  -- Buffer applies both sides, so a neighbouring booking blocks this one even
  -- when the two intervals do not themselves overlap.
  if exists (
    select 1 from public.bookings b
    where b.host_id = v_host.id
      and b.status = 'confirmed'
      and b.ends_at + v_buffer > p_starts_at
      and b.starts_at - v_buffer < v_ends
  ) then
    raise exception 'slot taken' using errcode = 'MR409';
  end if;

  begin
    insert into public.bookings (
      host_id, meeting_type_id, meeting_name, duration_minutes,
      guest_name, guest_email, guest_note, guest_timezone,
      starts_at, ends_at, page_view_id
    )
    values (
      v_host.id, v_type.id, v_type.name, v_type.duration_minutes,
      btrim(p_guest_name), lower(btrim(p_guest_email)), coalesce(p_guest_note, ''), p_guest_timezone,
      p_starts_at, v_ends, p_page_view_id
    )
    returning * into v_new;
  exception when exclusion_violation then
    -- Two guests submitted the same slot at once; the constraint decided.
    raise exception 'slot taken' using errcode = 'MR409';
  end;

  reference := v_new.reference;
  id := v_new.id;
  starts_at := v_new.starts_at;
  ends_at := v_new.ends_at;
  meeting_name := v_new.meeting_name;
  duration := v_new.duration_minutes;
  host_id := v_new.host_id;
  return next;
end;
$$;

-- ── read a booking back ─────────────────────────────────────────────────────
-- The reference is 32 hex characters of CSPRNG, and it is the only credential
-- the guest has. Nothing here exposes the host's other bookings.
create or replace function public.get_booking_by_reference(p_reference text)
returns table (
  reference        text,
  meeting_name     text,
  duration_minutes integer,
  guest_name       text,
  guest_email      text,
  guest_note       text,
  guest_timezone   text,
  starts_at        timestamptz,
  ends_at          timestamptz,
  status           booking_status,
  meet_url         text,
  host_name        text,
  host_username    text,
  host_timezone    text
)
language sql stable security definer set search_path to 'public', 'pg_temp' as $$
  select b.reference, b.meeting_name, b.duration_minutes, b.guest_name, b.guest_email,
         b.guest_note, b.guest_timezone, b.starts_at, b.ends_at, b.status, b.meet_url,
         p.full_name, p.username, p.timezone
  from public.bookings b
  join public.profiles p on p.id = b.host_id
  where b.reference = p_reference
  limit 1;
$$;

-- Guests cancel and rebook; there is no reschedule flow.
create or replace function public.cancel_booking_by_reference(p_reference text)
returns table (
  id           uuid,
  host_id      uuid,
  meeting_name text,
  starts_at    timestamptz,
  guest_name   text,
  guest_email  text,
  was_open     boolean
)
language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare v public.bookings%rowtype; v_open boolean;
begin
  select * into v from public.bookings b where b.reference = p_reference for update;
  if v.id is null then
    raise exception 'unknown booking' using errcode = 'MR404';
  end if;

  v_open := v.status = 'confirmed';

  if v_open then
    update public.bookings
      set status = 'cancelled', cancelled_at = now(), cancelled_by = 'guest'
      where id = v.id
      returning * into v;
  end if;

  id := v.id;
  host_id := v.host_id;
  meeting_name := v.meeting_name;
  starts_at := v.starts_at;
  guest_name := v.guest_name;
  guest_email := v.guest_email;
  was_open := v_open;
  return next;
end;
$$;

-- ── username availability ───────────────────────────────────────────────────
-- Backs the debounced check on onboarding step 1 and in Settings → Profile.
-- Format and the reserved-word list are enforced in the app as well; this is
-- the half that needs the database.
create or replace function public.username_available(p_username text, p_for_user uuid default null)
returns boolean
language sql stable security definer set search_path to 'public', 'pg_temp' as $$
  select not exists (
    select 1 from public.profiles p
    where lower(p.username) = lower(btrim(p_username))
      and (p_for_user is null or p.id <> p_for_user)
  ) and not exists (
    select 1 from public.reserved_usernames r where r.username = lower(btrim(p_username))
  );
$$;

-- ── grants ──────────────────────────────────────────────────────────────────
-- anon needs exactly the guest-facing doors, and nothing else.
revoke all on function public.create_booking(text, text, timestamptz, text, text, text, text, uuid) from public;
revoke all on function public.cancel_booking_by_reference(text) from public;
revoke all on function public.get_booking_by_reference(text) from public;
revoke all on function public.record_booking_page_view(uuid, uuid) from public;
revoke all on function public.username_available(text, uuid) from public;
revoke all on function public.avg_reply_minutes(uuid, integer) from public;

grant execute on function public.create_booking(text, text, timestamptz, text, text, text, text, uuid) to anon, authenticated, service_role;
grant execute on function public.cancel_booking_by_reference(text) to anon, authenticated, service_role;
grant execute on function public.get_booking_by_reference(text) to anon, authenticated, service_role;
grant execute on function public.record_booking_page_view(uuid, uuid) to anon, authenticated, service_role;
grant execute on function public.username_available(text, uuid) to anon, authenticated, service_role;
grant execute on function public.avg_reply_minutes(uuid, integer) to authenticated, service_role;
