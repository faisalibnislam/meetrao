-- Meetrao — row level security
--
-- Posture: every table is deny-by-default. Authenticated hosts reach only
-- their own rows; admins get read access across the platform. The anonymous
-- role gets NO direct table access at all — the public booking surface is
-- served exclusively through the SECURITY DEFINER functions in 0004, which
-- return a deliberately narrow column set. Google tokens live in
-- calendar_connections, which has no policies whatsoever and is therefore
-- reachable only by the service role.

alter table public.profiles             enable row level security;
alter table public.calendar_connections enable row level security;
alter table public.meeting_types        enable row level security;
alter table public.availability_rules   enable row level security;
alter table public.bookings             enable row level security;
alter table public.admin_activity       enable row level security;

-- PostgREST exposes whatever the role is granted. Start from nothing.
revoke all on public.profiles             from anon, authenticated;
revoke all on public.calendar_connections from anon, authenticated;
revoke all on public.meeting_types        from anon, authenticated;
revoke all on public.availability_rules   from anon, authenticated;
revoke all on public.bookings             from anon, authenticated;
revoke all on public.admin_activity       from anon, authenticated;

-- ── profiles ───────────────────────────────────────────────────────────────

grant select on public.profiles to authenticated;
grant update (
  full_name, job_title, email, username, timezone, avatar_url,
  default_duration_minutes, default_notice_minutes, onboarding_completed_at
) on public.profiles to authenticated;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy profiles_select_admin on public.profiles
  for select to authenticated
  using (public.is_admin());

-- Admins may suspend/reactivate, which the app models as a ban on auth.users;
-- profile edits by admins are out of scope (handoff note #5), so no admin
-- UPDATE policy is granted here.

-- ── meeting_types ──────────────────────────────────────────────────────────

grant select, insert, update, delete on public.meeting_types to authenticated;

create policy meeting_types_own on public.meeting_types
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy meeting_types_select_admin on public.meeting_types
  for select to authenticated
  using (public.is_admin());

-- ── availability_rules ─────────────────────────────────────────────────────

grant select, insert, update, delete on public.availability_rules to authenticated;

create policy availability_own on public.availability_rules
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy availability_select_admin on public.availability_rules
  for select to authenticated
  using (public.is_admin());

-- ── bookings ───────────────────────────────────────────────────────────────
-- Hosts read their own and may cancel them. Creation always goes through the
-- server route (service role) so the slot can be re-validated inside the same
-- transaction as the insert; there is intentionally no client INSERT grant.

grant select on public.bookings to authenticated;
grant update (status, cancelled_at, cancelled_by) on public.bookings to authenticated;

create policy bookings_select_own on public.bookings
  for select to authenticated
  using (host_id = (select auth.uid()));

create policy bookings_update_own on public.bookings
  for update to authenticated
  using (host_id = (select auth.uid()))
  with check (host_id = (select auth.uid()));

create policy bookings_select_admin on public.bookings
  for select to authenticated
  using (public.is_admin());

-- ── admin_activity ─────────────────────────────────────────────────────────

grant select on public.admin_activity to authenticated;

create policy admin_activity_select_admin on public.admin_activity
  for select to authenticated
  using (public.is_admin());

-- ── calendar_connections ───────────────────────────────────────────────────
-- No grants, no policies. Service role only. This is intentional: OAuth
-- refresh tokens must never be reachable from a browser session.
