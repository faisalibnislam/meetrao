-- The signed-in caller's own profile, in one round trip that needs no id.
--
-- Every authenticated screen reads the profile, and it used to cost two
-- sequential round trips to do it: getUser() to learn the id, and only then
-- `select * from profiles where id = <that id>`. Two hops to a database on
-- another continent is most of what a tab click costs.
--
-- The id was the only reason for the ordering, and Postgres already knows it.
-- Filtering by auth.uid() in here means the profile read no longer depends on
-- anything the app has to fetch first, so it can run *alongside* getUser()
-- instead of after it.
--
-- Why not simply select with no filter and let RLS do it: `profiles` carries a
-- second SELECT policy, profiles_select_admin, and policies are OR'd — so an
-- unfiltered read returns every row in the table to an admin, and .maybeSingle()
-- on that is an error rather than a profile. The where clause here is what
-- makes the result exactly one row for everybody.
--
-- security invoker (the default for SQL functions, stated because it matters):
-- RLS on profiles still applies to the caller, so this can only ever hand back
-- a row that caller was already allowed to read. It is a shortcut for the app,
-- not a way around the policies.
create or replace function public.current_profile()
returns public.profiles
language sql
stable
security invoker
set search_path = public
as $$
  select p.*
  from public.profiles p
  where p.id = (select auth.uid());
$$;

comment on function public.current_profile() is
  'The caller''s own profile row, or null when signed out. Filtered by auth.uid() so the caller does not need to know their own id first.';

revoke all on function public.current_profile() from public, anon;
grant execute on function public.current_profile() to authenticated;
