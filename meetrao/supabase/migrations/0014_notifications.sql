-- Notifications.
--
-- A host learns about a booking from an email, or by noticing the dashboard
-- changed. Neither survives being away for a day. This is the record: what
-- happened, when, and whether it has been seen.
--
-- Written by triggers, for the same reason contacts are: bookings arrive and
-- change through several doors — the guest RPC granted to `anon`, the host's
-- own scheduling action on the service role, the cancel action, the guest
-- cancellation page — and application code would have to remember every one.
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  kind       text not null,
  title      text not null,
  body       text not null default '',
  -- Kept so the row can link through, cleared rather than cascading: the
  -- notification that a booking was cancelled should outlive the booking.
  booking_id uuid references public.bookings (id) on delete set null,
  read_at    timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_kind_known
    check (kind in ('booking_new', 'booking_cancelled', 'booking_changed'))
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);

-- The sidebar badge counts unread on every app page load, so it gets its own
-- partial index rather than scanning the whole history.
create index if not exists notifications_unread_idx
  on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists notifications_own on public.notifications;
create policy notifications_own on public.notifications
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select, insert, update, delete on public.notifications to authenticated;
revoke all on public.notifications from anon;

-- ── written by the database ─────────────────────────────────────────────────
create or replace function public.notify_host(
  p_user_id uuid, p_kind text, p_title text, p_body text, p_booking uuid
)
returns void language sql security definer set search_path to 'public', 'pg_temp' as $$
  insert into public.notifications (user_id, kind, title, body, booking_id)
  values (p_user_id, p_kind, p_title, p_body, p_booking);
$$;

revoke all on function public.notify_host(uuid, text, text, text, uuid) from public, anon, authenticated;

/* The host's local wall clock, written the way the emails write it. A
   notification that says "09:00" in UTC to someone in Dhaka is worse than one
   that says nothing. */
create or replace function public.local_when(p_at timestamptz, p_user uuid)
returns text language sql stable security definer set search_path to 'public', 'pg_temp' as $$
  select to_char(
    p_at at time zone coalesce((select p.timezone from public.profiles p where p.id = p_user), 'UTC'),
    'FMDay FMDD FMMon, FMHH12:MI AM'
  );
$$;

revoke all on function public.local_when(timestamptz, uuid) from public, anon, authenticated;

create or replace function public.notify_booking_created()
returns trigger language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
begin
  -- A host who scheduled the meeting themselves does not need telling that they
  -- did. Only bookings that arrived from outside are news.
  if new.host_created then
    return new;
  end if;

  perform public.notify_host(
    new.host_id, 'booking_new',
    new.guest_name || ' booked ' || new.meeting_name,
    public.local_when(new.starts_at, new.host_id),
    new.id);
  return new;
end;
$$;

drop trigger if exists bookings_notify_created on public.bookings;
create trigger bookings_notify_created
  after insert on public.bookings
  for each row execute function public.notify_booking_created();

create or replace function public.notify_booking_changed()
returns trigger language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
begin
  if old.status = 'confirmed' and new.status = 'cancelled' then
    perform public.notify_host(
      new.host_id, 'booking_cancelled',
      new.meeting_name || ' with ' || new.guest_name || ' was cancelled',
      case when new.cancelled_by = 'guest' then 'Cancelled by the guest · ' else 'Cancelled by you · ' end
        || public.local_when(new.starts_at, new.host_id),
      new.id);

  elsif new.status = 'confirmed' and old.starts_at is distinct from new.starts_at then
    perform public.notify_host(
      new.host_id, 'booking_changed',
      new.meeting_name || ' with ' || new.guest_name || ' moved',
      'Now ' || public.local_when(new.starts_at, new.host_id)
        || ' · was ' || public.local_when(old.starts_at, new.host_id),
      new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_notify_changed on public.bookings;
create trigger bookings_notify_changed
  after update on public.bookings
  for each row execute function public.notify_booking_changed();
