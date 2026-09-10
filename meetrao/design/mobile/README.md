# Mobile screens canvas

Ten real Meetrao pages captured at 390px, for reviewing and commenting on.

**These are not redrawings.** `capture.mjs` loads each route in a 390px touch
browser against the stand-in Supabase, then lifts the page's own rendered DOM
and its own compiled stylesheet out of the live render. What the canvas shows is
what the browser painted.

Three rewrites happen on the way out, each because leaving it alone would make
the artboard lie:

1. `@media (pointer: coarse)` becomes `@media all`. The canvas runs inside a
   desktop iframe, where those rules would not match — so every control would
   render at its *desktop* size in a 390px frame, hiding the whole 44px touch
   pass. Forcing them on is what makes the frames honest.
2. `@font-face` is dropped and the same families come from Google Fonts, the one
   host an artifact's CSP admits. next/font self-hosts woff2 under
   `/_next/static`, which does not exist inside a published artifact.
3. Same-origin images are inlined as data URIs, and scripts are stripped. The
   wordmark rendered as a broken-image icon until the first of those.

Public routes (`/`, `/login`, the booking page) are captured **signed out** —
with the session cookie, `/login` redirects to the dashboard and the landing
page shows an account menu no visitor ever sees.

## Re-capturing after a change

    # stand-in Supabase, then the app
    node <scratchpad>/perf/fake-supabase.mjs &
    npm run build && npx next start -p 3200

    cd design/mobile
    node capture.mjs      # rewrites the .dc.html artboards
    node check.mjs        # renders each one, reports height and overflow
    # then re-seed with seed-canvas.mjs and republish to the same artifact URL

`check.mjs` is the guard worth keeping: it reports each artboard's height and
flags any that exceeds 390px wide, which is how frame sizes in `canvas.json`
were set rather than guessed.

## Known about the content

The data is a stand-in chosen to stress the layout — deliberately long names and
40-character email addresses. An earlier capture showed every booking twice;
that was the stand-in ignoring `gte`/`lt` range filters, not a product bug, and
it is fixed.
