-- Named availability schedules, assignable per meeting type.
--
-- Until now a host had exactly one weekly pattern and every meeting used it.
-- That is wrong for the way people actually work: intro calls on weekday
-- mornings, deep-dive sessions on two afternoons, a weekend slot for one
-- client. This gives a host as many named schedules as they want and lets each
-- meeting type point at one.
--
-- Backward compatible by construction. Every existing profile gets a schedule
-- called "Working hours" holding exactly the rules it already had, marked as
-- the default, and meeting_types.schedule_id starts NULL — which means "use my
-- default". A host who never opens the new UI sees no change at all.

-- ── the schedule ────────────────────────────────────────────────────────────
create table if not exists public.availability_schedules (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  name       text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint availability_schedules_name_not_blank check (btrim(name) <> ''),
  constraint availability_schedules_name_length check (char_length(btrim(name)) <= 60)
);

-- At most one default per host. A partial unique index says that in the one
-- place it cannot be forgotten; the app clears the old default in the same
-- statement that sets the new one.
create unique index if not exists availability_schedules_one_default
  on public.availability_schedules (user_id) where is_default;

-- Two schedules called "Working hours" would be indistinguishable in the
-- meeting form's picker, which is the whole point of naming them.
create unique index if not exists availability_schedules_name_unique
  on public.availability_schedules (user_id, lower(btrim(name)));

create index if not exists availability_schedules_user_idx
  on public.availability_schedules (user_id, created_at);

drop trigger if exists availability_schedules_touch on public.availability_schedules;
create trigger availability_schedules_touch
  before update on public.availability_schedules
  for each row execute function public.touch_updated_at();

-- ── the two new columns ─────────────────────────────────────────────────────
-- Rules belong to a schedule. user_id stays: it is what RLS reads, and losing
-- it would mean every policy had to join.
alter table public.availability_rules
  add column if not exists schedule_id uuid references public.availability_schedules (id) on delete cascade;

-- NULL means "my default schedule", so a meeting created before this migration
-- — or by a host who never picks — keeps behaving exactly as it did. It is also
-- what makes `on delete set null` the right rule: deleting a schedule moves its
-- meetings back to the default rather than orphaning or blocking them.
alter table public.meeting_types
  add column if not exists schedule_id uuid references public.availability_schedules (id) on delete set null;

-- ── backfill ────────────────────────────────────────────────────────────────
insert into public.availability_schedules (user_id, name, is_default)
select p.id, 'Working hours', true
from public.profiles p
where not exists (select 1 from public.availability_schedules s where s.user_id = p.id);

update public.availability_rules a
set schedule_id = s.id
from public.availability_schedules s
where s.user_id = a.user_id and s.is_default and a.schedule_id is null;

alter table public.availability_rules alter column schedule_id set not null;

create index if not exists availability_rules_schedule_idx
  on public.availability_rules (schedule_id, weekday);

-- ── access ──────────────────────────────────────────────────────────────────
alter table public.availability_schedules enable row level security;

drop policy if exists availability_schedules_own on public.availability_schedules;
create policy availability_schedules_own on public.availability_schedules
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists availability_schedules_select_admin on public.availability_schedules;
create policy availability_schedules_select_admin on public.availability_schedules
  for select to authenticated using (public.is_admin());

grant select, insert, update, delete on public.availability_schedules to authenticated;
-- Not anon. Every guest-facing read goes through a security-definer function
-- below, which returns hours and nothing else — not a schedule's name, which is
-- the host's private note to themselves.
revoke all on public.availability_schedules from anon;

-- ── resolution ──────────────────────────────────────────────────────────────
-- The one place "which schedule does this meeting use" is answered. Ordering by
-- is_default first and created_at second means a host whose default flag was
-- somehow lost still resolves to their oldest schedule rather than to nothing.
create or replace function public.default_schedule_id(p_user_id uuid)
returns uuid language sql stable security definer set search_path to 'public', 'pg_temp' as $$
  select s.id
  from public.availability_schedules s
  where s.user_id = p_user_id
  order by s.is_default desc, s.created_at
  limit 1;
