---
id: T-0018
title: "Fill the countries on the world map with her covers, show imaginary lands as rows of covers, and drop every number from the block"
description: "Each lit country on Where your books are set becomes a patchwork of the covers of all finished books set there (spine colour for a book without a cover), imaginary lands get one row per land with tiny covers, and the block shows no counts anywhere: list, hover text, lands, screen-reader label and waiting line."
status: Doing
depends_on: [T-0015]
decisions: [D-0002, D-0014, D-0020, D-0022, D-0023, D-0026]
raised_on: 2026-11-22
done_on: ""
result: []
---

# Goal

From a feature chat with Hanna (2026-11-22), about the dashboard block "Where your books are set"
(`BooksWorldMapCard` in `src/components/PictureBlocks.tsx`, logic in `src/lib/places.ts`). She
wants to see *which* books took her somewhere, not how many (D-0026, recorded now).

## 1. Covers in the countries

- Each **lit** country (a country with at least one finished book set there, as now) is filled
  with a **patchwork of the covers of all** her finished books set there, tiled over the
  country's shape. Big countries show many covers (repeating when there are more tiles than
  books); tiny countries show part of one.
- A book **without a cover** (no `coverUrl`) gets a tile in its spine colour (`book.color`). A
  cover that fails to load also shows as its spine colour (a colour behind every tile).
- Countries without books stay plain, as now. The shading by count (`fillOpacity`) goes.
- The order of the tiles in a country: **most recently finished first** (`lastFinish` from
  `src/lib/ratingAsk.ts`), books without a finish date last, ties by title. So the first tile,
  the one a tiny country shows, is her latest read there.

## 2. No numbers anywhere in the block

- **The list under the map** keeps the country names (the top 6, as now), most books first, ties
  alphabetical, **without counts**.
- **The hover text** (the `<title>` of a lit country) is the country name and the titles of its
  books, not "3 books". A plain country's title stays its name.
- **Imaginary lands** have no counts.
- **The screen-reader label** of the map (`aria-label` of the `svg`) has no numbers: it names the
  lit countries (see *Choices*).
- **The waiting line** "Looking up where 3 more books are set…" loses its number: "Looking up
  where more of your books are set…".
- Titles of books may themselves contain digits ("1984"); that's fine, they're titles.

## 3. Imaginary lands as rows of covers

One row per land: the land's name and tiny covers of its books, like `own-challenge-books` in
`src/components/OwnChallenges.tsx` (2.2 × 3.3 rem, spine-colour chip for a book without a
cover). Lands most books first, ties alphabetical (as `byCount` sorts now); covers in a row in
the same order as the map's tiles. The same land is still merged as in T-0015 (Hogwarts and
"Hogwarts School of Witchcraft and Wizardry" are one land; one book counts once per land).

## Not doing

Tapping a country (or a cover) to open its books, and zooming the map.

# Done when

- Unit tests next to the `src/lib` logic pass (`src/lib/places.test.ts`, `src/lib/setIn.test.ts`):
  - `worldMap()` gives, per country and per land, **the books** set there (finished books only,
    as now), each book once per country and once per land, in tile order (most recently finished
    first, no finish date last, ties by title);
  - places most books first, ties alphabetical, for countries and for lands;
  - the existing map tests keep their meaning on the new shape: "United Kingdom" has books a and
    b, Greece has b, `waiting` 1, `placed` 2; Hogwarts has 4 books (3× "Hogwarts" + 1× the long
    name), a book with both Hogwarts names is in Hogwarts once, Middle-earth + Middle Earth is one
    land with 2 books, Velaris + velaris one land with 2, Prythian added in the panel shows under
    Prythian;
  - the small-cover helper: an app cover URL (`/api/cover/id/…?size=L`, `/api/cover/isbn/…`)
    becomes the small size; a `data:` cover, a `/api/remote-cover?…` cover and an empty one are
    left as they are.
