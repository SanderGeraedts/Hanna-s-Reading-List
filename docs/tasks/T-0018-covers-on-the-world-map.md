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

# Design

# Test

# Log

- 2026-11-22 architect: task written from Hanna's feature chat of 2026-11-22; D-0026 records that
  the block shows her covers and never numbers; choices under *Choices made by the team*; group 1,
  no new stored fields; handed to the UX designer.
