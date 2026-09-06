-- Meetrao — account suspension
--
-- The flag lives on `profiles` so admin screens can read and filter it under
-- normal RLS. It is only ever a mirror: the authoritative block is a ban on
-- auth.users, applied by the service role at the same time. Flipping the
-- column alone does not let anyone back in.

alter table public.profiles
  add column if not exists is_suspended boolean not null default false;

-- Admins may suspend and reactivate; that is the only profile field they can
-- write on someone else's row.
grant update (is_suspended) on public.profiles to authenticated;

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());
