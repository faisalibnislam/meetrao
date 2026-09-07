-- Meetrao — notification preferences
--
-- Five switches on Settings › Notifications, defaulting to the state the design
-- specifies: the three booking notifications on, the digest and the marketing
-- email off.
--
-- SCOPE: these gate HOST email only. Guest-facing mail — booking confirmations,
-- cancellations, email verification and password resets — is transactional and
-- must never be suppressed by them. Nothing here reads these columns yet;
-- sending is a separate change.

alter table public.profiles
  add column notify_new_booking       boolean not null default true,
  add column notify_booking_changed   boolean not null default true,
  add column notify_booking_cancelled boolean not null default true,
  add column notify_daily_agenda      boolean not null default false,
  add column notify_product_news      boolean not null default false;

-- profiles is granted UPDATE column by column (migration 0003), so a new column
-- is not writable by its owner until it is named here. Without this the panel
-- saves nothing and PostgREST reports permission denied.
grant update (
  notify_new_booking,
  notify_booking_changed,
  notify_booking_cancelled,
  notify_daily_agenda,
  notify_product_news
) on public.profiles to authenticated;
