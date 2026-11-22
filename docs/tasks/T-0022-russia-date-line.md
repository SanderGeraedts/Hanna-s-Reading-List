---
id: T-0022
title: "Draw Russia on the world map without the pale wedge in its far east"
description: "Shapes that cross the date line (Russia, Fiji) are drawn as whole, closed shapes, shifted across the map edge and cut off by the map's frame, instead of lifting the pen at the jump; the path code moves to src/lib with a unit test, and every other country draws exactly as before."
status: Done
depends_on: []
decisions: [D-0014, D-0020, D-0022]
raised_on: 2026-11-22
done_on: 2026-11-22
result: [https://github.com/SanderGeraedts/Hanna-s-Reading-List/pull/231]
---

# Goal

A bug found in the UX review of T-0018 (see its *Review after building*, point 2): on the world map
in **Where your books are set** (`BooksWorldMapCard` in `src/components/PictureBlocks.tsx`), Russia
has a thin pale wedge across its far east, from about Vladivostok up to the Bering Strait. It was
there before T-0018 (the plain map in `docs/tasks/T-0018-screens/empty-*` shows it), and since T-0018
it also shows in the cover fill when Russia is lit. The map must simply look right: Russia one
solid shape, its covers filling all of it.

## The cause

`loadWorld` turns each ring of a country into an SVG path, and when two neighbouring points are more
than 180° of longitude apart it starts a new piece (`M`) instead of drawing a line. That keeps the
line from running across the whole map, but it breaks the ring into open pieces, and the browser
closes each piece on its own with a straight line back to *that piece's* start:

- Russia's mainland ring (polygon 9 in `world-atlas/countries-110m.json`, 468 points) starts near
  Vladivostok (130.8° E, 42.2° N), runs west and round the north coast to 178.6° E, 69.4° N, then
  goes through the tip of Chukotka east of the date line (points 366 to 388, at −180° to −169°),
  and comes back at 179.99° E, 65.0° N to run down the Pacific coast to its start.
- The code makes three pieces of it: the long piece (points 0 to 365), the Chukotka tip
  (366 to 388, drawn at the map's left edge), and the Pacific coast (389 to 467), with one `Z` at
  the end.
- The long piece is closed by a straight line from 178.6° E, 69.4° N back to Vladivostok; the
  Pacific piece by a straight line from Vladivostok to 179.99° E, 65.0° N. The thin triangle
  between those two lines (corners Vladivostok, 69.4° N and 65.0° N on the date line) is inside
  neither piece, so it isn't filled: that is the pale wedge. The fill rule doesn't matter here;
  the shape that reaches the browser has a gap in it.
- The same thing, smaller, happens to Wrangel Island (Russia's polygon 10: its eastern half,
  two points, becomes a line with no area and disappears) and to Fiji's Vanua Levu (polygon 1,
  closed by a slightly wrong line). In the atlas these rings cross by jumping from about +179° to
  exactly −180°: the atlas's rounding put the date-line points on the −180 side.
- The USA does **not** cross in this atlas: its Aleutians stop at −171.8°, so every USA point is
  between −171.8° and −67°. Antarctica crosses too, but the map leaves it out.

## The fix

Draw a ring that crosses the date line as **one closed ring** and let the map's frame cut it off:

1. **Unwrap** each ring: walk its points, and when a point is more than 180° away from the one
   before it, add or subtract 360° (cumulatively) so the ring is continuous. Russia's mainland
   then reaches 190.1° (Chukotka at the right of the map, past its edge), Wrangel Island and Fiji's
   Vanua Levu reach a little below −180°.
2. **Copy across the edge, per polygon:** when a polygon (its outer ring and holes together) has a
   point east of 180°, draw it a second time shifted by −360°; when it has one west of −180°, draw
   it a second time shifted by +360°. Each copy is one closed ring with a `Z`, never a lifted pen.
   The Chukotka tip still shows at the map's left edge, as now, but as part of a closed shape.
3. **The frame cuts it off:** the map's `<svg>` already hides what falls outside its viewBox (an
   inline `svg` clips by default; `.world-map` must not set `overflow: visible`). No clip path is
   needed. If the developer finds it is, add one on the map, not per country.
