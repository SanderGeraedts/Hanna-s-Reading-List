---
id: T-0019
title: "Let her pick a book's spine colour from swatches taken from its cover, with Back to automatic"
description: "The book panel gets a Spine colour row with 5–6 swatches from the book's cover (the dominant one first, marked ★ Dominant, the current one ✓); a tap sets book.color and the spine and back repaint at once; Back to automatic gives the cover's colour again, or colorFromString(title) for a book without a cover."
status: Open
depends_on: [T-0004]
decisions: [D-0002, D-0007, D-0009, D-0014, D-0020, D-0022, D-0027]
raised_on: 2026-11-22
done_on: ""
result: []
---

# Goal

From a feature chat with Hanna (2026-11-21). Every spine gets its colour from the book's cover when
the book is added (`analyzeCover` in `src/lib/cover.ts`: a saturation-weighted average of a 24 × 24
sample, darkened to 0.82), or `colorFromString(title)` without a cover. Sometimes that average is a
muddy colour that isn't really on the cover. She wants to choose the spine colour herself from the
colours of the cover, in the book panel (`src/components/BookPanel.tsx`), and go back to the
automatic one when she likes.

## 1. The Spine colour row

- A row **"Spine colour"** in the book panel, near "Change cover…" and "Page edges" (the UX
  designer places it).
- For a book **with a cover**: **5–6 swatches** taken from the cover (fewer when the cover has
  fewer distinct colours, never two that look the same).
  - The **first** swatch is the dominant colour, marked **"★ Dominant"**. It is the automatic
    colour (see *Choices*, 1).
  - The swatch equal to the book's **current colour** (`book.color`, compared case-insensitively)
    is marked **✓**. When the current colour is none of the swatches (an older colour, or one from
    a different cover), it is shown as one extra swatch with ✓ at the end of the row.
  - **Tapping a swatch** sets `book.color` through `onUpdate({ color })`; the spine and the back
    on the 3D shelf repaint at once (they already repaint when `book.color` changes: `looks` in
    `BookMesh.tsx`).
- For a book **without a cover** (no `coverUrl`): no swatches, only the current colour (with ✓).
- For a book whose cover **can't be loaded** (analysis gives `null`): the same as without a cover,
  only the current colour, and no "Back to automatic" (see *Choices*, 4).
- While the cover is being analysed: the current colour only; the swatches appear when ready.

## 2. Back to automatic

- **"Back to automatic"** sets `book.color` to the automatic colour:
  - with a cover: the current `analyzeCover(book.coverUrl)` result's `color` (the same colour a new
    book with this cover gets, and the ★ Dominant swatch);
  - without a cover: `colorFromString(book.title)`.
- Shown only when the current colour differs from the automatic colour (see *Choices*, 3).

## 3. Covers through the app's own routes

The cover is loaded from `book.coverUrl` as stored: the app's own `/api/cover/…` and
`/api/remote-cover?…` routes (same-origin, so the canvas may read it) or an own photo (`data:`). No
other URL, no new route, no outside service.

## Not doing

A free colour wheel or hex input; a "whole series" button; changing the page edges along with the
spine (edges set "From the cover" stay as stored).

# Done when

- Unit tests in a new `src/lib/cover.test.ts` (pure functions, no canvas: jsdom has none):
  - the pixel analysis (split out of `analyzeCover`, e.g. `analyzePixels(data: Uint8ClampedArray)`
    giving `{ color, palette }`) on synthetic 24 × 24 data:
    - `color` is exactly what `analyzeCover` gave before for the same pixels (saturation-weighted
      average × 0.82): a test with hand-computed values, so automatic colours of existing books
      don't move;
    - `palette[0] === color`; the palette has at most 6 colours and at least 1;
    - a cover of half red, a quarter blue and a quarter yellow gives a red, a blue and a yellow
      swatch (each darkened to 0.82 like now), saturated colours ahead of greys of the same area;
    - no two swatches closer than the minimum distance the developer picks (one constant), so a
      single-colour cover gives 1 swatch;
    - the same pixels always give the same palette (no randomness: deterministic seeding);
  - `automaticColour(book, analysis)` (or similar): cover + analysis → `analysis.color`; no cover →
    `colorFromString(title)`; cover but analysis `null` → `null`;
  - the spine lettering: for a sweep of colours (e.g. every 16th step of r, g, b), `inkFor(bg)` has
    a contrast ratio of at least 3:1 with `bg`, and the existing `textures.test.ts` cases still pass
    (`#1d2a44` → `#f6efe1`, `#f2e6c8` → `#1d1a16`).
- A component test for the row (like `src/components/PriceField.test.tsx`), with `analyzeCover`
  mocked:
  - a book with a cover shows the palette's swatches, the first marked "★ Dominant", ✓ on the one
    equal to `book.color`; a current colour outside the palette shows as an extra swatch with ✓;
  - tapping a swatch calls `onUpdate({ color })` with that colour;
  - "Back to automatic" is hidden when the current colour is the automatic one, shown otherwise,
    and calls `onUpdate({ color: <analysis.color> })`;
  - a book without a cover: no palette swatches, one ✓ swatch, "Back to automatic" gives
    `colorFromString(title)`;
  - a cover whose analysis is `null`: one ✓ swatch, no "Back to automatic";
  - every swatch is a button with an accessible name (see *Notes*).
- Clicked through on a local dev server with no backend (`pnpm run dev`, shelf seeded in
  localStorage `hannas-reading-list:v1`, never a production `POCKETBASE_URL`), screenshots at
  390×844 and 1280×800 on **lavender and midnight** in `docs/tasks/T-0019-screens/`: the row for a
  book with a colourful cover (Open Library cover through `/api/cover`), for a Storytel cover
  (`/api/remote-cover`), for a book without a cover, after tapping a non-dominant swatch (the spine
  and the back on the shelf in the new colour, without a reload), and after "Back to automatic". No
  canvas or CORS error in the console.
