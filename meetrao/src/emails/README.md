# Emails

The six send-ready templates from the design handoff, copied in **as-is**,
table-based, every style inlined, under 10KB each. They are not rebuilt in JSX
and not passed through a mail-component library: a div-based rewrite breaks
Outlook.

The only change from `design_handoff_meetrao/emails/` is that each worked-example
value has become a `{{merge_field}}` token, following the field list documented
per template in `Meetrao Emails.dc.html`. Structure, styles and copy are
untouched.

| File | Trigger | To | Honours prefs? |
| --- | --- | --- | --- |
| `welcome.html` | Email confirmed, or Google sign-up | Host | See note below |
| `booking-new-host.html` | Guest confirms a slot | Host | Yes, "New booking" |
| `booking-new-guest.html` | Same event | Guest | No, transactional |
| `booking-changed.html` | Time/duration/meeting changed | Both | Host: "Booking changed" |
| `booking-cancelled.html` | Cancelled by either party | Both | Host: "Booking cancelled" |

## Who sends what

**The five templates in this directory go out through Resend from
`src/lib/email/send.ts`**, which renders them, escapes every merge value and
applies the preference rules below.

**The two auth emails, confirm your email, and reset your password, live in
`convex/lib/emails.ts` instead.** Convex Auth owns both flows and sends them
from inside a Convex action, and Convex functions cannot read from disk, so
`send.ts` cannot reach them. They are wired through `sendVerificationRequest`
on the two `Resend` providers in `convex/auth.ts`; without that override
Auth.js sends its own template, which is how both went out unbranded and with
no postal address between the auth cutover and the fix.

`verify-email.html` used to sit here as the design for the first of them, and
has been deleted rather than left beside the Convex copy, two copies of one
template is exactly the trap the old Supabase version fell into. The design
travelled into `convex/lib/emails.ts` unchanged apart from the footer; see
below.

Both are **transactional and carry no unsubscribe**. The handoff's footer has
one, pointing at `/settings/notifications`, an account the recipient is in the
middle of confirming or recovering. An unsubscribe that cannot work is worse
than none, and nobody may opt out of the email that lets them into their own
account. The postal address stays, because that is the part the law asks for.

Convex Auth verifies with a **code**, not a link. The emails carry it in the
URL: `/verify?email=&code=` (spent by `components/auth/verify-link.tsx`) and
`/reset?email=&code=` (read by the reset form). `src/lib/email/convex-templates.test.ts`
covers both.

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

- **`EMAIL_POSTAL_ADDRESS` has to be set in two places.** `src/lib/env.ts`
  defaults it for the five templates here; the two in `convex/` read it from
  the Convex deployment's own environment and **throw if it is unset**, rather
  than sending a footer with no address in it. `npx convex env set
  EMAIL_POSTAL_ADDRESS "…"` on every deployment.
- **`booking-changed.html` has no trigger.** There is no reschedule flow, guests
  cancel and rebook. `sendRescheduled()` exists and is unwired, so building
  reschedule later is a matter of calling it.
- **The logo is drawn in type** (a green rounded square plus the wordmark)
  because a repo-relative asset will not resolve for a recipient. Swap in a
  hosted https PNG; the cell is sized for a 22px square.
- **`EMAIL_POSTAL_ADDRESS` is empty by default** and falls back to "Meetrao",
  which does not satisfy anti-spam law. It must be a full physical address,
  street, city, state, postcode, and it prints in the footer of every template.
- **Welcome and preferences.** The design's table marks the welcome email as
  honouring preferences, but none of the five switches names it, and gating it
  on "Product news" (off by default) would silence a message the host's own
  action just triggered. It is currently sent as account mail with the
  preferences and unsubscribe footer intact. Worth a decision.
