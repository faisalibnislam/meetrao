-- ─────────────────────────────────────────────────────────────────────────────
-- 0016 · Site analytics
--
-- Who visits meetrao.com, roughly where from, and on what. Enough to answer
-- "is anybody reading this" and "does the booking page work on phones", and
-- deliberately not enough to follow a person around.
--
-- What is NOT here, by design:
--
--   · no IP address. The address is used to derive a hash and is then gone; it
--     is never a column, so it cannot be selected, exported or subpoenaed out
--     of this table.
--   · no cookie, no localStorage, no device identifier. Nothing is written to
--     the visitor's machine, which is why this half needs no consent banner.
--   · no user id. A signed-in host's own page views are not recorded at all
--     (see components/analytics/beacon.tsx § SKIP), and nothing joins to
--     profiles, so a row here cannot be tied to an account.
--
-- `visitor_hash` is sha256(salt · UTC date · ip · user-agent), truncated. The
-- date is inside the hash on purpose: the same visitor is one row-group today
-- and an unrelated one tomorrow, so "unique visitors" is answerable for a day
-- and unanswerable for a month. That is the trade we want — a daily figure is
-- what a solo operator acts on, and a stable pseudonym is what turns a counter
-- into tracking.
--
-- Separate from `booking_page_views` (0002), which is host-scoped telemetry
-- feeding one dashboard card and measures link-opened → booked. This is the
-- site, for the operator.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.site_visits (
  id            bigint generated always as identity primary key,
  visited_at    timestamptz not null default now(),

  -- sha256(salt · UTC date · ip · ua), first 32 hex chars. Rotates daily.
  visitor_hash  text not null,

  -- Pathname only, query string dropped before it ever reaches here: a booking
  -- link's query can carry a guest's name.
  path          text not null,

  -- Host of the referrer, never the full URL — the path of the page someone
  -- arrived from is their business, and "google.com" is the whole answer to
  -- "where from". Null for a direct visit.
  referrer_host text,

  -- From Vercel's edge geo headers (x-vercel-ip-country / -country-region /
  -- -city). Country is ISO-3166-1 alpha-2. Null when the header is absent,
  -- which is every local request.
  country       text,
  region        text,
  city          text,

  -- 'phone' | 'tablet' | 'desktop' | 'unknown'. A class, not a model.
  device        text not null default 'unknown',
  os            text,
  browser       text,

  -- Crawlers are kept rather than dropped: a table that silently discards them
  -- cannot answer "why did visits triple". Every aggregate below excludes them.
  is_bot        boolean not null default false
);

-- Every query is "the last N days", so time leads.
create index if not exists site_visits_visited_idx on public.site_visits (visited_at desc);
-- Unique-visitor counts group by hash within a window.
create index if not exists site_visits_hash_idx on public.site_visits (visitor_hash);

alter table public.site_visits enable row level security;

-- Admin reads only. There is deliberately NO insert policy and no grant to
-- anon or authenticated: rows arrive through /api/analytics/collect using the
-- service role, because the country and the hash are derived server-side from
-- headers. A browser that could insert here could invent a country.
drop policy if exists site_visits_select_admin on public.site_visits;
create policy site_visits_select_admin on public.site_visits
  for select to authenticated using (public.is_admin());

comment on table public.site_visits is
  'Cookie-free page views for the admin analytics screen. No IP, no user id, no stable visitor identifier — visitor_hash rotates every UTC day. Pruned to 400 days by analytics_prune().';

-- ── aggregates ──────────────────────────────────────────────────────────────
-- All three are `security invoker`, so RLS decides: an admin sees the numbers,
-- any other signed-in caller sees zeroes and empty rows rather than an error.
-- The policy is the only access rule, stated once, in one place.

-- Visits per day, with the gaps filled in. A chart that plots only the days
-- that have rows draws a straight line through a week of silence and calls it
-- traffic; these come back as zeroes instead.
create or replace function public.analytics_daily(p_days integer default 30)
returns table (day date, visits bigint, visitors bigint)
language sql
stable
security invoker
set search_path = public
as $$
  with span as (
    select greatest(1, least(coalesce(p_days, 30), 365)) as n
  ),
  days as (
    select d::date as day
    from span,
         generate_series(
           (now() at time zone 'utc')::date - (span.n - 1),
           (now() at time zone 'utc')::date,
           interval '1 day'
         ) d
  )
  select days.day,
         count(v.id)::bigint,
         count(distinct v.visitor_hash)::bigint
  from days
  left join public.site_visits v
    on v.is_bot = false
   and (v.visited_at at time zone 'utc')::date = days.day
  group by days.day
  order by days.day;
