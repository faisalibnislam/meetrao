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
| `verify-email.html` | Email sign-up | New signup | No — transactional (NOT WIRED, see below) |
| `welcome.html` | Email confirmed, or Google sign-up | Host | See note below |
| `booking-new-host.html` | Guest confirms a slot | Host | Yes — "New booking" |
| `booking-new-guest.html` | Same event | Guest | No — transactional |
| `booking-changed.html` | Time/duration/meeting changed | Both | Host: "Booking changed" |
| `booking-cancelled.html` | Cancelled by either party | Both | Host: "Booking cancelled" |

## Who sends what

**Four of the five wired templates go out through Resend from
`src/lib/email/send.ts`**, which renders them, escapes every merge value and
applies the preference rules below.

**The verification and reset emails do not.** Convex Auth owns those two flows
and sends them itself, via the `Resend` providers configured in
`convex/auth.ts`. With no `sendVerificationRequest` supplied, that is Auth.js's
own generic template — so those two messages are currently unbranded and carry
no postal address. `verify-email.html` is the design for the first of them and
is **not wired to anything**; see "Still open".

Note also that Convex Auth verifies with a **code**, not a link, which the
`/reset` page reads from `?email=&code=`. `verify-email.html` is written around
`{{verify_url}}` and will need that link built for it, or the copy changed to
present a code.

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

- **The verification and reset emails are unbranded.** They are Auth.js
  defaults, sent by Convex Auth. Fixing it means passing
  `sendVerificationRequest` to the two `Resend(...)` providers in
  `convex/auth.ts` and rendering the template there — Convex functions cannot
  import from `src/`, so the HTML has to be copied into `convex/` or read from
  storage. Until then these are the only two messages the product sends that do
  not look like the product, and the only two with no postal address in the
  footer. **This is the largest outstanding item on this list.**
- **`booking-changed.html` has no trigger.** There is no reschedule flow — guests
  cancel and rebook. `sendRescheduled()` exists and is unwired, so building
  reschedule later is a matter of calling it.
- **The logo is drawn in type** (a green rounded square plus the wordmark)
  because a repo-relative asset will not resolve for a recipient. Swap in a
  hosted https PNG; the cell is sized for a 22px square.
- **`EMAIL_POSTAL_ADDRESS` is empty by default** and falls back to "Meetrao",
  which does not satisfy anti-spam law. It must be a full physical address —
  street, city, state, postcode — and it prints in the footer of every template.
- **Welcome and preferences.** The design's table marks the welcome email as
  honouring preferences, but none of the five switches names it, and gating it
  on "Product news" (off by default) would silence a message the host's own
  action just triggered. It is currently sent as account mail with the
  preferences and unsubscribe footer intact. Worth a decision.