4. A ring that doesn't cross gives **exactly the same `d` string as today** (same `M`/`L`/`Z`, same
   one-decimal rounding), so all other countries, the USA included, are unchanged.
5. The **top-left corner** used for the cover tiles (T-0018) stays computed as today, from the
   atlas's own points, so Russia's and Fiji's tiles start where they start now.

The pure part moves to `src/lib` (suggested: `src/lib/worldPath.ts` with e.g.
`polygonsToPath(polys: number[][][][]): string`, taking `[lon, lat]` rings and returning the `d`
string with the map's projection: x = lon + 180, y = 84 − lat). `loadWorld` keeps loading the
atlas and calls it. Its test goes next to it.

# Done when

1. **`src/lib/worldPath.test.ts`** (or the name the developer picks) passes in `pnpm test`, with:
   - a small square that crosses the date line (e.g. 170° to −170°) gives two closed subpaths,
     each starting with `M` and ending with `Z`, one reaching past x = 360 and one starting
     before x = 0, and no lifted pen inside a ring;
   - a ring that doesn't cross gives the same string as before (`M…L…L…Z`, one decimal);
   - **on the real atlas** (`world-atlas/countries-110m.json` through `topojson-client`, as
     `loadWorld` does): for every country except Russia and Fiji the new `d` equals the old one
     (the test may keep a copy of today's ring function as the reference, or compare against
     strings built the old way); the USA is named in the test explicitly; for Russia and Fiji no
     two neighbouring points in any subpath are more than 180 map units apart, and every subpath
     ends with `Z`.
2. **Screenshots before and after** (the UX designer): the plain map and a map with Russia, Fiji
   and the USA lit, at 1280 px and 390 px, on both wallpapers (D-0022), plus one zoomed on the far
   east. After: no pale wedge on Russia, Russia's covers fill the far east, Chukotka's tip shows at
   the left edge, Wrangel Island is whole, Fiji and the USA look as before. In
   `docs/tasks/T-0022-screens/`.
3. `pnpm test`, `pnpm run build` and `pnpm exec harness check` pass.

# Notes

- **Group 1** (app code only): nothing for Sander. No change to `Book`, saving or syncing, no
  new package (`topojson-client` and `world-atlas` are already there).
- D-0020 / D-0022: nothing in the look changes; no colour, stroke or token is touched. D-0014: no
  hint text.
- The line from T-0018 that Russia's bounding box is the whole map width stays true (its corner is
  unchanged, point 5), so the pattern approach there needs nothing new.
- Found by the developer and the UX designer while building and reviewing T-0018 (its Build notes
  and Review, point 2).
- Hanna is the Requester; nothing here needs her answer.

# Design

A bug fix with no new look: what she sees afterwards is the map she has now, minus the mistake.

**What "looks right" means**

