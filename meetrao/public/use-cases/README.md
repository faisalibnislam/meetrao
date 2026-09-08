# Use-case photography

The six photographs from the design's assets bundle, where they were named
`aud-<id>.webp`. The filename is the wiring — there is no list to edit, so
replacing one is a matter of overwriting the file:

| File | Card |
| --- | --- |
| `freelancers.webp` | Book discovery calls without the email thread |
| `consultants.webp` | Fill your week while you are in another meeting |
| `agencies.webp` | Every account manager keeps their own link |
| `sales-teams.webp` | Let prospects book straight from the follow-up |
| `coaches.webp` | Recurring sessions without the weekly admin |
| `remote-teams.webp` | Nobody does timezone maths by hand |

`.jpg`, `.jpeg`, `.png`, `.webp` and `.avif` all work. Any card with no file
here keeps its labelled placeholder frame, so a partial set is fine.

## What the crops need

Each photo appears twice, and never at the same shape:

- **Featured** — roughly 640 × 380, landscape.
- **Strip** — roughly 220 × 300, portrait, when that use case is not the
  featured one.

Both use `object-fit: cover` from the centre, so the subject has to survive a
landscape crop *and* a tall narrow one. Keep it centred and leave room around
it.

The current set is 1024 × 1024. That is enough for the strips and slightly
short for the featured panel, which is about 660px wide and would want 1320
to be crisp at 2×. A replacement at **1600 square** would remove the last of
the softness; the difference is small and only visible on a retina screen.

The bottom of every card carries a dark gradient with white text over it, so
detail in the lower third will be covered. Busy, high-contrast bottoms fight
the caption; open or shadowed ones read best.

Committing large photographs to git is fine at this scale — six files. If the
set grows, move them to a CDN and pass absolute URLs instead, adding the host
to `images.remotePatterns` in `next.config.ts`.
