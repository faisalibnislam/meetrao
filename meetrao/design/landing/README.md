# Landing page design canvas

The live landing page, rebuilt as two design artboards so it can be pushed
around by hand: `Main.dc.html` at 1440 and `Mobile.dc.html` at 390.

Nothing here is imported by the app. It is a *rebuild*, so it goes stale the
moment the real page changes — treat `src/` as the source of truth and this as
a picture of it taken on 2026-09-10.

## What is what

| file | |
|---|---|
| `build.py` | emits both artboards. Every token, size and icon path is copied from the real source; edit here, not in the `.dc.html`, unless the change came back from the canvas |
| `Main.dc.html` / `Mobile.dc.html` | the artboards themselves — generated |
| `canvas.json` | frame positions, sizes and the notes on the canvas |
| `faqs.json` | the FAQ list, extracted from `src/components/marketing/faq.tsx` |
| `measure.py`, `shot.mjs`, `crop.mjs` | expand the templates and measure the rendered height, so `canvas.json`'s frames fit the content instead of guessing |

The assembled canvas (`meetrao-landing-page.html`, ~2.6MB) is gitignored: it is
`build.py`'s output wrapped in the Claude Design editor, and re-seeding rebuilds
it byte for byte.

## Rebuilding

```
python3 build.py                      # regenerate the artboards
python3 measure.py Main.dc.html Mobile.dc.html
node shot.mjs                         # prints the real content height of each
```

Then re-seed and republish to the same artifact URL. Sizes in `canvas.json`
come from `shot.mjs`; a frame smaller than its content clips, and clipping is
the only way to get this wrong — surplus just paints the artboard background.

## What is live on the canvas

Working controls exist only where the interaction is the point, matching the
real components' initial state: the hero's date grid and time slots
(`hero.tsx`, opens on the 9th), the cost calculator's three sliders
(`cost-calculator.tsx`, 10 meetings x 8 min at $75, four weeks a month), and
the FAQ accordion (`faq.tsx`, opens on "what"). Everything else is painted.

Two knowing departures, both because an artboard cannot be in two states at
once: the walkthrough renders at step 01 rather than auto-advancing through
four, and the use-cases carousel rests on its first item (freelancers featured,
the next three as strips) rather than cycling all six.

Photographs are marked frames, not stock images: the real page reads
`public/use-cases/<id>.jpg` and `public/people/*.webp` off disk, and a
substituted image would be a picture of somebody the product never chose.

## A warning, learned the hard way

The first version of this canvas invented the Use cases section, both live
tables, the walkthrough's weekend rows and the footer's bottom bar, because
those components were not read before drawing them — `use-cases.tsx` and
`live-tables.tsx` were skipped entirely. Everything looked plausible and none
of it was real.

If you extend this: open the component first. A rebuild that guesses is worse
than no rebuild, because it reads as a decision somebody made.
