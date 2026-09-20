# supabase/ — history, not infrastructure

Nothing in this directory runs. Meetrao moved off Supabase entirely; the
database, authentication, file storage and scheduled jobs are Convex, and the
Supabase project it used to point at can be paused.

`migrations/` is kept because an applied migration is a record of what the
schema WAS and why. Several of these files are the only written explanation of
decisions the Convex code still honours — the booking overlap constraint that
`convex/bookings.ts:findOverlap` replaces, the twenty-four row-level security
policies that `convex/lib/auth.ts` replaces one for one, and the
`handle_new_user` trigger that `convex/profiles.ts:createProfileForNewUser`
replaces. Read them as the reasoning behind the port, not as something to run.

`src/lib/definer-function-grants.test.ts` still reads these files. It is
asserting a property of the historical SQL, not of anything live.