- **Russia** is one solid shape from the Baltic to the Bering Strait. Unlit, it is the same plain
  country fill all the way to the right edge of the map, with no paler sliver from Vladivostok up
  to the Bering Strait. Lit, its covers fill all of it, the Pacific coast and Kamchatka included,
  and the gold outline follows the coast only: no straight gold line running diagonally across
  the far east (it is there now, along the wedge's edges).
- **Chukotka's tip** (the bit of Russia east of the date line) still shows at the far left edge of
  the map, just west of Alaska, as a small filled shape: plain when Russia is unlit, covers and
  gold outline when lit. It is cut off cleanly by the map's frame, never drawn outside the map's
  rounded panel.
- **Wrangel Island** (north of Chukotka, at the right edge) shows as a whole small island where the
  map's frame doesn't cut it, not as half an island or a stray line.
- **Fiji** looks as it does now: its islands at the right edge near 18° S, lit with covers and gold
  outline when lit; Vanua Levu's coast without a straight shortcut across it. Any part of it west of
  the date line shows at the left edge, cut by the frame.
- **Nothing else changes:** every other country (the USA and Alaska's Aleutians included) is drawn
  exactly as before, at both widths and on both wallpapers; same colours, strokes, outline, cover
  tiles and where they start (Russia's and Fiji's first tile in the same place as now), same
  heading, list, hover text and screen-reader label. No text is added (D-0014), no token is touched
  (D-0020, D-0022). The map must not spill outside its panel at 390 px.

**Screenshots** (in `docs/tasks/T-0022-screens/`, `before-*` taken now, `after-*` by the developer
with the same script so they pair one to one):

- `{before,after}-plain-{1280,390}-{lavender,midnight}.jpg`: the whole block, a shelf whose only
  finished book is set nowhere, so no country is lit;
- `{before,after}-lit-{1280,390}-{lavender,midnight}.jpg`: the whole block with Russia (four
  books), the USA (two) and Fiji (one) lit;
- `{before,after}-zoom-east-{plain,lit}-1280-{lavender,midnight}.jpg`: the map's right edge at 4×
  (map x 290 to 360, y 0 to 110: Kamchatka, Chukotka, Wrangel Island, down to Fiji);
- `{before,after}-zoom-west-{plain,lit}-1280-{lavender,midnight}.jpg`: the map's left edge at 4×
  (x 0 to 60, y 0 to 40: Chukotka's tip and Alaska).

The script is
`C:\Users\User\AppData\Local\Temp\claude\ec29f026d20d029c\db547ba9-8294-4fef-972e-408349069fd4\scratchpad\shot\t22.mjs`
(playwright-core from that folder, Chrome). With the no-backend dev server up
(`pnpm exec vite dev --port 3133 --strictPort`), run it from that folder as
`node t22.mjs <repo>/docs/tasks/T-0022-screens after`. It seeds `hannas-reading-list:v1` and the
wallpaper in localStorage, opens `?view=dashboard`, hides the fixed top bar while snapping, and
prints each map's screen-reader label. Stop the server afterwards.

**Before, as seen:** the pale wedge shows on the plain map and, in the lit shots, as a white
triangle with gold edges cutting through Russia's covers from about Vladivostok to the Bering
Strait (clearest in `before-zoom-east-lit-1280-*`). The USA and Fiji look right.

**Done when (added):** in the `after-*` shots, compared pair by pair with `before-*`: no wedge or
diagonal gold line on Russia, its covers reach Kamchatka and the Bering Strait, Chukotka's tip is a
filled shape at the left edge, Wrangel Island is whole, and the USA, Fiji and every other country
look the same as before; nothing draws outside the map's panel.

## Review after building (2026-11-22)

**Verdict: matches the design, no must-fix.** Looked at all 16 `after-*` shots next to their
`before-*` pair, and at `git diff main...HEAD -- src` (PR #231).

- **Russia:** the pale wedge is gone on the plain map at both widths and on both wallpapers, and in
  the lit shots the white triangle and its two diagonal gold lines are gone. The covers now run
  through Kamchatka and up to the Bering Strait, and the gold outline follows only the coast
  (`after-zoom-east-lit-1280-*`).
- **Chukotka's tip:** a small filled shape at the far left, west of Alaska, with covers and gold
  outline when lit, cut cleanly by the map's frame (`after-zoom-west-lit-1280-*`). On the plain map
  the left-edge zoom is pixel-identical to before.
- **Wrangel Island:** whole at the top right, lit with Russia.
- **Fiji and the USA:** look the same as before, and so does Alaska. Russia's first cover tile
  starts in the same place.
- **Nothing else changed:** a pixel comparison of each before/after pair (threshold 60 on RGB)
  shows that on `plain-*-lavender` the only changes are at 84 to 95 % of the card width,
  y 180 to 248 at 1280. That's the far-east wedge. The lit and midnight shots also show a few
  hundred scattered changed pixels across the card. Looking at the pairs, these are JPEG and
  cover-image noise, not a shape change: the tiles, outlines and list look the same. The unit
  test's real-atlas check (every country except Russia and Fiji gives the same `d`, the USA named)
  covers this exactly.
- **Code against the design:** `src/components/PictureBlocks.tsx` only swaps the old ring function
  for `polygonsToPath` from `src/lib/worldPath.ts`. The corner for the cover tiles is still
  computed from the atlas points. No CSS change: `.world-map` sets no `overflow`, so the inline
  `svg` clips at its viewBox, and the shots show nothing outside the map's rounded panel. No text,
  colour, stroke or token changed (D-0014, D-0020, D-0022), and the heading, list and
  screen-reader label are the same.

# Build notes

- **`src/lib/worldPath.ts`** (new): `polygonsToPath(polys)` and `LAT_TOP`. Each ring is unwrapped
  (a jump of more than 180° adds or subtracts 360°, cumulatively); a polygon with a point east of
  180° is drawn again shifted −360°, one with a point west of −180° again shifted +360°, outer ring
  and holes together. Every ring is one `M…L…Z`; the pen is never lifted inside a ring. A ring with
  no jump is built with the same expression as before (`(lon + 180).toFixed(1)`), so its string is
  byte for byte the old one.
- **`src/components/PictureBlocks.tsx`**: `loadWorld` calls `polygonsToPath` instead of its own
  `ring` function; `LAT_TOP` now comes from `worldPath.ts`. The top-left corner for the cover tiles
  is still computed from the atlas's own points, unchanged.
- **No clip path needed:** the map's `<svg>` already cuts off what falls outside its viewBox
  (`.world-map` sets no `overflow`). The after shots confirm nothing draws outside the panel, at
  390 px either.
- **`src/lib/worldPath.test.ts`** (10 tests): a plain square gives the old string; a square from
  170° to −170° gives two closed subpaths, one reaching past x = 360 and one starting before x = 0,
  one `M` each; the mirror case (copy to the right); holes shift with their outer ring; on the real
  atlas through `topojson-client` (with a copy of the old ring function as reference) the set of
  countries whose `d` changed is exactly `['Fiji', 'Russia']`, the USA is checked by name, Russia
  and Fiji have every subpath closed with one `M` and no neighbouring points more than 180 map
  units apart, and Russia's mainland is one 468-point ring reaching x ≈ 370.1, with a copy whose
  Chukotka tip reaches x ≈ 10.1 at the left. The "only Russia and Fiji changed" test fails on the
  old code (nothing changes), the date-line ones fail on it too (lifted pen, open pieces).
- **After shots compared pair by pair with before:** the wedge and its diagonal gold lines are
  gone on the plain and lit maps (clearest in `after-zoom-east-*`); Russia's covers now fill
  Kamchatka and the Pacific coast up to the Bering Strait, the gold outline follows the coast only.
  The left-edge zooms are identical to before: Chukotka's tip is the same small filled shape
  (covers and outline when lit) at the left edge, Alaska and the Aleutians unchanged. The USA, Fiji
  and every other country look the same; the 390 px shots show the map inside its panel. Wrangel
  Island sits at x ≈ 358 to 361, so the frame cuts most of it; what shows is a closed shape, no
  stray line.

# Test

**Verdict: passed** (2026-11-22, tester). Checked on `t-0022-russia-date-line` after a clean
`pnpm install --frozen-lockfile`.

**Done when, run independently**

- `pnpm test` (before my tests): `Test Files 87 passed | 1 skipped (88)`, `Tests 755 passed |
  9 skipped (764)`. With my 5 tests added: `Test Files 87 passed | 1 skipped (88)`,
  `Tests 760 passed | 9 skipped (769)`. `src/lib/worldPath.test.ts`: 15 passed.
- `pnpm exec tsc --noEmit`: no output, exit 0.
- `pnpm run build`: `✓ built in 787ms` (client) and `✓ built in 585ms` (SSR), no errors.
- `pnpm exec harness check`: `✓ tasks: 22 tasks, index in step`, `✓ decisions: 32 records,
  index complete, 3 overrules valid`, `✓ engineers: 2 listed`, `✓ generated files: current`.
- Done when 1: the developer's tests cover every point (crossing square, unchanged plain ring,
  real atlas with only `['Fiji', 'Russia']` changed, the USA by name, Russia and Fiji closed
  with no jump over 180). Done when 2: the 16 `before-*`/`after-*` pairs are there, and the UX
  review compared them.

**Edge cases tried** (`git diff main...HEAD -- src`). Each new test checks what the browser
actually fills: the nonzero winding number (SVG's default fill rule) of grid points over every
subpath of `d`, compared with where the polygon is on the globe. Every one of them fails
against the old ring function (12 failed in a mutant run), so they test the fix itself.

- **A ring crossing the line several times** (a zigzag over and back twice): unwrapping is
  cumulative, so it stays one continuous closed ring plus one copy. The fill matches
  everywhere on the map. Passed.
- **A ring exactly on ±180**: a ring that reaches 180 but not past it gets no copy, and the
  atlas's way of writing the line points as −180 next to +179 gives the same closed ring as
  writing 180. A ring that only touches −180 from the west keeps its old string. Passed.
- **Holes**: each ring is unwrapped from its own first point, so a hole that starts on the
  other side of the line from its outer ring ends up 360 away from it. The copy step still
  puts a matching outer and hole on both sides, so the hole is cut out at both edges, whichever
  side it starts on. Holes are wound opposite to their outer ring, as in the atlas. Passed.
- **MultiPolygon pieces**: each piece is handled on its own. Only the crossing piece is
  copied, and pieces wholly east or west of the line give their old strings. Passed.
- **Russia and Fiji on the real atlas, the whole fill**: compared with an independent
  reference (the atlas's rings made continuous point by point, with their ±360 twins). They
  match at every grid point across the whole map width, more finely in the far east, at
  Chukotka's tip at the left edge, and at Fiji on both edges. Kamchatka and inland Chukotka
  are filled, Chukotka's tip at x ≈ 5 is filled, and the Sea of Okhotsk and the Pacific off
  Kamchatka stay unfilled. Passed. (My reference was wrong at first: it put each point within
  180 of the test point, and Russia is wider than that seen from Scandinavia. It also had a
  grid point lying exactly on a coast segment. I fixed both in the test, not the code.)
- **Cover-pattern start (the bounding box)**: the `x`/`y` loop in `loadWorld` is unchanged in
  the diff, so it is still computed from the atlas's own points: x = 0 for both Russia and Fiji
  (both have points at −180). The pattern is `userSpaceOnUse` and repeats, so its origin only
  sets where the tiles line up. That is the same as before, and the tiles fill the copied
  shapes on both edges too (the `after-zoom-*-lit` shots). Sensible, unchanged.
- **Every other country**: `draws every country except Russia and Fiji exactly as before`
  compares each `d` with the old ring function on the real atlas. Only Fiji and Russia
  differ, and the USA has its own test. `PictureBlocks.tsx` only swaps `ring` for
  `polygonsToPath` and imports `LAT_TOP`. No CSS change.
- `src/routeTree.gen.ts` unchanged.

Nothing remains for a human: the look was checked by the UX designer's before/after shots.

# Log

- 2026-11-22 architect: task written from T-0018's review (point 2). Cause found: lifting the pen
  at the date-line jump breaks Russia's mainland ring into open pieces that the browser closes
  each to its own start, leaving the triangle between the two closing lines unfilled (the wedge);
  fix specified as unwrap, copy across the edge per polygon, let the frame clip; other countries
  byte-for-byte unchanged. Handed to the ux-designer for a light pass (before/after screenshots).
- 2026-11-22 ux-designer: designed (no new look: Russia one solid shape with covers to the Bering
  Strait, Chukotka's tip filled at the left edge, Wrangel Island whole, Fiji, the USA and every
  other country unchanged). 16 `before-*` screenshots in `T-0022-screens/` (plain and lit, 1280
  and 390, both wallpapers, zooms on both map edges); the script for the `after-*` set is named
  under *Design*. Handed to the developer.
- 2026-11-22 developer: built `src/lib/worldPath.ts` (unwrap each ring, copy the polygon across
  the edge, one closed ring each) and `loadWorld` now uses it; 10 tests in `worldPath.test.ts`,
  including the real atlas: only Russia and Fiji change, the USA by name unchanged. `pnpm test`:
  87 files passed, 1 skipped; 755 tests passed, 9 skipped. `pnpm exec tsc --noEmit`: no errors.
  `pnpm run build`: built. `pnpm exec harness check`: all ✓. 16 `after-*` shots taken with the
  designer's script (errors: none); compared with `before-*`: no wedge or diagonal gold line, covers
  reach Kamchatka and the Bering Strait, left edge and every other country unchanged, nothing
  outside the panel. Handed to the ux-designer for review.
- 2026-11-22 ux-designer: reviewed: matches the design, no must-fix (all 16 `after-*` shots compared
  with `before-*`, plus a pixel comparison of each pair and the `src` diff). Handed to the tester.
- 2026-11-22 tester: passed (pnpm test, tsc, build and harness check green; added 5 edge-case tests: several crossings, exactly on ±180, holes starting on either side, MultiPolygon pieces, Russia and Fiji fill against an independent reference on the real atlas; bounding box unchanged).
