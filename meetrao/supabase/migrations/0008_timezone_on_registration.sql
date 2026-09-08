-- Set the host's timezone from their own device at registration.
--
-- profiles.timezone defaulted to 'UTC' and stayed there until someone reached
-- onboarding step 4 and picked one. Every booking page, every email and every
-- slot the engine offers reads it, so an account that never got that far
-- offered its hours in the wrong zone.
--
-- Two things are needed. The trigger has to accept a zone the client detected
-- at sign-up, and there has to be a way to tell "nobody has chosen one yet"
-- from "chose UTC deliberately" — the column is NOT NULL with a default, so
-- the value alone cannot say.

-- true while the zone is ours to set. The app clears it the moment a host
-- picks one themselves, in onboarding or in Settings, and never sets it again.
alter table public.profiles
  add column if not exists timezone_auto boolean not null default true;

comment on column public.profiles.timezone_auto is
  'Timezone was detected, not chosen. Cleared when the host picks one; see src/lib/actions/settings.ts.';

-- Existing accounts have all been through onboarding or explicitly saved, so
-- their zone is theirs. Only the ones still sitting on the default stay open to
-- detection.
update public.profiles set timezone_auto = false where timezone <> 'UTC';

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare
  display_name text;
  bootstrap    boolean;
  detected     text;
begin
  display_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    ''
  );

  bootstrap := exists (
    select 1
    from public.bootstrap_admins b
    where b.email = lower(btrim(coalesce(new.email, '')))
  );

  -- Whatever the browser reported at sign-up, checked against the zones this
  -- server actually knows. The value arrives from a client, so it is never
  -- trusted straight into a column the slot engine reads.
  detected := nullif(btrim(new.raw_user_meta_data ->> 'timezone'), '');
  if detected is null or not exists (select 1 from pg_timezone_names z where z.name = detected) then
    detected := 'UTC';
  end if;

  insert into public.profiles (id, username, full_name, email, is_admin, timezone)
  values (
    new.id,
    public.generate_username(coalesce(nullif(display_name, ''), new.email)),
    display_name,
    coalesce(new.email, ''),
    bootstrap,
    detected
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
