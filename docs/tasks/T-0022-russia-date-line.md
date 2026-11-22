---
id: T-0022
title: "Draw Russia on the world map without the pale wedge in its far east"
description: "Shapes that cross the date line (Russia, Fiji) are drawn as whole, closed shapes, shifted across the map edge and cut off by the map's frame, instead of lifting the pen at the jump; the path code moves to src/lib with a unit test, and every other country draws exactly as before."
status: Open
depends_on: []
decisions: [D-0014, D-0020, D-0022]
raised_on: 2026-11-22
done_on: ""
result: []
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

# Test

# Log

- 2026-11-22 architect: task written from T-0018's review (point 2). Cause found: lifting the pen
  at the date-line jump breaks Russia's mainland ring into open pieces that the browser closes
  each to its own start, leaving the triangle between the two closing lines unfilled (the wedge);
  fix specified as unwrap, copy across the edge per polygon, let the frame clip; other countries
  byte-for-byte unchanged. Handed to the ux-designer for a light pass (before/after screenshots).
