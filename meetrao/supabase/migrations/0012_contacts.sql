-- Contacts.
--
-- A host accumulates the same handful of people across dozens of bookings and
-- has nowhere to see them. This gives them a list, and keeps it filled in
-- without anyone maintaining it.
--
-- Email is the identity, case-insensitively and per host. Two hosts who both
-- meet ada@example.com have two contacts; one host who meets her ten times has
-- one.
create table if not exists public.contacts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  name       text not null default '',
  email      text not null,
  phone      text not null default '',
  company    text not null default '',
  notes      text not null default '',
  -- Where the row came from. 'booking' rows were created by the triggers below;
  -- the distinction is what lets the screen offer "added by hand" as a filter.
  source     text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contacts_email_shape
    check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  constraint contacts_source_known check (source in ('manual', 'booking', 'import'))
);

create unique index if not exists contacts_user_email_unique
  on public.contacts (user_id, lower(email));

create index if not exists contacts_user_idx on public.contacts (user_id, created_at desc);

drop trigger if exists contacts_touch on public.contacts;
create trigger contacts_touch
  before update on public.contacts
  for each row execute function public.touch_updated_at();

alter table public.contacts enable row level security;

drop policy if exists contacts_own on public.contacts;
create policy contacts_own on public.contacts
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists contacts_select_admin on public.contacts;
create policy contacts_select_admin on public.contacts
  for select to authenticated using (public.is_admin());

grant select, insert, update, delete on public.contacts to authenticated;
revoke all on public.contacts from anon;

-- ── kept filled in by the database, not by the app ───────────────────────────
-- A trigger rather than application code because bookings arrive through three
-- different doors: create_booking (SECURITY DEFINER, called by anon), the host's
-- own scheduling action (service role), and booking_invitees for the extra
-- people on a host-scheduled meeting. Application code would have to remember
-- all three; a trigger cannot forget one.
--
-- A name is only ever filled in, never overwritten: a host who corrected
-- "ada@example.com" to "Ada Lovelace" should not have it reverted by the next
-- booking where she typed "ada".
create or replace function public.upsert_contact(p_user_id uuid, p_name text, p_email text)
returns void language sql security definer set search_path to 'public', 'pg_temp' as $$
  insert into public.contacts (user_id, name, email, source)
  values (p_user_id, coalesce(btrim(p_name), ''), lower(btrim(p_email)), 'booking')
  on conflict (user_id, lower(email)) do update
    set name = case
                 when btrim(public.contacts.name) = '' then excluded.name
                 else public.contacts.name
               end,
        updated_at = now();
$$;

revoke all on function public.upsert_contact(uuid, text, text) from public, anon, authenticated;

create or replace function public.contact_from_booking()
returns trigger language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
begin
  perform public.upsert_contact(new.host_id, new.guest_name, new.guest_email);
  return new;
end;
$$;

drop trigger if exists bookings_make_contact on public.bookings;
create trigger bookings_make_contact
  after insert on public.bookings
  for each row execute function public.contact_from_booking();

create or replace function public.contact_from_invitee()
returns trigger language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare v_host uuid;
begin
  select b.host_id into v_host from public.bookings b where b.id = new.booking_id;
  if v_host is not null then
    perform public.upsert_contact(v_host, new.name, new.email);
  end if;
  return new;
end;
$$;

drop trigger if exists booking_invitees_make_contact on public.booking_invitees;
create trigger booking_invitees_make_contact
  after insert on public.booking_invitees
  for each row execute function public.contact_from_invitee();

-- ── backfill ────────────────────────────────────────────────────────────────
-- Every booking that already exists, oldest first so the earliest name wins the
-- same way the trigger's "fill in, never overwrite" rule would have.
insert into public.contacts (user_id, name, email, source)
select distinct on (b.host_id, lower(b.guest_email))
       b.host_id, btrim(b.guest_name), lower(btrim(b.guest_email)), 'booking'
from public.bookings b
order by b.host_id, lower(b.guest_email), b.created_at
on conflict (user_id, lower(email)) do nothing;
