-- Meetrao — the public booking surface
--
-- The anonymous role has no table access. Everything a guest needs to render
-- meetrao.com/<username> comes through these SECURITY DEFINER functions, each
-- returning a narrow, deliberately chosen column set. Notably
-- get_busy_intervals returns times only — never a guest name or email — so one
-- guest can never learn who else has booked a host.

-- ── Host lookup ────────────────────────────────────────────────────────────

create or replace function public.get_public_host(p_username text)
returns table (
  id         uuid,
  username   text,
  full_name  text,
  job_title  text,
  timezone   text,
  avatar_url text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.id, p.username, p.full_name, p.job_title, p.timezone, p.avatar_url
  from public.profiles p
  where lower(p.username) = lower(btrim(p_username))
  limit 1;
$$;

-- ── Active meeting types ───────────────────────────────────────────────────

create or replace function public.get_public_meeting_types(p_username text)
returns table (
  id                     uuid,
  name                   text,
  description            text,
  slug                   text,
  duration_minutes       integer,
  buffer_minutes         integer,
  minimum_notice_minutes integer,
  booking_window_days    integer,
  location               text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.id, m.name, m.description, m.slug, m.duration_minutes,
         m.buffer_minutes, m.minimum_notice_minutes, m.booking_window_days,
         m.location
  from public.meeting_types m
  join public.profiles p on p.id = m.user_id
  where lower(p.username) = lower(btrim(p_username))
    and m.is_active
  order by m.created_at;
$$;

-- ── Weekly availability ────────────────────────────────────────────────────

create or replace function public.get_public_availability(p_user_id uuid)
returns table (
  weekday      smallint,
  start_minute integer,
  end_minute   integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select a.weekday, a.start_minute, a.end_minute
  from public.availability_rules a
  where a.user_id = p_user_id
  order by a.weekday, a.start_minute;
$$;

-- ── Busy intervals ─────────────────────────────────────────────────────────
-- Times only. Buffers are applied by the caller, which knows the meeting type.

create or replace function public.get_busy_intervals(
  p_user_id uuid,
  p_from    timestamptz,
  p_to      timestamptz
)
returns table (
  starts_at timestamptz,
  ends_at   timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select b.starts_at, b.ends_at
  from public.bookings b
  where b.host_id = p_user_id
    and b.status = 'confirmed'
    and b.ends_at > p_from
    and b.starts_at < p_to
  order by b.starts_at;
$$;

-- ── Grants ─────────────────────────────────────────────────────────────────

revoke all on function public.get_public_host(text)            from public;
revoke all on function public.get_public_meeting_types(text)   from public;
revoke all on function public.get_public_availability(uuid)    from public;
revoke all on function public.get_busy_intervals(uuid, timestamptz, timestamptz) from public;

grant execute on function public.get_public_host(text)          to anon, authenticated, service_role;
grant execute on function public.get_public_meeting_types(text) to anon, authenticated, service_role;
grant execute on function public.get_public_availability(uuid)  to anon, authenticated, service_role;
grant execute on function public.get_busy_intervals(uuid, timestamptz, timestamptz)
  to anon, authenticated, service_role;