- A component test for `BooksWorldMapCard` (like `src/components/BingoSuggest.test.tsx`), with a
  shelf whose titles contain no digits and with at least one country of 2+ books, a book without
  a cover and an imaginary land of 2+ books:
  - the block's text, every `<title>` and the `svg`'s `aria-label` contain **no digit**;
  - a lit country has one tile per book in the order above (at least), a book without a cover
    shows a spine-colour tile, a plain country has no tiles;
  - the lit country's `<title>` names the country and its books' titles;
  - the lands show one row per land, most books first, with one cover per book.
- Clicked through on a local dev server with no backend (`pnpm run dev`, shelf seeded in
  localStorage `hannas-reading-list:v1`, never a production `POCKETBASE_URL`), screenshots at
  390×844 and 1280×800 on **lavender and midnight** in `docs/tasks/T-0018-screens/`: the map with
  a big country (many tiles), a small one (part of a cover), a book without a cover, the country
  list without counts, the hover text, and the lands rows. Borders of lit countries readable on
  both wallpapers.
- With a seeded shelf of 150 finished books with places: the dashboard stays responsive, and the
  network tab shows the map's covers requested at the small size, each URL once.
- Design checks (UX designer), on the screenshots and in the dev server:
  - every lit country has a gold outline with a dark edge, drawn over its neighbours, readable on
    lavender and midnight, about the same thickness at 390 and 1280;
  - no lit country is shaded lighter than another; while covers load and when one fails, its tile
    shows the spine colour, never a hole;
  - the country list shows names only; a long name wraps inside its cell;
  - the lands show "Imaginary lands" and one row per land, each cover 2.2 × 3.3 rem, wrapping onto
    more lines without overflowing at 390 px; a broken or missing cover shows a spine-colour chip;
  - hovering a lit country shows its name and its book titles one per line; hovering a lands cover
    shows its title;
  - with no places yet the plain map shows with "Open Library doesn't know where your finished
    books are set yet."
- `pnpm test`, `pnpm run build` and `pnpm exec harness check` pass.

# Notes

- **Group 1** (app code only): nothing for Sander. No new stored fields, no change to `Book`,
  `shelfMerge.ts`, `src/server/shelf.ts` or syncing. No new package.
- **`worldMap()`** (`src/lib/places.ts`): `countries` and `imaginary` become `Map<string, Book[]>`
  (books in tile order), keeping `waiting` and `placed` (the block shows `waiting` only as "more",
  never as a number). Keep the land merging (`landKey`, first spelling wins). Replace `byCount`
  with a helper that sorts entries by number of books, most first, ties alphabetical, for both
  countries and lands (the list now sorts ties alphabetically too). Update the callers in
  `setIn.test.ts`.
