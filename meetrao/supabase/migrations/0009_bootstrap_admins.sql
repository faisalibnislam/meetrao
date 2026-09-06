-- Meetrao — bootstrap admins
--
-- The first admin is a chicken-and-egg problem: `is_admin` is deliberately not
-- settable from the app (there is no UI path to privilege escalation), so a new
-- deployment has nobody who can reach /admin, and the only way in is hand-written
-- SQL after the fact — which only works once the account already exists.
--
-- This allowlist closes that gap. An address listed here becomes an admin the
-- moment it signs up, whether that is email/password or "Sign in with Google";
-- handle_new_user consults it while building the profile.
--
-- The table has NO grants and NO policies, so it is reachable only by the
-- service role. That matters: it is effectively a list of who may become an
-- administrator, and platform_settings — the obvious place to put it — is
-- readable by every signed-in user.

create table public.bootstrap_admins (
  email      text primary key,
  note       text not null default '',
  created_at timestamptz not null default now(),
  -- Stored lowercased so the lookup can be a plain equality test. Email
  -- local-parts are technically case-sensitive; no real provider treats them
  -- that way, and GoTrue itself lowercases on signup.
  constraint bootstrap_admins_email_lowercase check (email = lower(email))
);

alter table public.bootstrap_admins enable row level security;
revoke all on public.bootstrap_admins from anon, authenticated;

-- ── handle_new_user, now admin-aware ───────────────────────────────────────
-- Unchanged from 0002 except for the is_admin lookup. Restated in full because
-- CREATE OR REPLACE FUNCTION has no partial form.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  display_name text;
  bootstrap    boolean;
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

  insert into public.profiles (id, username, full_name, email, is_admin)
  values (
    new.id,
    public.generate_username(coalesce(nullif(display_name, ''), new.email)),
    display_name,
    coalesce(new.email, ''),
    bootstrap
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

-- ── This deployment's bootstrap admin ──────────────────────────────────────
-- Change or remove this row for your own deployment; the mechanism above is
-- the reusable part.

insert into public.bootstrap_admins (email, note)
values ('faisalibnislam@gmail.com', 'Owner')
on conflict (email) do nothing;

-- Covers the case where the account was created before this migration ran.
update public.profiles p
set is_admin = true
from public.bootstrap_admins b
where lower(p.email) = b.email
  and not p.is_admin;
