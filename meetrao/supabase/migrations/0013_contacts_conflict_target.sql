-- The contacts upsert could never have worked.
--
-- 0012 gave contacts a UNIQUE INDEX on (user_id, lower(email)). That enforces
-- the rule correctly, but it is a FUNCTIONAL index, and neither PostgREST's
-- `on_conflict=user_id,email` nor plain `on conflict (user_id, email)` can name
-- one — Postgres answers 42P10, "there is no unique or exclusion constraint
-- matching the ON CONFLICT specification". Adding a contact by hand and
-- importing a CSV both go through that upsert, so both would have errored on
-- the first duplicate. Verified against the live database before fixing.
--
-- The fix is to make the column itself carry the invariant. Every write already
-- lowercases, so a CHECK makes that explicit and a plain unique constraint is
-- then exactly as strong as the functional index was — and it can be named.

-- Nothing should violate this, since the trigger and the backfill both
-- lowercase, but normalise before constraining rather than after failing.
update public.contacts
set email = lower(btrim(email))
where email <> lower(btrim(email));

alter table public.contacts
  drop constraint if exists contacts_email_lowercase;
alter table public.contacts
  add constraint contacts_email_lowercase check (email = lower(email));

alter table public.contacts
  drop constraint if exists contacts_user_email_key;
alter table public.contacts
  add constraint contacts_user_email_key unique (user_id, email);

drop index if exists public.contacts_user_email_unique;

-- The trigger named the functional index too, so it has to move with it.
create or replace function public.upsert_contact(p_user_id uuid, p_name text, p_email text)
returns void language sql security definer set search_path to 'public', 'pg_temp' as $$
  insert into public.contacts (user_id, name, email, source)
  values (p_user_id, coalesce(btrim(p_name), ''), lower(btrim(p_email)), 'booking')
  on conflict (user_id, email) do update
    set name = case
                 when btrim(public.contacts.name) = '' then excluded.name
                 else public.contacts.name
               end,
        updated_at = now();
$$;

revoke all on function public.upsert_contact(uuid, text, text) from public, anon, authenticated;