- **How to draw the covers (performance):** one `<pattern>` per lit country
  (`patternUnits="userSpaceOnUse"`) holding one tile per book (a rect in `book.color` with the
  cover `<image>` on top, `preserveAspectRatio="xMidYMid slice"`), laid out as a small grid, and
  the country's own `<path>` filled with `url(#…)`; the pattern starts at the country's top-left
  corner (its bounding box from the path's points, worked out once in `loadWorld`) so a tiny
  country shows the first cover. This looks the same as a `clipPath` with tiled `<image>`s over
  the bounding box (what was discussed in the chat), but each book is one `<image>` instead of one
  per tile: Russia and the USA cross the date line, so their bounding box is the whole map width
  and would need hundreds of tiles. If the developer finds a reason to use `clipPath` instead,
  keep the tile count per country bounded and say why in the Log.
- **Tile size:** 8 × 12 map units (2:3, a book's shape) on the 360 × 142 viewBox. On a phone
  (map ≈ 330 px wide) that is about 7 × 11 px; on a computer about 9–13 px wide. France shows
  one and a half covers, the Netherlands part of one, the USA about fourteen. One constant, so the
  UX designer can change it.
- **Cover URLs:** use the app's own cover URLs (`book.coverUrl`): they are same-origin
  (`/api/cover/…`, `/api/remote-cover`) or `data:`; an SVG `<image>` needs no CORS anyway, and the
  map draws no canvas. For the map tiles ask for the small size: a pure helper in `src/lib`
  (e.g. in `cover.ts`) turns `/api/cover/…?size=L` (or no size) into `size=S`, and leaves
  `data:` and `remote-cover` URLs alone. The lands rows use `size=M` (2.2 rem wide, sharp on a
  phone). The cover route caches for a week, so each URL is fetched once.
- **Lazy loading:** the map's shapes already load lazily, and the covers are only drawn once they
  have. Lands-row covers are `<img loading="lazy">` as in `own-challenge-books`. No extra
  in-view logic unless the 150-book check shows it is needed.
- **Borders:** lit countries get their outline drawn on top of the covers, clearer than the plain
  countries' faint line, so the shape reads against busy covers on both wallpapers. Tokens only
  (D-0020, D-0022); the UX designer picks the colour and width.
- **Accessibility:** the `svg` keeps `role="img"`; its label has no numbers. Covers in the lands
  rows have their book's title as text alternative (alt, or `aria-label` on the spine-colour
  chip) and as `title` for hover.
- D-0014: no hint text in the block. D-0023: places stay hers; this task only reads them.

## Build notes (developer)

- `src/lib/places.ts`: `worldMap()` gives `countries` and `imaginary` as `Map<string, Book[]>`, each
  book once per place, sorted by `tileOrder` (latest `lastFinish` first, no finish date last, ties
  by title). `byCount` is replaced by `byBooks` (most books first, ties alphabetical), used for the
  country list, the screen-reader label and the lands.
- `src/lib/cover.ts`: `coverAtSize(url, size)` sets `size=` on an app cover URL (`/api/cover/…`)
  and leaves every other URL (`data:`, `/api/remote-cover?…`, empty) as it is. Map tiles use `S`,
  lands rows `M`.
- `src/components/PictureBlocks.tsx`: `loadWorld` also works out each country's top-left corner;
  each lit country gets one `<pattern>` (`userSpaceOnUse`, starting at that corner, `ceil(√n)`
  columns, last row filled on from the first book), a spine-colour rect behind each cover
  `<image>`. Tile size is one constant pair, `TILE_W` × `TILE_H` = 8 × 12. Lit countries' outlines
  (`--bg` 2.5 px under `--accent` 1.25 px, `vector-effect: non-scaling-stroke`) are drawn in their
  own group after all countries, `pointer-events: none` so hover still reaches the country's
  `<title>`. Patterns, not a clip path (choice 3).
- **Found while building:** Chrome draws a broken-image sign for an SVG `<image>` whose cover
  fails (seen in the first covers-failed screenshots), so the tile showed that instead of its
  spine colour. The block now remembers failed map covers (`onError`) and leaves their `<image>`
  out, so the spine colour shows, as the design asks. Tested in `BooksWorldMap.test.tsx`.
- Lit countries' fill is an inline `style` (`fill: url(#…)`), because the `.world-country` CSS
  rule would beat a `fill` attribute.
- Lands: `h3` "Imaginary lands", a `ul.world-lands` with one `li` per land (name, then a
  `ul.world-land-books` with `aria-label` = the land); covers are `<img loading="lazy" alt title>`
  with the spine colour as background, or a `span.cover-chip role="img"`; a failed cover becomes
  the chip. The cover size reuses the `own-challenge-books` rule.
- No open choice was left for Hanna; nothing was asked. Group 1: no change to `Book`, saving or
  syncing, no new package.
- Noticed, not fixed (for the architect): Russia's shape has a thin sliver across the far east
  where its ring crosses the date line (visible as a pale wedge in the map screenshots); it was
  there before with the gold fill too.

## Choices made by the team

Hanna agreed on the scope above and asked to take the recommended option for anything still open.
These were taken by the architect; the UX designer may refine the visual ones under *Design*.

1. **Tile order:** most recently finished first, so a tiny country shows her latest read there.
2. **Tile size:** 8 × 12 map units (see *Notes*), the same in every country.
3. **Patterns instead of a clip path per tile**, for speed (see *Notes*); it looks the same.
4. **Small covers:** the map asks for the small cover size, the lands rows for the medium; own
   photos (`data:`) and Storytel covers as they are.
5. **A cover that fails to load shows its spine colour**, like a book without a cover.
6. **No shading by count** any more: every lit country is covers.
7. **The country list keeps its top 6**, most books first, ties alphabetical, names only.
8. **Hover text:** the country name, then every book title, one per line, in tile order; no
   "and more" (that would need a number).
9. **Screen-reader label:** "World map of where your books are set: " followed by all lit
   countries, most books first; "World map" when none is lit.
10. **Waiting line** without a number: "Looking up where more of your books are set…".
11. **Lands-row covers are not buttons** (tapping to open books is not part of this task); they
    show the title on hover.
12. **A decision record (D-0026)** so no one adds numbers back to the block later.

Taken by the UX designer (recommended options, see *Design*):

13. **Lit-country outline:** gold (`--accent`, 1.25 px) over a dark edge (`--bg`, 2.5 px), in
    screen pixels, the same on both wallpapers, drawn above all filled countries.
14. **Tiles touch**, no seam between covers; a pattern's grid is about square (`ceil(√n)`
    columns), its last row filled from the first book.
