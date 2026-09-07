-- Meetrao — admin account removal
--
-- Suspension (0007) is reversible and stays exactly as it is. This is the
-- other thing: a hard delete, and the two must never be confused for one
-- another in the UI or here.
--
-- DECIDED: no data export is offered first, and removal is immediate.
-- DECIDED: the freed username stays reserved. A booking link is public and
-- shareable; letting a stranger claim a departed host's /username would point
-- their old links at someone else.

-- ── Reserved usernames ─────────────────────────────────────────────────────

create table public.reserved_usernames (
  username    text primary key,
  reason      text not null default 'account removed',
  reserved_at timestamptz not null default now(),

  constraint reserved_usernames_lowercase check (username = lower(username))
);

alter table public.reserved_usernames enable row level security;
revoke all on public.reserved_usernames from anon, authenticated;
-- No policies and no grants: service role only. Nothing in the app needs to
-- read this list; it is enforced by the trigger below, inside the database.

-- ── Enforcement ────────────────────────────────────────────────────────────
-- A trigger rather than a check in application code. The username can be set
-- from signup, from the profile form and from generate_username, and a rule
-- this load-bearing should not depend on every one of them remembering.

create or replace function public.reject_reserved_username()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (
    select 1 from public.reserved_usernames r
    where r.username = lower(new.username)
  ) then
    raise exception 'username % is reserved', new.username
      using errcode = '23505';
  end if;
  return new;
end;
$$;

create trigger profiles_reject_reserved_username
  before insert or update of username on public.profiles
  for each row execute function public.reject_reserved_username();

-- generate_username must skip reserved names too, or signup would loop into
-- the trigger's exception instead of picking the next free suffix.
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

  if base !~ '^[a-z0-9]' then
    base := 'h' || base;
  end if;
  base := btrim(base, '-');

  candidate := base;
  loop
    exit when not exists (
      select 1 from public.profiles p where lower(p.username) = candidate
    ) and not exists (
      select 1 from public.reserved_usernames r where r.username = candidate
    );
    n := n + 1;
    candidate := base || n::text;
  end loop;

  return candidate;
end;
$$;

-- ── Removal ────────────────────────────────────────────────────────────────

/*
 * Delete an account and everything it owns, in ONE transaction.
 *
 * A function body is a single transaction, which is the whole reason this is
 * here rather than in the server action: auth.admin.deleteUser() is an HTTP
 * call, so reserving the username and deleting the user could not be atomic
 * across it. Half-applied — a reservation with the account still live, or an
 * account gone with its link claimable — is worse than either outcome.
 *
 * The cascade is the schema's own: profiles references auth.users ON DELETE
 * CASCADE, and meeting_types, availability_rules, bookings and
 * calendar_connections all reference profiles ON DELETE CASCADE. Deleting the
 * auth row therefore takes the Google tokens with it.
 */
create or replace function public.admin_remove_account(p_user_id uuid)
returns table (removed_username text, removed_email text)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_username text;
  v_email    text;
begin
  select p.username, p.email into v_username, v_email
  from public.profiles p
  where p.id = p_user_id;

  if v_username is null then
    raise exception 'no such account';
  end if;

  insert into public.reserved_usernames (username, reason)
  values (lower(v_username), 'account removed')
  on conflict (username) do nothing;

  -- Everything else goes with it, by cascade.
  delete from auth.users where id = p_user_id;

  removed_username := v_username;
  removed_email := v_email;
  return next;
end;
$$;

revoke all on function public.admin_remove_account(uuid) from public, anon, authenticated;
grant execute on function public.admin_remove_account(uuid) to service_role;
