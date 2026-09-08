# Use-case photography

Drop the six photographs here. Name each file after its use-case id — the
filename is the wiring, there is no list to edit:

| File | Card |
| --- | --- |
| `freelancers.jpg` | Book discovery calls without the email thread |
| `consultants.jpg` | Fill your week while you are in another meeting |
| `agencies.jpg` | Every account manager keeps their own link |
| `sales-teams.jpg` | Let prospects book straight from the follow-up |
| `coaches.jpg` | Recurring sessions without the weekly admin |
| `remote-teams.jpg` | Nobody does timezone maths by hand |

`.jpg`, `.jpeg`, `.png`, `.webp` and `.avif` all work. Any card with no file
here keeps its labelled placeholder frame, so a partial set is fine — the
photos you have show, the rest wait.

## What the crops need

Each photo appears twice, and never at the same shape:

- **Featured** — roughly 640 × 380, landscape.
- **Strip** — roughly 220 × 300, portrait, when that use case is not the
  featured one.

Both use `object-fit: cover` from the centre, so the subject has to survive a
landscape crop *and* a tall narrow one. Keep it centred and leave room around
it. **1600px wide or more**, or the featured panel softens on a retina screen.

The bottom of every card carries a dark gradient with white text over it, so
detail in the lower third will be covered. Busy, high-contrast bottoms fight
the caption; open or shadowed ones read best.

Committing large photographs to git is fine at this scale — six files. If the
set grows, move them to a CDN and pass absolute URLs instead, adding the host
to `images.remotePatterns` in `next.config.ts`.
