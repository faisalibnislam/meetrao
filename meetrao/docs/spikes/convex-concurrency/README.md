# Phase 0 spike — does a Convex mutation hold the double-booking guard?

Postgres enforces `bookings_no_overlap` with an `EXCLUDE USING gist` constraint.
Convex has no such constraint, so the guard becomes *read overlapping bookings,
then insert*, inside one mutation. That is only safe if Convex mutations are
genuinely serializable under concurrent load. This spike tests that claim
against a real backend rather than trusting the documentation.

## Running it

Needs no Convex account and no Docker — `CONVEX_AGENT_MODE=anonymous` runs a
local backend binary.

```bash
npm install convex
CONVEX_AGENT_MODE=anonymous npx convex dev   # leave running
node run-spike.mjs
```

`npx convex dev --once` will NOT work: it deploys and exits, taking the backend
down with it.

## What it asserts

The read in `createBooking` uses a **narrow index range**, not a table scan —
that is what a real implementation would do, and it is the harder case for
optimistic concurrency control, since a wider read set makes conflicts easier
to detect.

1. 25 concurrent requests for the identical slot
2. 10 concurrent requests staggered inside a buffer window
3. 20 concurrent NON-overlapping requests (guards against over-rejection)
4. 30 repeated trials of the hot race, 8 racers each

Test 2 asserts the **invariant** — no two committed bookings conflict — rather
than a winner count. An earlier version asserted "exactly one winner" and
failed: with 5-minute stagger, 30-minute duration and a 15-minute buffer, the
first and last candidates are exactly buffer-adjacent and may both legally
commit. Postgres agrees (`a_end + 15min > b_start` is false at 15, true at 16).
The assertion was wrong, not the implementation.
