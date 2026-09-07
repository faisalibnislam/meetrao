-- Meetrao — guest RSVP, and calendar connections that need re-consent
--
-- The guest has been added to the Google event as an attendee since the
-- calendar integration was built, so this migration adds no scope: it records
-- what Google reports back.
--
-- DECIDED (handoff open question 3): a guest declining in Google notifies the
-- host and does NOT cancel the Meetrao booking. A decline in a calendar client
-- is not a cancellation — the host may still want to hold the slot, and the
-- product's own cancel flow is the only thing that frees it.

alter table public.bookings
  -- Google's attendee responseStatus: needsAction | accepted | declined |
  -- tentative. Null until the event has been read back at least once.
  add column guest_rsvp text,
  add column guest_rsvp_synced_at timestamptz,
  -- Set when the host has been told about a decline, so they are told once.
  add column guest_rsvp_notified_at timestamptz,

  add constraint bookings_guest_rsvp_valid check (
    guest_rsvp is null
    or guest_rsvp in ('needsAction', 'accepted', 'declined', 'tentative')
  );

-- Only the server writes these (service role, which bypasses RLS), so the
-- column-by-column UPDATE grant on bookings deliberately does NOT name them:
-- a host must not be able to rewrite their guest's RSVP. Reads are covered by
-- the existing table-wide SELECT grant.

-- ── Connections that need re-consent ────────────────────────────────────────
-- Google revokes a grant when the host removes it in their account settings,
-- and a token can be rejected for a scope the app no longer has. Both surface
-- as a 401/403 on the next call. Recording it turns a silent write failure
-- into something the dashboard can ask the host to fix.

alter table public.calendar_connections
  add column needs_reconnect boolean not null default false,
  add column last_error text,
  add column last_error_at timestamptz;
