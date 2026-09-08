-- When the welcome email has been sent, so it is sent exactly once.
--
-- The design's trigger for welcome.html is "Email confirmed, or Google
-- sign-up". Email confirmation is naturally once — the token is single-use —
-- but /auth/callback runs on every Google sign-in, not only the first, so
-- something has to remember. Resend's idempotency key does not: its window is
-- hours, and a host signing in next week would be welcomed twice.
--
-- Claiming is a single UPDATE with `welcomed_at is null` in the WHERE, so two
-- concurrent callbacks cannot both win — one updates a row, the other updates
-- none and sends nothing.
--
-- Not in the `authenticated` UPDATE grant: a host clearing their own flag to
-- re-trigger mail is not a thing that should be possible from a browser.
alter table public.profiles add column if not exists welcomed_at timestamptz;

revoke update (welcomed_at) on public.profiles from anon, authenticated;

comment on column public.profiles.welcomed_at is
  'When welcome.html was sent. Claimed by src/lib/email/welcome-once.ts through the service role.';
