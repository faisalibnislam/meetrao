repo: faisalibnislam/meetrao
branch: main
path: meetrao

## Last sync

date: 2026-09-07T12:10:00Z

### Updated in this project
- Owner restarted: greenfield build on Vercel + Supabase + Resend + Google Cloud.
- `faisalibnislam/meetrao` is no longer the target — the new build starts from an empty repo.
- This association is kept only as a record of the earlier partial implementation.


## Stack

Next.js 16.3.4 (App Router) · React 19.2.8 · TypeScript · Tailwind 4 · Supabase (SSR + auth) ·
date-fns / @date-fns/tz · Vitest. Design tokens live in `meetrao/src/app/globals.css` as CSS
custom properties, re-exported to Tailwind via `@theme inline`.

## Screen map

| This project | Repo files |
| --- | --- |
| Auth · Log in / Sign up / Forgot | `src/app/(auth)/{login,signup,forgot}/page.tsx`, `src/components/auth/{auth-card,auth-form}.tsx`, `src/app/(auth)/actions.ts` |
| Auth · Verify email | **not in repo** — new route needed |
| Onboarding · 5 steps | `src/app/onboarding/[step]/page.tsx`, `src/app/onboarding/layout.tsx`, `src/components/onboarding/{steps,step-rail}.tsx` |
| App shell (sidebar, header) | `src/app/(app)/layout.tsx`, `src/components/app/{sidebar,page-header}.tsx` |
| App · Dashboard | `src/app/(app)/dashboard/page.tsx`, `src/components/app/dashboard-header.tsx` |
| App · Bookings | `src/app/(app)/bookings/page.tsx`, `src/components/app/{bookings-screen,booking-rows}.tsx`, `src/lib/data/booking-rows.ts` |
| App · Meetings | `src/app/(app)/meetings/page.tsx`, `src/components/app/meetings-table.tsx` |
| App · Create / edit meeting | `src/app/(app)/meetings/{new,[id]}/page.tsx`, `src/components/app/meeting-form.tsx`, `src/lib/actions/meetings.ts` |
| App · Availability | `src/app/(app)/availability/page.tsx`, `src/components/app/{availability-screen,availability-editor}.tsx`, `src/lib/actions/availability.ts` |
| App · Settings (4 panels) | `src/app/(app)/settings/[[...tab]]/page.tsx`, `src/components/app/{settings-nav,settings-panels}.tsx`, `src/lib/settings-tabs.ts` |
| Public · Booking page | `src/app/[username]/page.tsx`, `src/app/[username]/[slug]/page.tsx`, `src/components/booking/{booking-flow,meeting-chooser}.tsx`, `src/lib/booking/{slots,service,time,page-data}.ts` |
| Public · Confirmed / Cancelled | `src/app/booking/[reference]/page.tsx`, `.../cancelled/page.tsx`, `.../ics/`, `src/components/booking/confirmed.tsx` |
| Admin · Dashboard / Users / Bookings / Settings | `src/app/(admin)/admin/**`, `src/components/admin/{admin-tables,admin-settings,suspend-user}.tsx`, `src/lib/data/admin.ts`, `src/lib/actions/admin.ts` |
| Admin · Remove account | **not in repo** — `suspend-user.tsx` exists, removal does not |
| Landing page | `src/app/page.tsx` (predates the landing redesign) |
| Terms · Privacy · Help · Support | **not in repo** — four new routes |
| Emails (6 templates) | **not in repo** — `design_handoff_meetrao/emails/*.html` are send-ready |
| Dialogs | `src/components/ui/modal.tsx` |
| MenuSelect | `src/components/ui/menu-select.tsx` |
| Shared UI | `src/components/ui/{button,button-style,controls,field,icon,spinner,toast,route-link}.tsx` |
| Google Calendar | `src/lib/google/{calendar,oauth,failure,errors}.ts` |
| Design tokens | `src/app/globals.css` |

## Notes

- The repo root holds a `project/` folder with a **stale snapshot** of this design project
  (`Meetrao.dc.html`, `Meetrao Landing Mobile.dc.html`, `Dropdown.dc.html`, `MeetUp Prototype.dc.html`).
  Those files predate the rename and several rounds of change. The current bundle is
  `design_handoff_meetrao/`; the old snapshot should be deleted or replaced, not read.
- `meetrao/AGENTS.md` warns that this Next.js version has breaking changes versus training data —
  read `node_modules/next/dist/docs/` before writing code.
