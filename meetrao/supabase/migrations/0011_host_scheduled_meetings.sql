-- Host-scheduled meetings, with more than one invitee.
--
-- Until now the product ran one way only: a guest opens the link and books. A
-- host who wanted to put a meeting in front of two people had to ask them to
-- book it themselves. This adds the other direction — the host picks the time
-- and invites whoever should be there.
--
-- `bookings` keeps exactly one guest column pair, and that stays true: the
-- first invitee is the guest, so every existing surface — the confirmation
-- email, the .ics, the guest cancellation page, the admin console — works
-- unchanged. Additional invitees live here.
create table if not exists public.booking_invitees (
  id         uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  name       text not null default '',
  email      text not null,
  created_at timestamptz not null default now(),
  constraint booking_invitees_email_shape
    check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);

-- Inviting the same address twice would send two identical emails and add one
-- attendee, which reads as a bug from both ends.
create unique index if not exists booking_invitees_unique
  on public.booking_invitees (booking_id, lower(email));

create index if not exists booking_invitees_booking_idx
  on public.booking_invitees (booking_id);

-- Which direction the booking came from. The guest path is still the default,
-- so every existing row is correctly false.
alter table public.bookings
  add column if not exists host_created boolean not null default false;

alter table public.booking_invitees enable row level security;

-- An invitee row is readable and writable by the host of its booking, and by
-- nobody else. The guest never signs in, so there is no guest-facing policy —
-- everything a guest sees goes through a security-definer function.
drop policy if exists booking_invitees_own on public.booking_invitees;
create policy booking_invitees_own on public.booking_invitees
  for all to authenticated
  using (exists (select 1 from public.bookings b where b.id = booking_id and b.host_id = (select auth.uid())))
  with check (exists (select 1 from public.bookings b where b.id = booking_id and b.host_id = (select auth.uid())));

drop policy if exists booking_invitees_select_admin on public.booking_invitees;
create policy booking_invitees_select_admin on public.booking_invitees
  for select to authenticated using (public.is_admin());

grant select, insert, update, delete on public.booking_invitees to authenticated;
revoke all on public.booking_invitees from anon;