- After a reload the chosen colour is still there (it is saved with the book like any edit).
- Design checks (UX designer) on the screenshots and in the dev server.
- `pnpm test`, `pnpm run build` and `pnpm exec harness check` pass.

# Notes

- **Group 1** (app code only): nothing for Sander. **No new stored field** and no change to `Book`,
  `shelfMerge.ts`, `src/server/shelf.ts` or syncing: `book.color` already exists, syncs with the
  book, and a swatch tap goes through `updateBook`, which sets `editedAt`, so the shelf merge keeps
  the newest choice across devices. No new package (k-means on 576 pixels is a few lines).
- **Does anything overwrite a chosen colour later?** Checked: no. `color` is written only when a
  book is added (`AddBookDialog`, new books in `storytelImport.ts`) and when she picks a new cover
  (`CoverPicker`). The Storytel refresh and nightly sync (`syncedShelf`, D-0007) don't touch it;
  merging duplicates keeps the kept copy's colour (`merge.ts`, `...keep`, D-0009). D-0027, recorded
  now, keeps it that way: nothing recolours an existing book on its own, so no "chosen" flag is
  needed.
- **The palette (`src/lib/cover.ts`):** keep `analyzeCover(url)` as the one loader (same `Image`
  with `crossOrigin = 'anonymous'`, same 24 × 24 canvas, same `null` for tiny or failing images) and
  return `{ color, aspect, palette }`; the existing callers (`AddBookDialog`, `CoverPicker`,
  `storytelImport`) only read `color` and `aspect` and stay as they are. The pixel work moves into a
  pure function for the tests. Suggested method: weighted k-means (k = 6, weights `0.15 + sat²` as
  now, a fixed number of rounds, seeded deterministically, e.g. farthest-point from the weighted
  mean); each centre darkened × 0.82 like the average; drop centres too close to an earlier swatch
  (one distance constant); order: `color` first, then the clusters by weight. Bucketing instead of
  k-means is fine if the tests hold.
- **Where it runs:** in the book panel, when it opens a book with a cover (or when its cover
  changes), once per book; cancel on switching books (like `CoverPicker`'s `cancelled`). Use
  `book.coverUrl` as stored, not another size, so "Back to automatic" gives exactly the colour the
  book got when added (the cover is in the browser's cache already from the shelf). The component
  can live in its own file like `EdgesField.tsx` (e.g. `SpineColourField.tsx`).
- **Contrast of the spine lettering:** the spine's title, author and language tag, and the back's
  text, use `inkFor(bg)` in `src/components/textures.ts` (off-white on dark, near-black on light,
  by a brightness threshold; T-0004 / #180: Hanna wants white lettering on dark spines). Chosen
  colours make the middle range more likely (a bright green or orange), where the threshold can
  pick white with poor contrast. Keep the rule, but when the picked ink has a WCAG contrast below
  3:1 with the spine (and the other ink does better), use the other ink. Existing dark spines keep
  their white lettering. The gold bands follow `spineColours` as now.
- **Accessibility:** each swatch is a `button` with an accessible name (e.g. "Spine colour
  #7a2e2e", plus "dominant" / "current"; the UX designer words it) and `aria-pressed` for the
  current one; ✓ and ★ readable on any swatch colour (use `inkFor` for the ✓). The row is a
  `role="group"` labelled "Spine colour", like `EdgesField`.
- D-0014: no hint text in the row; "★ Dominant" and "Back to automatic" are labels she asked for.
  D-0020 / D-0022: tokens only, readable on lavender and midnight.
- Page edges: `edgesFromCover` reads `book.color` when she taps "From the cover", so after a new
  spine colour that button gives edges in the new colour; stored edges don't change by themselves.

## Choices made by the team

Hanna agreed on the scope above and asked to take the recommended option for anything still open.
These were taken by the architect; the UX designer may refine the visual ones under *Design*.

1. **★ Dominant is the automatic colour** (today's `analyzeCover` average), not the biggest
   cluster, so ★ Dominant and "Back to automatic" always agree and no existing spine changes colour.
   The other swatches are the cover's main colours, most weight first.
2. **No new stored field** (D-0027): nothing recolours a book on its own, so a chosen colour is
   safe as `book.color`.
3. **"Back to automatic" only shows when it would change something.**
4. **A cover that can't be loaded** shows only the current colour and no "Back to automatic" (we
   can't work out the automatic colour, and a title colour would not match the cover).
5. **Without a cover, automatic is `colorFromString` of the current title** (after a rename it may
   differ from the colour the book got when added).
6. **A current colour outside the swatches** shows as an extra ✓ swatch at the end of the row.
7. **Picking a new cover** still gives the new cover's automatic colour, also over a chosen one
   (D-0027); the new swatches are right there to choose again.
8. **Spine lettering:** white on dark and dark on light as now, switching only where the chosen
   colour would make it hard to read (below 3:1).
9. **Page edges are left alone** when the spine colour changes.
10. **A decision record (D-0027)** so no later feature quietly recolours her books.

# Design

To be written by the UX designer.

# Test

To be written by the tester.

# Log

- 2026-11-22 architect: task written from Hanna's feature chat of 2026-11-21; checked that nothing
  recolours a book automatically (only adding a book and picking a new cover write `color`), so no
  new stored field; D-0027 records that a spine colour is only changed by her; spine-lettering
  contrast rule and choices under *Choices made by the team*; group 1; handed to the UX designer.
