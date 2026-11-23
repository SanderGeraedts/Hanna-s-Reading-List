---
id: T-0065
title: "Show the garden on the dashboard, with what is next to unlock"
description: "A Garden block on the dashboard: a small flat drawing of this year's garden, how many plants it has and how many are in bloom, the season, what is next to unlock and how far off it is, and Open › to the Garden tab."
status: Doing
size: full
depends_on: [T-0060, T-0061, T-0063, T-0064]
decisions: [D-0013, D-0014, D-0050, D-0051]
raised_on: 2026-11-23
done_on: ""
result: []
---

# Goal

The small dashboard block Hanna agreed to: the state of the garden at a glance and what is next to
unlock, with `Open ›` to the Garden tab. It is the whole garden's delivery task: the test run for
T-0060 … T-0065 is written here.

# Done when

- `pnpm test` and `pnpm run build` pass, and `pnpm exec harness check` passes.
- The block appears on the dashboard (in *Today*, next to Creatures), shows the plant count, the
  bloom count, the season and the next unlock, and keeps out of the way when nothing has been
  finished yet.
- The performance numbers of the 3D garden and the flat garden are written in this task's *Test*
  section.
- The screenshots listed in the designs exist under the tasks' `*-screens/` folders.

# Notes

- The block is registered in `src/lib/dashboardLayout.ts` (`BLOCKS`, `DEFAULT_LAYOUT`) and rendered
  in `src/components/Dashboard.tsx`, like `creatures`.
- A block with nothing to say stays out of the way, as `creatures` does (`showing`).

# Design

A `.dash-card` headed `Garden` with `Open ›`:

- a small flat drawing of **this year's** garden, at most one bed wide, plants scaled to fit (the
  same drawing code as the tab, at a smaller size, no 3D);
- `114 plants · 12 in bloom`;
- the season: `🍂 Autumn`;
- the next unlock: `Next: a pond at 25 books (6 to go)`, or `Every garden item unlocked.` when they
  are all there;
- nothing else: no hint text (D-0014), no pop-up (D-0013).

With no finished books the block keeps out of the way entirely, like Creatures before the first
hatch.

**Review (after the build).** Reviewed on 2026-11-23 on the dashboard screenshots: heading, small
garden, counts, season chip and the next-unlock line are as designed, and the block hides itself on
an empty shelf. **Matches. Passes.**

# Choices made while Hanna was at work

Hanna agreed the brief on 2026-11-23 and was at work until about 18:30, so these were decided by
the team, each the way that is easiest to change afterwards. Every one of them can be changed
without touching her books.

1. **Plants from every year, not only from a start day.** The creatures start earning on a fixed
   day (D-0033); the garden instead counts **every finished book she has**, so the garden is full
   from the first minute and the year gardens mean something. (The other way round would have given
   her an empty garden today.)
2. **A plant whose book was finished before the app noted her reading starts fully grown**, rather
   than as a sprout. Older years would otherwise be a field of sprouts for ever.
3. **Growth is 20 reading days** from the finish day to full size, in three stages. A number in one
   file (`src/lib/garden/numbers.ts`); nothing else changes if she wants it slower or faster.
4. **The catalogue is 16 kinds in 4 shapes** (tree, shrub, flower, fern), mapped from her shelf's
   own genre list; a book with no genre follows its length alone, so a thick book with no genre is
   still a tree. Poetry became the winter flower (snowdrops) so that winter is never bare.
5. **A sleep read keeps the kind its genre and length give it** and is *marked* night-blooming
   (pale moon flowers, a 🌙 in its label), rather than being replaced by a moonflower whatever the
   book was.
6. **Beds hold 12 spots and the next bed opens exactly when the spots run out.** That is what makes
   "beds unlock as she reads more" true without a plant ever being left without a spot. 114 books
   in a year is ten beds.
7. **Garden items unlock at 5, 10, 15, 25, 35 and 50 finished books** (path, bench, birdbath, pond,
   lanterns, greenhouse) — the brief named bench 10, pond 25, greenhouse 50; the other three were
   filled in around them.
8. **An item goes in the first free place** along the strip; she can take it away again. Choosing
   the exact spot for an item is not built (T-0063 review, difference 3).
9. **One press picks a plant up** and shows its details, instead of a panel with a *Move* button
   (T-0063 review, difference 2).
10. **The view follows the device** — flat on a phone, 3D on a computer — with **no switch**, as
    D-0051 §4 says. If she wants to see the 3D garden on her phone after all, a switch is a small
    change.
11. **No pop-up and nothing in *Waiting for you* for the garden.** A new plant simply appears; the
    block says what is next to unlock. (D-0013 forbids pop-ups; adding a *Waiting for you* line for
    a new plant would be easy if she misses it.)
12. **Finishes with no day at all** (books finished before the app noted dates) go in one garden of
    their own, shown last and labelled *Earlier*.
13. **Nothing was changed on the server.** Where her plants and items stand rides in the choice log
    the creatures already use (D-0052), so there is nothing for Sander to do and no second server
    pull request — as the brief asked.

# Test

Run on the branch `reading-garden` on 2026-11-23, with the dev server on port 3174 (no backend) and
a shelf of 33 books seeded in the browser.

## The checks

