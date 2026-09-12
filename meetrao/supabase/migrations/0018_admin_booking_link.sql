-- ─────────────────────────────────────────────────────────────────────────────
-- 0018 · An admin can change or retire somebody's booking link
--
-- meetrao.com/<username> is the one piece of a host's account that is public,
-- unique across the whole product, and first-come-first-served. That makes it
-- the one piece an operator eventually has to intervene in: a name squatted on
-- a trademark, a name that impersonates someone, a name a host has locked
-- themselves out of. Until now the only lever was removing the account
-- outright, which is not a proportionate answer to a bad URL.
--
-- Two operations, and both have to be atomic, which is why they are functions
-- rather than a pair of statements in the app:
--
--   admin_set_username      move a host to a different link, optionally
--                           retiring the old one so nobody else can take it.
--   admin_release_username  take the current link away and park the host on a
--                           neutral placeholder.
--
-- `profiles.username` is NOT NULL, so there is no such thing as an account
-- with no booking link — "removing" a link necessarily means replacing it. The
-- placeholder is seeded from 'host', never from the email address, because the
-- replacement is public and an email address is not.
--
-- Neither function turns the booking page off. That switch already exists and
-- is called suspension; conflating the two would make a rename silently
-- disable an account.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.admin_set_username(
  p_user_id    uuid,
  p_username   text,
  p_retire_old boolean default false,
  -- Assign a name that is currently held back. Only an admin can reach this
  -- function at all, and restoring a retired name to its rightful owner is a
  -- real request — but it has to be asked for, not stumbled into.
  p_force      boolean default false
)
returns table (old_username text, new_username text)
language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare v_old text; v_new text;
begin
  v_new := lower(btrim(coalesce(p_username, '')));

  -- FOR UPDATE: two admins editing the same host would otherwise both read the
  -- old name and both try to retire it.
  select p.username into v_old from public.profiles p where p.id = p_user_id for update;
  if v_old is null then
    raise exception 'no such account' using errcode = 'P0002';
  end if;

  -- The same expression as the profiles_username_format constraint. Restating
  -- it buys a sentence a person can read instead of a constraint violation,
  -- and the constraint still has the last word if the two ever drift.
  if v_new !~ '^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$' then
    raise exception 'that is not a valid booking link' using errcode = '22023';
  end if;

  if lower(v_old) = v_new then
    old_username := v_old;
    new_username := v_old;
    return next;
    return;
  end if;

  -- Advisory, not authoritative: the unique index on lower(username) is what
  -- actually prevents a collision, and it wins a race this check would lose.
  -- This exists so the common case reads as a sentence rather than a 23505.
  if exists (select 1 from public.profiles p where lower(p.username) = v_new and p.id <> p_user_id) then
    raise exception 'that booking link belongs to another account' using errcode = '23505';
  end if;

  if exists (select 1 from public.reserved_usernames r where r.username = v_new) then
    if not p_force then
      raise exception 'that booking link is held back' using errcode = '23505';
    end if;
    -- The reject_reserved_username trigger fires on this update regardless of
    -- SECURITY DEFINER, so the reservation has to go first.
    delete from public.reserved_usernames r where r.username = v_new;
  end if;

  update public.profiles set username = v_new where id = p_user_id;

  if p_retire_old then
    insert into public.reserved_usernames (username, reason)
    values (lower(v_old), 'changed by an admin')
    on conflict (username) do nothing;
  end if;

  old_username := v_old;
  new_username := v_new;
  return next;
end;
$$;

-- Retiring is the point here, not renaming: the old name is always held back,
-- or the host could simply claim it again from Settings → Profile a minute
-- later and the intervention would have achieved nothing.
create or replace function public.admin_release_username(p_user_id uuid)
returns table (old_username text, new_username text)
language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
begin
  return query
    select * from public.admin_set_username(p_user_id, public.generate_username('host'), true, false);
end;
$$;

-- ── grants ──────────────────────────────────────────────────────────────────
-- Supabase grants EXECUTE on every function in `public` to anon and
-- authenticated directly, and revoking from PUBLIC does not touch a direct
-- grant — 0003 exists because three SECURITY DEFINER functions were left
-- reachable that way. Both of these rename any account in the product, so they
-- are service-role only; `requireAdmin()` in the server action is the gate.
revoke all on function public.admin_set_username(uuid, text, boolean, boolean)
  from public, anon, authenticated;
revoke all on function public.admin_release_username(uuid)
  from public, anon, authenticated;

grant execute on function public.admin_set_username(uuid, text, boolean, boolean) to service_role;
grant execute on function public.admin_release_username(uuid) to service_role;
