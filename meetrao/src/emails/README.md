# Emails

The six send-ready templates from the design handoff, copied in **as-is** —
table-based, every style inlined, under 10KB each. They are not rebuilt in JSX
and not passed through a mail-component library: a div-based rewrite breaks
Outlook.

The only change from `design_handoff_meetrao/emails/` is that each worked-example
value has become a `{{merge_field}}` token, following the field list documented
per template in `Meetrao Emails.dc.html`. Structure, styles and copy are
untouched.

| File | Trigger | To | Honours prefs? |
| --- | --- | --- | --- |
| `verify-email.html` | Email sign-up | New signup | No — transactional |
| `welcome.html` | Email confirmed, or Google sign-up | Host | See note below |
| `booking-new-host.html` | Guest confirms a slot | Host | Yes — "New booking" |
| `booking-new-guest.html` | Same event | Guest | No — transactional |
| `booking-changed.html` | Time/duration/meeting changed | Both | Host: "Booking changed" |
| `booking-cancelled.html` | Cancelled by either party | Both | Host: "Booking cancelled" |

## Who sends what

**`verify-email.html` is sent by Supabase, not by us.** The verification gate is
built on Supabase Auth's own `email_confirmed_at`, so Supabase issues the token
and sends the mail. To use this design rather than Supabase's default:

> Supabase dashboard → Authentication → Emails → **Confirm signup** → paste
> `supabase/confirm-signup.html`.

That file is this template with `{{ .ConfirmationURL }}` in place of the link and
the footer values filled in — Supabase's template language, not ours. Keep the
two in step if the design changes.

The other five go out through Resend from `src/lib/email/send.ts`.

## Rules that are enforced in code

- **Every merge value is HTML-escaped.** A guest controls their own name and the
  note field; unescaped, a note can close a table cell and rewrite the email.
- **A template left with an unfilled `{{field}}` throws** rather than shipping
  the token to a real inbox.
- **Guest senders take no preference parameter at all**, so a guest confirmation
  can never be switched off by anyone's settings.
- **A preference that cannot be read means send.** A database blip should not
  silently mute a notification nobody turned off.
- **One idempotency key per booking event and recipient**, so a retry sends once.

## Still open

- **`booking-changed.html` has no trigger.** There is no reschedule flow — guests
  cancel and rebook. `sendRescheduled()` exists and is unwired, so building
  reschedule later is a matter of calling it.
- **The logo is drawn in type** (a green rounded square plus the wordmark)
  because a repo-relative asset will not resolve for a recipient. Swap in a
  hosted https PNG; the cell is sized for a 22px square.
- **`EMAIL_POSTAL_ADDRESS` is empty by default** and falls back to "Meetrao".
  A real postal address is required by anti-spam law before launch.
- **Welcome and preferences.** The design's table marks the welcome email as
  honouring preferences, but none of the five switches names it, and gating it
  on "Product news" (off by default) would silence a message the host's own
  action just triggered. It is currently sent as account mail with the
  preferences and unsubscribe footer intact. Worth a decision.
