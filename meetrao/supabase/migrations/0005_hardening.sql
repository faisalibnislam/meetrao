-- Meetrao — hardening pass over 0001–0004, driven by the Supabase security
-- advisor.
--
-- Supabase's default privileges grant EXECUTE on new public-schema functions
-- to `anon` and `authenticated`. That is wrong for every function here except
-- the four that deliberately make up the public booking API, so the rest are
-- revoked explicitly. `revoke ... from public` alone does not do it, because
-- these roles hold grants of their own rather than inheriting PUBLIC's.

-- ── Trigger functions are not an API ───────────────────────────────────────
-- Calling one over PostgREST would error anyway, but it should not be
-- reachable at all.

revoke all on function public.handle_new_user()         from public, anon, authenticated;
revoke all on function public.log_meeting_type_created() from public, anon, authenticated;
revoke all on function public.log_booking_activity()     from public, anon, authenticated;
revoke all on function public.log_calendar_connected()   from public, anon, authenticated;
revoke all on function public.touch_updated_at()         from public, anon, authenticated;

-- ── Internal helpers ───────────────────────────────────────────────────────

-- SECURITY DEFINER, takes an arbitrary user id, and writes. An anonymous
-- caller must never reach this.
revoke all on function public.seed_default_availability(uuid) from public, anon, authenticated;
grant execute on function public.seed_default_availability(uuid) to service_role;

revoke all on function public.generate_username(text) from public, anon, authenticated;
grant execute on function public.generate_username(text) to service_role;

-- is_admin() reads the caller's own row and returns false when signed out, so
-- it is harmless — but there is no reason for anon to call it.
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

-- ── Pin search_path on the one function that was missing it ────────────────

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.touch_updated_at() from public, anon, authenticated;

-- ── Keep extensions out of the public schema ───────────────────────────────

create schema if not exists extensions;
alter extension btree_gist set schema extensions;

-- NOTE: get_public_host, get_public_meeting_types, get_public_availability and
-- get_busy_intervals stay executable by `anon`. That is the whole point of
-- them — they are the public booking surface, and each returns a deliberately
-- narrow column set (get_busy_intervals returns times only, never guest PII).
-- The advisor will continue to flag them; that flag is expected.
