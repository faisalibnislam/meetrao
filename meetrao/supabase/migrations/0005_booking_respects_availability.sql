-- create_booking never checked the host's weekly availability.
--
-- It validated the host, the meeting type, minimum notice, the booking window,
-- the buffer and the overlap — everything except whether the host actually
-- works then. The application's slot engine does check it, in
-- src/lib/booking/slots.ts, before ever calling this. But create_booking is
-- granted to `anon` because it is the guest-facing door, and the publishable
-- key ships to every browser, so anyone could POST straight past the app and
-- book 03:00 on a Sunday. Verified against the live database: a Sunday 10:00
-- booking for a Monday-to-Friday host was accepted.
--
-- The check mirrors the slot engine exactly: the weekday and the minute-of-day
-- are read in the HOST's timezone, and the meeting has to finish inside the
-- same range it starts in — a booking that would run past the end of the range
-- is refused, as is one on a weekday with no rule at all. A meeting crossing
-- local midnight pushes the end minute past 1440, which no rule can contain,
-- so it is refused too.
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

  if not exists (
    select 1 from public.availability_rules a
    where a.user_id = v_host.id
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