```
$ pnpm test
 Test Files  142 passed | 2 skipped (144)
      Tests  1866 passed | 22 skipped (1888)

$ pnpm run build
 ✓ built in 962ms

$ pnpm exec tsc --noEmit
 (no output)

$ pnpm exec harness check
 ✓ tasks: 55 tasks, index in step
 ✓ decisions: 49 records, index complete, 3 overrules valid
 ✓ engineers: 2 listed
 ✓ generated files: current

$ pnpm exec harness tasks-index
 wrote docs/tasks/index.md (55 tasks)
```

The garden's own tests: **100** in `src/lib/garden/` (the model, the catalogue, the seasons, the
spots, the tending and the gaps below) and **32** in `src/components/garden/` and
`src/components/GardenPage.test.tsx` (the tab, the block, the budget).

## The performance numbers (D-0051 §6)

The 3D garden, counted with the den's own `drawCost` (`gardenBudget.test.ts`), phone-grade settings
first and the computer's quality for the front plants second:

```
  1 plants / 1 beds:   phone 12 draw calls,   436 triangles; computer 12 /   712
 12 plants / 1 beds:   phone 23 draw calls,  1884 triangles; computer 23 /  6686
 50 plants / 5 beds:   phone 24 draw calls,  4538 triangles; computer 24 /  9198
114 plants / 10 beds:  phone 24 draw calls,  9168 triangles; computer 24 / 14092
```

Budget: 60 draw calls and 20,000 triangles (the den's phone budget). The fullest garden —
114 plants, ten beds, all six items, six visitors and the snow — uses **24 draw calls and 9,168
triangles**, 40 % and 46 % of it. Ten times the plants cost no extra draw calls, because
everything behind the front twelve is one merged mesh.

The flat garden on the phone, the view she will actually use:

```
the flat garden with 114 plants: 1019 SVG shapes, 120 spot buttons, 0 canvases
```

No WebGL, no canvas, no images: about a thousand plain SVG shapes for a garden of 114 plants, and
far under a tenth of the 3D view's work. A one-bed garden is about 120 shapes.

## What was tried to break it

| Tried | What happened |
| --- | --- |
| 0 finished books | The tab shows *Finish a book and the first plant appears.*, no beds, no spot buttons; the dashboard block hides itself. |
| 114 books in one year | Ten beds, 114 plants, every one on a spot of its own, no sideways scroll at 360 px. |
| 100 books finished on the same day | 100 plants, no two on one spot (`gaps.test.ts`). |
| A book finished and then deleted | Its plant is gone and its spot is empty; the saved spot left behind in the log changes nothing for the other plants. |
| A re-read | One plant, bigger, labelled *read 2 times*, in the year of its **first** finish. |
| A sleep read | A plant, marked *🌙 night-blooming*, flowering in every season including winter. |
| A book with no genre | Follows its length: short a daisy, medium a fern, thick a birch — still a plant. |
| A book with no page count | Counts as 280 pages, like the creatures (D-0033 §2), so it is a medium plant. |
| A book she only listens to | Its listening time becomes pages (900 min = 600 pages = a long book). |
| Every season | Spring blossom, summer green, autumn gold, winter bare with snow — and the evergreens, snowdrops and night-bloomers still alive. Screenshots for all four at 390 and 1280. |
| Leap years | 2028-02-29 is a real day and winter; 2027-02-29 is refused instead of guessed; 1900 and 2100 are not leap years. |
| A day the device reports that is not a day | The season falls back to winter; the plants are all still there. |
| Beds exactly at an unlock boundary | 12 plants is one bed, 13 is two, 24 is two, 25 is three. |
| Dragging a plant onto an occupied spot | The two swap, both spots are saved, and nothing is ever left without a spot. |
| Dragging to a spot outside the garden, or onto its own spot | Refused; the plant stays where it was and nothing is saved. |
| Moving a plant of another year | Refused (`other-year`). |
| Two devices | The newest choice per plant and per item wins, whichever order the logs meet in; two devices moving different plants keep both. |
| An item placed in a year garden that no longer exists | Ignored. |
| An item that is not unlocked yet | Cannot be placed by press or by key; it shows *Pond · at 25 books* and is `aria-disabled`. |
| Placing and taking away an item | Both are one press; the item stays unlocked afterwards. |
| Reduce motion | Every visitor gets `still`, nothing sways, no snow and no falling leaves. |
| The phone's flat view at 360 and 390 | No sideways scroll, no overlap, spot buttons at least 44 px. |
| The computer's 3D at 1280 and 1440 | The spot buttons sit over the plants; the garden fits the stage. |
| A browser that cannot draw 3D | Falls back to the flat garden (the same path every test takes, since happy-dom has no WebGL). |
| The den and the garden in one log | `deriveShop` still reads the den's `home:` items; the garden reads only its `g:` keys; neither sees the other's. |
| The same shelf in a different order | The same garden, plant for plant and spot for spot. |

## Verdict

**Passed.** Nothing is left for a human except looking at it: the garden is worked out on the
device, nothing was changed on the server, and no step needs Sander.

`Remaining:` Hanna's own look at the Garden tab on her phone and her computer (the choices above are
hers to change).

# Log

- 2026-11-23 architect: written with T-0060; size full. This task carries the garden's test run.
- 2026-11-23 ux-designer: designed the block.
- 2026-11-23 developer: built the block, the tab's wiring and the garden's two views; `pnpm test`
  1866 passed, `pnpm run build` ✓, `harness check` ✓.
- 2026-11-23 ux-designer: reviewed the block and both views: passes, with the differences written
  in each task.
- 2026-11-23 tester: passed; the checks and the performance numbers are above.
  Remaining: Hanna's own look at the garden.