$$;

comment on function public.analytics_daily(integer) is
  'Visits and unique visitors per UTC day for the last N days (1-365), zero-filled. Bots excluded.';

-- The headline numbers, each beside the same span immediately before it, so the
-- screen can say "up from" without a second round trip. A comparison the client
-- computes from two separate calls is two chances to compare different windows.
create or replace function public.analytics_overview(p_days integer default 30)
returns table (
  visits          bigint,
  visitors        bigint,
  countries       bigint,
  bots            bigint,
  visits_prev     bigint,
  visitors_prev   bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with span as (
    select greatest(1, least(coalesce(p_days, 30), 365)) as n
  ),
  bounds as (
    select now() - make_interval(days => span.n)     as this_from,
           now() - make_interval(days => span.n * 2) as prev_from,
           now() - make_interval(days => span.n)     as prev_to
    from span
  )
  select
    count(*) filter (where not v.is_bot and v.visited_at > b.this_from)::bigint,
    count(distinct v.visitor_hash) filter (where not v.is_bot and v.visited_at > b.this_from)::bigint,
    count(distinct v.country) filter (where not v.is_bot and v.visited_at > b.this_from)::bigint,
    count(*) filter (where v.is_bot and v.visited_at > b.this_from)::bigint,
    count(*) filter (where not v.is_bot and v.visited_at > b.prev_from and v.visited_at <= b.prev_to)::bigint,
    count(distinct v.visitor_hash) filter (where not v.is_bot and v.visited_at > b.prev_from and v.visited_at <= b.prev_to)::bigint
  from bounds b
  left join public.site_visits v on v.visited_at > b.prev_from;
$$;

comment on function public.analytics_overview(integer) is
  'Headline counts for the last N days plus the same span immediately before it, for a change figure.';

-- The "top something" lists: countries, pages, referrers, devices.
--
-- One function over a fixed CASE rather than dynamic SQL over a column name —
-- the dimension can only ever be one of six strings, and an unknown one is an
-- error, not a query that groups everything under null and looks plausible.
create or replace function public.analytics_top(
  p_dimension text,
  p_days      integer default 30,
  p_limit     integer default 8
)
returns table (label text, visits bigint, visitors bigint)
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  if p_dimension is null or p_dimension not in ('country', 'region', 'path', 'referrer', 'device', 'os', 'browser') then
    raise exception 'unknown analytics dimension: %', coalesce(p_dimension, 'null')
      using errcode = 'MR400';
  end if;

  return query
  select coalesce(nullif(case p_dimension
             when 'country'  then v.country
             when 'region'   then v.region
             when 'path'     then v.path
             when 'referrer' then v.referrer_host
             when 'device'   then v.device
             when 'os'       then v.os
             when 'browser'  then v.browser
           end, ''), 'Unknown') as label,
         count(*)::bigint,
         count(distinct v.visitor_hash)::bigint
  from public.site_visits v
  where not v.is_bot
    and v.visited_at > now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)))
  group by 1
  order by 2 desc, 1 asc
  limit greatest(1, least(coalesce(p_limit, 8), 50));
end;
$$;

comment on function public.analytics_top(text, integer, integer) is
  'Top values of one dimension (country, region, path, referrer, device, os, browser) over the last N days. Bots excluded.';

-- ── retention ───────────────────────────────────────────────────────────────
-- The Privacy Policy states a retention period; this is what makes the
-- statement true. Called opportunistically from /api/analytics/collect rather
-- than on a schedule, because there is no scheduler on this plan and a table
-- that only grows while the policy says otherwise is the worse failure.
--
-- security definer: the caller is the collect route, which is not a person and
-- has no admin flag. Grant is to service_role alone.
create or replace function public.analytics_prune(p_keep_days integer default 400)
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_deleted integer;
begin
  delete from public.site_visits
  where visited_at < now() - make_interval(days => greatest(30, least(coalesce(p_keep_days, 400), 3650)));
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

comment on function public.analytics_prune(integer) is
  'Deletes site_visits older than p_keep_days (floor 30, default 400). Called from the collect route, not a cron.';

revoke all on function public.analytics_prune(integer) from public, anon, authenticated;

revoke all on function public.analytics_daily(integer) from public, anon;
revoke all on function public.analytics_overview(integer) from public, anon;
revoke all on function public.analytics_top(text, integer, integer) from public, anon;

grant execute on function public.analytics_daily(integer) to authenticated;
grant execute on function public.analytics_overview(integer) to authenticated;
grant execute on function public.analytics_top(text, integer, integer) to authenticated;
