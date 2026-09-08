-- Lock down three RPCs that anon could reach.
--
-- 0002 said "anon needs exactly the guest-facing doors, and nothing else" and
-- then revoked from the `public` role only. That was the wrong mechanism:
-- Supabase's default privileges grant EXECUTE to `anon` and `authenticated`
-- directly on every function created in the `public` schema, and revoking from
-- `public` does not touch a direct grant. Three SECURITY DEFINER functions were
-- consequently callable over /rest/v1/rpc by anyone with the publishable key.
--
-- Each is revoked from the roles that should never have had it, by name.

-- get_busy_intervals(user, from, to) returned any host's occupied calendar
-- blocks over an arbitrary window — past the booking window, past their
-- availability, for any user id. It is only ever called through the
-- service-role client in src/lib/data/public-booking.ts.
revoke execute on function public.get_busy_intervals(uuid, timestamptz, timestamptz)
  from anon, authenticated;

-- reject_reserved_username() is a trigger function. It has no meaning as an
-- RPC and no caller outside the trigger. PUBLIC holds EXECUTE on it by
-- Postgres default, which anon and authenticated inherit, so this one has to
-- be revoked from PUBLIC as well as by name.
revoke all on function public.reject_reserved_username() from public, anon, authenticated;

-- avg_reply_minutes(user, days) is the dashboard's own card. anon had no
-- business with it, and one signed-in host had no business reading another's.
revoke execute on function public.avg_reply_minutes(uuid, integer) from anon;

create or replace function public.avg_reply_minutes(p_user_id uuid, p_days integer default 30)
returns numeric
language sql stable security definer set search_path to 'public', 'pg_temp' as $$
  select avg(extract(epoch from (b.created_at - v.opened_at)) / 60.0)
  from public.bookings b
  join public.booking_page_views v on v.id = b.page_view_id
  where b.host_id = p_user_id
    and b.created_at > now() - make_interval(days => p_days)
    and b.created_at >= v.opened_at
    -- A signed-in caller may only ask about themselves. auth.uid() is null for
    -- the service role, which is trusted server code and stays unrestricted.
    and (auth.uid() is null or p_user_id = auth.uid());
$$;

-- create or replace resets grants to the defaults, so re-apply the intent.
revoke all on function public.avg_reply_minutes(uuid, integer) from public, anon;
grant execute on function public.avg_reply_minutes(uuid, integer) to authenticated, service_role;