$$;

revoke all on function public.default_schedule_id(uuid) from public, anon;
grant execute on function public.default_schedule_id(uuid) to authenticated, service_role;

-- What the booking page asks for: the hours behind one meeting, resolved.
create or replace function public.get_meeting_availability(p_meeting_id uuid)
returns table (weekday smallint, start_minute integer, end_minute integer)
language sql stable security definer set search_path to 'public', 'pg_temp' as $$
  select a.weekday, a.start_minute, a.end_minute
  from public.meeting_types m
  join public.availability_rules a
    on a.schedule_id = coalesce(m.schedule_id, public.default_schedule_id(m.user_id))
  where m.id = p_meeting_id and m.is_active
  order by a.weekday, a.start_minute;
$$;

revoke all on function public.get_meeting_availability(uuid) from public;
grant execute on function public.get_meeting_availability(uuid) to anon, authenticated, service_role;

-- ── seeding a new account ───────────────────────────────────────────────────
-- Now creates the schedule as well as the rules. The guard still keys off the
-- rules, so an account that already has hours is untouched.
create or replace function public.seed_default_availability(p_user_id uuid)
returns void language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare v_schedule uuid;
begin
  insert into public.availability_schedules (user_id, name, is_default)
  select p_user_id, 'Working hours', true
  where not exists (select 1 from public.availability_schedules s where s.user_id = p_user_id);

  select public.default_schedule_id(p_user_id) into v_schedule;
  if v_schedule is null then
    return;
  end if;

  -- Mon 09:00–12:00 + 14:00–17:00 · Tue–Thu 09:00–17:00 · Fri 09:00–15:00 · weekend off
  insert into public.availability_rules (user_id, schedule_id, weekday, start_minute, end_minute)
  select p_user_id, v_schedule, w, s, e
  from (values (1, 540, 720), (1, 840, 1020), (2, 540, 1020),
               (3, 540, 1020), (4, 540, 1020), (5, 540, 900)) as v(w, s, e)
  where not exists (select 1 from public.availability_rules a where a.user_id = p_user_id);
end;
$$;

-- ── the guest-facing door ───────────────────────────────────────────────────
-- create_booking's availability check now reads the MEETING's schedule, not
-- every rule the host owns. Without this a host with a weekend schedule for one
-- meeting would accept weekend bookings on all of them — the same class of hole
-- 0005 closed, reopened by having more than one set of hours.
--
-- Everything else in this function is 0005 verbatim.
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
  v_local     timestamp;
  v_weekday   smallint;
  v_minute    integer;
  v_schedule  uuid;
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

  if p_starts_at < now() + make_interval(mins => v_type.minimum_notice_minutes) then
    raise exception 'inside minimum notice' using errcode = 'MR409';
  end if;
  if p_starts_at > now() + make_interval(days => v_type.booking_window_days) then
    raise exception 'beyond booking window' using errcode = 'MR409';
  end if;

  v_local   := p_starts_at at time zone coalesce(v_host.timezone, 'UTC');
  v_weekday := extract(dow from v_local)::smallint;
  v_minute  := extract(hour from v_local)::int * 60 + extract(minute from v_local)::int;

  v_schedule := coalesce(v_type.schedule_id, public.default_schedule_id(v_host.id));

  if not exists (
    select 1 from public.availability_rules a
    where a.schedule_id = v_schedule
      and a.weekday = v_weekday
      and v_minute >= a.start_minute
      and v_minute + v_type.duration_minutes <= a.end_minute
  ) then
    raise exception 'outside availability' using errcode = 'MR409';
  end if;

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

-- create or replace resets grants to the defaults, so re-apply 0002's intent.
revoke all on function public.create_booking(text, text, timestamptz, text, text, text, text, uuid) from public;
grant execute on function public.create_booking(text, text, timestamptz, text, text, text, text, uuid)
  to anon, authenticated, service_role;