15. **Lands as titled rows:** "Imaginary lands" (no colon) as a small heading, then each land's
    name on its own line with its covers below, wrapping, all of them.
16. **No hover highlight** on the map; covers in the lands are not focusable.

# Design

Everything stays inside the existing card `.dash-card.world-card` with the title "Where your books
are set" (unchanged). From top to bottom: the map, the list of country names, the imaginary lands,
then at most one muted line (waiting or empty). No hint text (D-0014), no number anywhere (D-0026).
Tokens only (D-0020); no new colour, text size or spacing value.

## Where the block sits, at both widths

| | Phone, 390 px wide | Computer, 1280 px wide |
|---|---|---|
| Card | one column, card padding 1rem (existing ≤ 720 px rule) | one of two dashboard columns, card padding `--space-5` |
| Map width | about 334 px, so 0.93 px per map unit | about 486 px, so 1.35 px per map unit |
| One cover tile (8 × 12 map units) | about 7 × 11 px | about 11 × 16 px |
| Country list | 2 columns | 3 columns |
| Lands-row covers per line | about 8 | about 12 |

The map keeps its shape (`viewBox 0 0 360 142`, `width: 100%`, `height: auto`) and its existing
frame: `.world-map` background, `--radius-small` corners, `--space-2` above and below. The tile size
stays 8 × 12 map units on both widths (the architect's constant): at 7 px wide on a phone a cover is
a recognisable colour block, at 11 px on a computer the artwork starts to show. Nothing changes
between the two widths except what the card width gives.

## The map

### Plain countries (no finished book set there)

Unchanged: `.world-country` fill `rgba(255, 255, 255, 0.1)`, stroke `rgba(0, 0, 0, 0.35)`, width
0.25 map units. Hover text: the country name only. These are drawn first.

### Cover-filled countries (one or more finished books set there)

- **Fill:** the patchwork of tiles, one tile per book, in tile order (most recently finished first,
  no finish date last, ties by title). Each tile is a rect in the book's spine colour
  (`book.color`) with the cover image on top (`preserveAspectRatio="xMidYMid slice"`, so a cover is
  cropped, never squashed). Tiles touch: no gap or seam between them (a seam would eat a third of a
  phone tile).
- **The grid inside a country's pattern:** `columns = ceil(√n)` for n books, rows as needed; empty
  cells at the end of the last row continue from the first book, so the pattern is full and a
  repeat never leaves a hole. The pattern starts at the top-left corner of the country's bounding
  box, so a tiny country shows its first tile (her latest read there).
- **No shading by count:** `fillOpacity` and the gold `.world-country.lit` fill go. Every lit
  country is fully opaque covers.
- **The outline (same on lavender and midnight):** each lit country gets its outline drawn on top
  of all filled countries, in its own group after them, so a neighbouring lit country can't paint
  over it. Two strokes, both `fill: none`, `vector-effect: non-scaling-stroke` (so the width is in
  screen pixels, the same on phone and computer), `stroke-linejoin: round`:
  1. underneath: `stroke: var(--bg)`, width **2.5 px** (a dark edge, so the gold reads against a
     pale cover);
  2. on top: `stroke: var(--accent)`, width **1.25 px** (the one gold accent; it already passes
     3:1 on a card on both wallpapers in `colours.test.ts`).

  The card is the same walnut `--surface` on both wallpapers (only its 12 % see-through tint
  differs), so the outline needs no wallpaper override and no new contrast pair. A tiny country
  (the Netherlands, about 6 px wide on a phone) shows mostly outline with a sliver of cover; that is
  fine, it still reads as gold and lit.
- **No hover effect** (no highlight, default cursor): the map isn't interactive in this task.

### Cover loading and failed covers

- While a cover image loads, its tile shows the spine-colour rect: the map never shows holes or a
  spinner, the covers simply appear over the colours.
- A cover that fails to load leaves the spine-colour rect: it looks exactly like a book without a
  cover. Nothing else changes, no error text.
- Map tiles ask for the small cover size (`size=S`); own photos (`data:`) and Storytel covers as
  they are.

## The list of country names

`ul.world-top`, the top 6 lit countries, most books first, ties alphabetical. Each `li` holds only
the country name, `--fs-body`, `--text`; the muted count span goes. The grid stays
`repeat(auto-fill, minmax(9rem, 1fr))` with gap `--space-1` `--space-3`; a long name ("Bosnia and
Herz.", "United States of America") wraps inside its cell (`overflow-wrap: anywhere`, `min-width:
0`). `justify-content: space-between` on the `li` goes (nothing to push right). Hidden when no
country is lit.

## Imaginary lands, one row per land

Shown only when there is at least one land; under the country list, `--space-3` above it.

```
🗺️ Imaginary lands                       ← title line
Hogwarts                                 ← land name
[▯][▯][▯][▯]                             ← its covers, wrapping
Middle-earth
[▯][▯]
```

- **Title line:** `🗺️ Imaginary lands` (no colon, the rows follow), the emoji `aria-hidden`,
  `--fs-small`, weight 600, `--text`. Markup: an `h3` (the card's title is the `h2`), margin 0.
- **The rows:** a `ul.world-lands`, no bullets, `display: grid`, gap `--space-3` between lands.
  Lands most books first, ties alphabetical; the same land merged as in T-0015 (first spelling
  shown).
- **One row (`li`):** the land name, `--fs-small`, `--text`, normal weight, wrapping with
  `overflow-wrap: anywhere` (a long name like "Hogwarts School of Witchcraft and Wizardry" wraps,
  never overflows); then `--space-1` below it, the covers.
- **The covers:** a `ul` reusing the `own-challenge-books` look: `display: flex; flex-wrap: wrap;
  gap: var(--space-1)`, each cover **2.2 × 3.3 rem** (35 × 53 px), `border-radius: 3px`,
  `object-fit: cover`. Add the new class to the existing `.own-challenge-books img,
  .own-challenge-books .cover-chip` rule rather than copying the values. Covers in tile order, every
  book once, all of them (no "more"); they wrap onto as many lines as needed. Cover size `size=M`,
  `<img loading="lazy">`.
- **Book without a cover:** `span.cover-chip` with `background: book.color`, same size.
- **Cover that fails to load** (`onError`): replaced by the same spine-colour `cover-chip`. Give the
  `<img>` `background: book.color` as well, so a slow cover shows its colour while it loads.
- **Not buttons:** covers are plain images, not focusable, no click (tapping is not in this task).

## The lines under the map (one at most, `muted small-text`)

| State | What shows |
|---|---|
| Map shapes still loading | only `Unfolding the map…` (unchanged), no map |
| Map shapes failed | only `The map couldn't be loaded right now.` (unchanged) |
| Some finished books still being looked up | the map (plain countries plus any lit ones), list and lands as far as known, then `Looking up where more of your books are set…` |
| Nothing lit, no lands, nothing waiting (no places yet, or no finished books) | the plain map, then `Open Library doesn't know where your finished books are set yet.` (unchanged) |
| Everything looked up | no line |

## Screen readers and hover

- **Map:** `svg role="img"` with `aria-label` = `World map of where your books are set: ` + all lit
  countries, most books first, joined with `, ` (e.g. "World map of where your books are set:
  United Kingdom, France, Greece"); just `World map` when none is lit. The map is one image to a
  screen reader; the paths' titles are for mouse hover.
- **Hover on a lit country:** its `<title>` is the country name, then each book title on its own
  line, in tile order:
  ```
  United Kingdom
  Pride and Prejudice
  Jane Eyre
  ```
  (a newline between lines; no "books", no "and more").
- **Hover on a plain country:** its name.
- **Country list:** read as a plain list of names.
- **Lands:** the `h3` "Imaginary lands", then a list; each row reads the land name, then its cover
  list with `aria-label` = the land name, each cover announced by its book title: `<img alt="{title}"
  title="{title}">`, or for a chip `<span class="cover-chip" role="img" aria-label="{title}"
  title="{title}">`. Hover on a cover shows its title.
- No part of the block is in the tab order (nothing is interactive).

## Exact wording (English, as the app)

- Title: `Where your books are set` (unchanged)
- `Unfolding the map…` / `The map couldn't be loaded right now.` (unchanged)
- Map label: `World map of where your books are set: {countries}` or `World map`
- Lands title: `Imaginary lands`
- Waiting: `Looking up where more of your books are set…`
- Empty: `Open Library doesn't know where your finished books are set yet.` (unchanged)

## Reuse

- Tokens: `--accent`, `--bg`, `--text`, `--fs-small`, `--fs-body`, `--space-1` … `--space-3`,
  `--radius-small`; existing `.dash-card`, `.dash-card-head`, `.world-map`, `.world-country`,
  `.world-top`, `.muted`, `.small-text`, `.visually-hidden`, `.cover-chip` and the
  `own-challenge-books` cover sizes.
- The ` · ` separators and the hidden commas of the old lands line go (each land is its own row).

# Test

# Log

- 2026-11-22 architect: task written from Hanna's feature chat of 2026-11-22; D-0026 records that
  the block shows her covers and never numbers; choices under *Choices made by the team*; group 1,
  no new stored fields; handed to the UX designer.
- 2026-11-22 ux-designer: designed (map tiles and gold outline on both wallpapers, names-only list,
  lands rows, states, phone/computer, screen reader and hover, wording); choices 13–16 added;
  design checks added to *Done when*; handed to the developer.
- 2026-11-22 developer: built the cover patchwork per lit country (patterns, spine colour behind
  every tile, failed map covers left out), gold-over-dark outlines on top, names-only country list,
  lands as rows of covers, no number anywhere (map label, hover text, list, lands, waiting line),
  `worldMap()` with books per place in tile order, `byBooks`, `coverAtSize`; see *Build notes*.
  Check: `pnpm test` 80 files, 601 passed, 9 skipped (new: `src/components/BooksWorldMap.test.tsx`
  8 tests incl. "no digit anywhere in the block", and the map tests in `src/lib/places.test.ts`
  and `src/lib/setIn.test.ts` on the new shape); `pnpm exec tsc --noEmit` clean;
  `pnpm run build` built; `pnpm exec harness check` all ✓. Clicked through on the no-backend dev
  server (`vite dev --port 3128`, shelf in localStorage, real Open Library covers through the
  app's `/api/cover` route): 32 screenshots in `T-0018-screens/` (map, map close-up, hover, covers
  failed, waiting, empty, loading, map failed; 390 and 1280; lavender and midnight). The hover
  shots draw the `<title>` text next to the pointer as a stand-in, because a native tooltip is not
  in a screenshot; the app's fixed top bar is hidden while snapping. Measured on every
  combination: no digit in the block's text, label "World map of where your books are set: United
  States of America, United Kingdom, France, Italy, Japan, Netherlands, Romania, Russia", lands
  covers 35 × 53 px, no overflow at 390, no page errors. 150-book check (150 finished books with
  places, 101 distinct map cover URLs): 101 map requests all `size=S`, 27 lands requests all
  `size=M`, no URL requested twice (the other 45–51 `size=L` requests come from other dashboard
  blocks, the same without places); long tasks and click-to-frame times (130–263 ms) the same as
  the same shelf without places (130–241 ms), so no extra in-view logic.
