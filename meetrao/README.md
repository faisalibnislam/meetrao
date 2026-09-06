# Meetrao

Scheduling without the back-and-forth. A host connects their Google Calendar,
defines bookable meetings, sets weekly hours, and shares one link; guests pick a
time the host is genuinely free and get a booking with a Google Meet link.

Built from the Claude Design handoff in `../project` — see
[Relationship to the design](#relationship-to-the-design).

**Stack:** Next.js 16 (App Router) · React 19 · Tailwind v4 · Supabase
(Postgres + Auth + Storage) · Google Calendar API.

---

## Quick start

```bash
cp .env.example .env.local     # fill in the values — see below
npm install
npm run dev                    # http://localhost:3000
```

```bash
npm run build       # production build
npm test            # slot-engine unit tests
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
```

---

## Setting up Supabase

1. Create a project, then copy the URL and publishable key into `.env.local`.
2. Apply the migrations in `supabase/migrations/` **in filename order**. Either
   paste them into the SQL editor, or:

   ```bash
   npx supabase link --project-ref <ref>
   npx supabase db push
   ```

3. **Auth → Providers → Email**: for the design's `signup → onboarding` flow to
   work as drawn, turn **Confirm email** off. Left on, signup returns no session
   and the app shows a "check your inbox" notice instead — both paths are
   handled.
4. **Auth → URL Configuration**: add `<site>/auth/callback` to the redirect
   allow-list.
5. To sign in with Google, enable the Google provider under **Auth → Providers**
   and give it its own OAuth client. This is *separate* from calendar access —
   see below.

Regenerate types after a schema change:

```bash
npx supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts
```

### Making yourself an admin

`is_admin` is not settable from the app, by design. Flip it in SQL:

```sql
update public.profiles set is_admin = true where username = 'you';
```

---

## Setting up Google Calendar

Calendar access is a **separate OAuth grant** from "Sign in with Google".
Supabase Auth gives an identity; it does not reliably persist a refresh token
for a third-party API, so Meetrao runs its own authorization-code flow with
`access_type=offline` and stores the refresh token itself
(`src/lib/google/oauth.ts`).

In the Google Cloud console:

1. Enable the **Google Calendar API**.
2. Create an **OAuth client ID** of type *Web application*.
3. Authorised redirect URI: `<NEXT_PUBLIC_SITE_URL>/api/google/callback`
   — it must match exactly, including scheme and port.
4. On the consent screen, add exactly these two scopes:

   | Scope | Why |
   | --- | --- |
   | `.../auth/calendar.freebusy` | when the host is busy — not what they are doing |
   | `.../auth/calendar.events` | create and delete the events Meetrao itself makes |

   These two are what the connect dialog promises, and why it can honestly say
   *"Meetrao never reads the contents of your events."* Do not widen them to
   `calendar.readonly` without changing that copy.

5. Put the client ID and secret in `.env.local`.

Until `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are set, the app still runs:
the connect button reports that calendar is not configured, and hosts simply are
not conflict-checked (the dashboard warns about exactly that).

---

## How the important parts work

### The slot engine — `src/lib/booking/slots.ts`

Pure functions, no I/O, covered by `slots.test.ts` (17 tests). Given the host's
weekly rules, a meeting's duration/buffer/notice/window, and a set of busy
intervals, it produces the bookable instants for a day.

- Availability is stored as **minutes past local midnight** per weekday and
  resolved against the host's IANA zone, so hours follow DST rather than
  drifting. The tests cover the US spring-forward day: the 02:00 hour that does
  not exist locally is skipped, and the fall-back day emits no duplicates.
- **Buffers widen busy intervals**, they do not change the slot grid — which is
  what "buffer between meetings" actually means.
- Intervals are half-open, so back-to-back meetings do not collide.

### Double-booking — the exclusion constraint

This is the one piece worth reading before changing anything:

```sql
alter table public.bookings
  add constraint bookings_no_overlap
  exclude using gist (
    host_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status = 'confirmed');
```

Two confirmed bookings for one host can never overlap — enforced by Postgres,
so it holds under genuinely concurrent requests across application instances. A
conflicting insert raises SQLSTATE `23P01`, which `createBooking` turns into an
HTTP **409** and the UI renders as *"That time is no longer available."*

The application-level `isSlotBookable` check still runs first, but it is a
*validity* check (is this a real slot under current rules?), not the conflict
guard. Never rely on read-then-write for that.

Verified behaviour: overlap rejected · adjacent allowed · cancelling frees the
slot.

### Security posture

- Every table is **deny-by-default**; hosts reach only their own rows, admins
  get read access platform-wide via `public.is_admin()`.
- `calendar_connections` — which holds Google refresh tokens — has **no
  policies and no grants at all**. Only the service role can touch it, so tokens
  can never reach a browser.
- The anonymous role has **no direct table access**. The public booking surface
  is four `SECURITY DEFINER` functions returning a deliberately narrow column
  set; `get_busy_intervals` returns *times only*, never a guest name or email,
  so one guest cannot learn who else booked a host.
- The service role is used in exactly three places: OAuth tokens, creating a
  booking, and serving a guest their own booking by reference.
- A guest's `reference` is 32 hex characters from `gen_random_bytes` and acts as
  a capability token for that one booking.

`npx supabase inspect` / the Supabase advisor will still flag the four public
RPCs as "anon can execute a SECURITY DEFINER function" — that is intentional and
is the whole point of them.

---

## Layout

```
src/
  app/
    page.tsx                    landing (one responsive route; see below)
    (auth)/                     login · signup · forgot
    onboarding/[step]/          the five setup steps
    (app)/                      host shell: dashboard, bookings, meetings,
                                availability, settings
    (admin)/admin/              admin console
    [username]/[slug]/          public booking page
    booking/[reference]/        confirmed · cancelled · .ics
    api/                        slots · bookings · google oauth
  components/
    ui/                         primitives ported from the prototype
    app/  booking/  admin/  onboarding/  auth/  brand/
  lib/
    booking/                    slot engine, time helpers, booking service
    google/                     OAuth + Calendar
    supabase/                   browser / server / service-role / anon clients
    actions/                    server actions
supabase/migrations/            schema, RLS, functions, storage
```

`src/proxy.ts` is the session-refresh and route-guard middleware — Next 16
renamed `middleware` to `proxy`.

---

## Relationship to the design

The prototype (`../project/Meetrao.dc.html`) is the visual spec and was followed
closely: tokens, control heights, radii, copy and interaction states are taken
from it directly. `../project/design_handoff_meetrao/README.md` is a useful
written summary but is **slightly stale** — where the two disagree, the
`.dc.html` source wins. (Example: it describes one dashboard metric strip with a
"Show-up rate"; the source has four separately tinted cards.)

Deliberate departures, all of them because the prototype had no backend:

| Design | Here | Why |
| --- | --- | --- |
| Prototype bar pinned to the bottom | not built | the handoff says not to |
| 58–90px bottom padding on the sidebar, page body and toasts | normal spacing | that padding only existed to clear the prototype bar |
| Dashboard metric "Avg. reply time — from link opened to booked" | "Booked recently — new bookings in the last 30 days" | Meetrao does not track link opens, so the original has no data source. The handoff flags the same problem for its show-up rate: *"either compute it or drop it."* |
| Desktop and mobile landing pages as two files | one responsive route | same content and both designs' treatments, at a `md` breakpoint |
| `/:username` always shows one meeting | shows a chooser when a host has more than one active meeting | the prototype only ever drew a single-meeting page; `/:username/:slug` is unchanged |
| "See a live booking page" CTA | falls back to "See how it works" | there is no demo account unless `NEXT_PUBLIC_DEMO_USERNAME` is set |
| Explicit Desktop/Mobile viewport switch | CSS breakpoints | the switch was a prototype affordance |
| Footer Privacy / Terms | still `#` | as in the design; no such pages exist yet |

Timezones behave as specified: 94 IANA zones, sorted by live UTC offset, labels
computed at runtime so they follow DST. Guests see times converted into their
own zone; the host's schedule is always rendered in the host's.

---

## Known gaps

- **Email notifications are not implemented.** Google Calendar sends its own
  invitations (`sendUpdates=all`), which covers the confirmation and the
  cancellation, but there is no Meetrao-branded mail. Section 20 of the original
  brief wants more than that.
- **No rescheduling.** Guests can cancel but not move a booking — open question
  #3 in the handoff, still unanswered.
- **Availability is one weekly schedule per account**, not per meeting type. No
  date overrides or holidays.
- **Admin actions are view + suspend/reactivate only.** Suspension bans the auth
  user and mirrors a flag onto `profiles`; there is no impersonation or editing.
- **Avatar uploads** go to a public `avatars` bucket. Fine for profile photos;
  revisit if anything private ever lands there.
- **Font Awesome 6 Sharp is a licensed family.** The four OTFs in
  `public/fonts/` came with the design bundle — ship your own licensed copy, or
  substitute an equivalent set and keep the weight convention (Light 300 for
  objects and navigation, Solid 900 for status/close/check).
- **The landing screenshots** in `public/assets/` are pictures of the prototype.
  Regenerate them from the real app.
