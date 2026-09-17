# Use-case photography

Six photographs for the marquee on the landing page (concept 2e). The filename
is the wiring — `src/components/marketing/use-cases.tsx` builds the path from
the case id — so replacing one is a matter of overwriting the file.

| File | Pill |
| --- | --- |
| `uc-freelancers.webp` | Freelancers |
| `uc-consultants.webp` | Consultants |
| `uc-agencies.webp` | Agencies |
| `uc-sales-teams.webp` | Sales teams |
| `uc-coaches.webp` | Coaches |
| `uc-remote-teams.webp` | Remote teams |

All six must exist. There is no placeholder any more: the marquee has no
frames to fall back to, so a missing file is a broken image in a band that
scrolls past every visitor. `use-cases.test.ts` fails if one is absent.

## What the crop needs

**240 × 142, WebP.** That is exactly 2× the 120 × 72 pill, so the set is
retina-correct as delivered and is referenced with a plain `<img>` rather than
through Next's optimiser — there is nothing left to optimise.

Keep the 5:3 ratio on any replacement. `object-fit: cover` on a portrait crop
will cut heads off in a pill this wide and short. The pill is a rounded
rectangle at `border-radius: 999px`, so the extreme left and right of the frame
are clipped by the curve: keep the subject centred and leave room at both ends.

Each file is referenced **twice** — the marquee renders the six items twice so
the loop is seamless — but it is one file per case, requested once and cached.

## Outstanding

**Model releases.** These are identifiable faces in a marketing band, which
needs more than a stock licence. It blocks the page going public, not the
build. Confirm before launch.

The previous set (`freelancers.webp` and five siblings, 1024 × 1024, ~100KB
each) was cut for the old carousel's two crops — landscape feature and portrait
strip — and went with it. They are in git history if a future design wants a
large square again.
