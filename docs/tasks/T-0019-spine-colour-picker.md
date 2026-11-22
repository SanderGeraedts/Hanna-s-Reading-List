---
id: T-0019
title: "Let her pick a book's spine colour from swatches taken from its cover, with Back to automatic"
description: "The book panel gets a Spine colour row with 5–6 swatches from the book's cover (the dominant one first, marked ★ Dominant, the current one ✓); a tap sets book.color and the spine and back repaint at once; Back to automatic gives the cover's colour again, or colorFromString(title) for a book without a cover."
status: Doing
depends_on: [T-0004]
decisions: [D-0002, D-0007, D-0009, D-0014, D-0020, D-0022, D-0027]
raised_on: 2026-11-22
done_on: ""
result: ["https://github.com/SanderGeraedts/Hanna-s-Reading-List/pull/228"]
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
- Design checks (UX designer) on the screenshots and in the dev server, against *Design*:
  - the row sits between "Change cover…" and "Page edges", with no text other than "Spine colour",
    "★ Dominant" (only with cover swatches) and "Back to automatic";
  - swatches are 44 × 44 px in the 390 screenshots and 36 × 36 px in the 1280 ones, and up to 7 fit
    on one line at both widths, on lavender and midnight;
  - the current swatch shows a ✓ readable on its colour and a gold ring; the keyboard focus ring is
    visible around it as well;
  - tapping a swatch or "Back to automatic" turns the book to its spine; after "Back to automatic",
    focus is on the swatch that is now pressed;
  - each swatch's accessible name is a plain colour name (no hex code), with ", dominant" on the
    first and no two names the same; a unit test covers `colourName`;
  - a cover that is loading or can't be loaded shows the single ✓ swatch, with no spinner,
    placeholder or error text.
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

## Build notes (developer)

- `src/lib/cover.ts`: the pixel work is split out into `analyzePixels(data)` → `{ color, palette }`.
  `color` is computed exactly as before (same loop, `0.82 / wsum`), so no existing spine moves.
  The palette is a weighted k-means (weights `0.15 + sat²`), seeded with the weighted mean and
  then, each time, the pixel with the largest `weight × distance²` to every seed (no randomness),
  8 rounds; empty clusters drop out. Each centre is darkened × 0.82, sorted by weight, and kept
  only if it is at least `MIN_SWATCH_DISTANCE` (RGB distance) from every earlier swatch; `color`
  is always first, at most 6. `analyzeCover(url)` keeps its loader and returns
  `{ color, aspect, palette }`; its callers are unchanged. Also `automaticColour(book, analysis)`
  and `sameColour(a, b)` (case-insensitive).
- **Numbers picked (recommended option, nothing asked):** `MIN_SWATCH_DISTANCE = 36` and **10
  clusters**, not the suggested k = 6. With k = 6 and distance 48 the real covers in the
  screenshots (Harry Potter, The Hobbit, The Alchemist, a Storytel cover) gave only 3 swatches
  each, because several clusters land on near-identical shades and are merged. With k = 10 and 36
  they give 5–6 swatches that still look clearly different. The tests hold either way.
- `src/lib/colourName.ts`: `colourName(hex)` (hue → red, orange, yellow, green, teal, blue,
  purple, pink; brown for dark orange or yellow; grey, black, white or cream for low colour; "Dark
  "/"Light " by lightness) and `swatchNames(hexes, dominantFirst)` (", dominant" on the first,
  " 2", " 3" for repeats). A dusty brown-red like `#72564d` (hue 14°) is named "Red", as the
  design's hue list puts it.
- `src/components/textures.ts`: `inkFor` keeps the brightness rule and switches to the other ink
  only when the first reads under 3:1 and the other reads better; `contrastRatio` is exported for
  the test. `spineColours` still picks the bands from the ink. The swatch ✓ uses the same
  `inkFor`.
- `src/components/SpineColourField.tsx`, placed in `BookPanel` between "Change cover…" and "Page
  edges". The analysis runs once per book / cover (`[book.id, coverUrl]`) and is dropped when you
  switch books. Tapping the current swatch does nothing (it doesn't turn the book either). After
  "Back to automatic", focus goes to the swatch that is now pressed. CSS block
  `/* ---- spine colour (T-0019) */` next to page edges: 36 px swatches, 44 px (`--tap`) under
  `(max-width: 720px), (pointer: coarse)`; tokens only.
- Group 1: no change to `Book`, saving or syncing, no new package, no new route.
- Screenshots (`docs/tasks/T-0019-screens/`, 36 JPEGs: `<width>-<wallpaper>-<n>-<state>`): 1 Open
  Library cover (`/api/cover`), 2 after tapping "Dark blue" (book turned to its spine), 3 its back
  in the new colour, 4 the shelf with the panel closed, 5 after "Back to automatic", 6 the keyboard
  focus ring on the pressed swatch, 7 a Storytel cover (`/api/remote-cover`) with an outside colour
  as the extra ✓ swatch, 8 no cover, 9 a cover that can't be loaded. Run on
  `vite dev --port 3129` with no backend and a seeded `hannas-reading-list:v1`. Measured: swatches
  44 × 44 at 390 and 36 × 36 at 1280, one line each (7 on the Storytel book), no sideways scroll;
  after a reload the stored colour was still `#1c3654`; no page, canvas or CORS errors.
- At 1× pixel ratio the 2 px gap between the gold "current" ring and the focus outline is thin in
  the focus screenshots; the outline is there (`:focus-visible` true, `2px solid` gold, offset
  4 px), and it shows clearly at 2×.
- Noticed, not fixed (for the architect): an earlier session's dev server was still running on
  port 3129; I stopped it before starting my own.

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

Added by the UX designer (2026-11-22), taking the recommended option each time:

11. **The row sits between "Change cover…" and "Page edges"**, so the three "how the book looks"
    controls are together.
12. **Swatches are rounded squares**, 44 px on a phone or touch screen and 36 px with a mouse (the
    app's existing tap-size rule), so up to 7 fit on one line in the 340 px computer panel.
13. **"★ Dominant" is a caption under the first swatch**, not a mark inside it; the ✓ (plus a gold
    ring) is the only mark inside a swatch.
14. **Tapping a swatch or "Back to automatic" turns the book to its spine**, as focusing "Back cover"
    turns it to the back, so she sees the change at once.
15. **Buttons with `aria-pressed`, not a radio group**: they match the panel's other pickers, and the
    arrow keys stay free for turning the book.
16. **Swatches are named with plain colour names** ("Dark red, dominant"), not hex codes, from a
    small helper with its own test.
17. **Loading and failed covers look the same**: one ✓ swatch, with no spinner and no error text.

# Design

A new row, **Spine colour**, built like `EdgesField` (its own component, e.g.
`SpineColourField.tsx`). It uses tokens only (D-0020) and has no hint text (D-0014): the only words
are the label, the "★ Dominant" caption and the "Back to automatic" button. It adds no new colour,
text size or spacing value. The panel is the same walnut `--surface` on both wallpapers, so lavender
and midnight look the same here and the colour test needs no new pair.

## Where it sits

In the book panel, straight after **Change cover…** and before **Page edges**:

1. Front / Spine / Back
2. Change cover…
3. **Spine colour** (new)
4. Page edges
5. Status, and the rest as now.

The cover, the spine colour and the page edges are the three "how the book looks" controls, so they
stay together. The panel's own `gap: 1rem` spaces the row from its neighbours; there are no extra
margins.

## The row, from top to bottom

```
Spine colour                              <- .field label: --fs-small, --muted
[■✓] [■] [■] [■] [■] [■]   [■]             <- swatches; the last one only for an outside colour
★ Dominant                                <- caption under the first swatch
( Back to automatic )                     <- btn small, only when it would change something
```

- **Container:** `div.field.spine-colour-field`, `role="group"`,
  `aria-labelledby="spine-colour-label"`, with the label
  `<span id="spine-colour-label">Spine colour</span>`, just like `EdgesField`.
- **Swatch line:** a flex row, `gap: var(--space-1)`, with `flex-wrap: wrap` as a fallback only (with
  the sizes below, 7 swatches fit on one line at both widths). The extra swatch for an outside colour
  (see below) gets `margin-left: var(--space-2)`, so it reads as separate from the cover's colours.
- **"★ Dominant" caption:** a line of its own straight under the swatch line, starting under the
  first swatch's left edge, `--fs-small`. The ★ is in `--accent` and the word "Dominant" in
  `--muted`. It's one line, `white-space: nowrap`, and may run on under the second swatch; it sits on
  its own line, so it never pushes the swatches apart. `aria-hidden="true"`: the first swatch's name
  already says "dominant". It's only shown when there are cover swatches.
- **"Back to automatic":** `button.btn.small`, `justify-self: start`, on its own line under the
  caption. It's the same kind of button as "From the cover" and "Remove" in Page edges.

## The swatches

- **Element:** each swatch is a `<button type="button">` with `aria-pressed` (`true` only for the
  current colour). There is no visible text inside except the ✓.
- **Size and touch target:**
  - **Phone** (the bottom sheet, `max-width: 720px`) **and any coarse pointer**: **44 × 44 px**
    (`var(--tap)`). Seven swatches with gaps are 7 × 44 + 6 × 4 + 8 = 340 px, which fits in the
    sheet's 358 px of content at 390 wide.
  - **Computer panel with a mouse**: **36 × 36 px** (2.25rem). Seven swatches are
    7 × 36 + 6 × 4 + 8 = 284 px, which fits in the panel's 300 px of content. This follows the app's
    existing rule that controls grow to the tap size only on touch (`@media (pointer: coarse)`, as
    `.btn.small` and `.icon-btn` do), plus the phone width, so the 390 screenshots show 44 px.
- **Shape:** a rounded square, `border-radius: var(--radius-small)`, filled with the colour
  (`background: <hex>`). That matches the Page edges swatches next to it.
- **Border:** `1px solid var(--border-strong)` on every swatch, so a very dark swatch (close to the
  walnut) still shows its edge. **Hover** (mouse): `border-color: var(--text)`.
- **Current (✓):** `aria-pressed="true"`, with a centred **✓** in `--fs-large`, weight 600, in the
  swatch's ink colour: `inkFor(hex)` with the same 3:1 fallback the spine lettering gets (one shared
  function, so the ✓ is always readable on its swatch). It also gets a gold ring that touches the
  swatch: `box-shadow: 0 0 0 2px var(--accent)`. The ring is what carries "current" against the
  walnut, and the ✓ carries it inside the colour, so it never relies on colour alone.
- **Keyboard focus:** `:focus-visible` gives `outline: 2px solid var(--accent); outline-offset: 4px`,
  the same gold as every other focus in the app. On the current swatch the focus ring sits outside
  the current ring, with a gap between them, so both show.
- **Dominant:** the first swatch in the row. The only visual mark is the caption under it (there's
  no ★ inside the swatch, so the ✓ stays the only glyph in a swatch). When the dominant colour is
  also the current one, the first swatch has the ✓ and the gold ring, with the caption under it.
- **The extra swatch for the current colour:** when `book.color` matches none of the palette swatches
  (compared case-insensitively), one more swatch with that colour goes at the end, after the
  `--space-2` gap, with ✓ and the ring. Once she taps a palette swatch it goes away (the current
  colour is now in the palette). That's expected: an outside colour can't be got back except by
  "Back to automatic" or a swatch, which is the whole point.
- **Tapping the current swatch** does nothing: it stays pressed and nothing is saved.
- **Order:** the ★ Dominant (automatic) colour first, then the cover's other colours with the most
  weight first (architect's choice 1). At most 6 palette swatches, plus at most 1 extra.

## What a tap does: the live update

- **A swatch:** `onUpdate({ color: hex })`, and the book in the panel turns to show its **spine**
  (`onFace('spine')`, the same way focusing "Back cover" already turns it to the back). The spine and
  the back repaint at once through `looks` in `BookMesh.tsx`, with no reload and no extra animation
  beyond the existing turn. The ✓ and the ring move to the tapped swatch in the same render, and
  "Back to automatic" appears when the new colour isn't the automatic one.
- **"Back to automatic":** `onUpdate({ color: automatic })` and `onFace('spine')`. The button then
  disappears, because the colour now is automatic. **Focus moves to the swatch that is now pressed**
  (the ★ Dominant one, or the single swatch for a book without a cover), so a keyboard or screen
  reader user isn't left on a removed button.
- On the shelf (panel closed) the book keeps its new colour. After a reload it's still there (saved
  like any edit).

## States

| State | Swatches | ★ Dominant caption | Back to automatic |
|---|---|---|---|
| **Cover, analysed** | the palette (1–6), ✓ on the match, or an extra ✓ swatch at the end | yes | when `book.color` ≠ `analysis.color` |
| **Cover still loading** (analysis running) | only the current colour, ✓ | no | no (the automatic colour isn't known yet) |
| **Cover that can't be loaded** (analysis `null`) | only the current colour, ✓ | no | no (choice 4) |
| **No cover** (no `coverUrl`) | only the current colour, ✓ | no | when `book.color` ≠ `colorFromString(title)` |

- **Loading:** no spinner, no "loading" text and no placeholder squares. The row shows its one ✓
  swatch, which keeps the swatch line's height. When the analysis is done, the palette replaces it in
  place, with no fade (the cover is usually cached from the shelf already, so this takes a moment at
  most). Only the caption and maybe the button add height below, so nothing above the row moves.
- **Cover that can't be loaded:** quiet. There's no error message (D-0014; the failure costs her
  nothing), and it looks the same as loading, without ever growing. Being offline with an uncached
  cover ends up here as well.
- **Switching books** while an analysis runs: the old result is dropped (cancelled, as in
  `CoverPicker`), and the row starts again in the loading state for the new book.
- **A new cover picked under "Change cover…":** the book gets the new cover's colour (choice 7), and
  the row goes into loading and then shows the new cover's swatches, with ✓ on ★ Dominant.

## Phone (390) and computer (1280), on both wallpapers

- **390 × 844 (bottom sheet):** the row sits in the sheet's scroll, under Change cover…. Swatches
  are 44 px, and 7 fit on one line. It's the same on lavender and midnight: the sheet is walnut on
  both.
- **1280 × 800 (side panel, 340 px wide):** swatches are 36 px, and 7 fit on one line. It's the same
  on both wallpapers: the panel is `--surface` walnut with a light blur, and the swatches, the gold
  ring and the caption sit on the walnut, not on the wallpaper.
- The book in the panel is visible above the sheet on a phone, and to the left of the panel on a
  computer, so she sees the spine change while tapping.

## Keyboard and screen reader

- **Not a radio group:** plain buttons with `aria-pressed`, inside `role="group"`. Reasons:
  - it matches the panel's other pickers (Front/Spine/Back, the format chips, Page edges) and the
    task's component test ("every swatch is a button");
  - the Left/Right arrows already turn the book while the panel is open (`index.tsx`), and a radio
    group would take them over;
  - seven tab stops at most is fine.

  **Tab** moves through the swatches in order, then "Back to automatic". **Enter or Space** picks a
  swatch. The arrows keep turning the book, as everywhere else in the panel.
- **Names:** each swatch is named after its colour in plain words, from a small pure helper (e.g.
  `colourName(hex)` in `src/lib/`, with a unit test). It takes the hue as one of red, orange,
  yellow, green, teal, blue, purple, pink, or brown (dark orange or yellow), or grey, black, white
  or cream for low saturation, then puts "dark " or "light " in front by lightness. It gives no hex
  code, because a code means nothing spoken aloud.
  - Format: `<Colour name>` for most swatches, and `<Colour name>, dominant` for the first one.
  - When two swatches would get the same name, the later one gets " 2", " 3" and so on
    ("Dark red", "Dark red 2").
  - The same text goes in `title`, so a mouse hover shows the name too. That's a label, not a hint.
  - "Current" isn't in the name: `aria-pressed` already says it.
- **What a screen reader says** (VoiceOver/NVDA, roughly):
  - entering the row: "Spine colour, group";
  - on the first swatch: "Dark red, dominant, toggle button, pressed";
  - on the next: "Dark yellow, toggle button, not pressed";
  - after picking it: "pressed" on the same button;
  - on the button: "Back to automatic, button";
  - after activating it, focus lands on "Dark red, dominant, toggle button, pressed".

  There is no live region: what changes is the state of the button she is on.

## Exact wording

| Where | Text |
|---|---|
| Row label | `Spine colour` |
| Caption under the first swatch | `★ Dominant` |
| Button | `Back to automatic` |
| Swatch name and `title` | `<colour name>`, or `<colour name>, dominant` for the first; e.g. `Dark red, dominant`, `Light blue`, `Grey 2` |

The spelling is British "colour", as in the task.

## Reuse

- **Components and classes:** `.field` (the label style), the `role="group"` + `aria-labelledby`
  pattern from `EdgesField`, `.btn.small` for "Back to automatic", the `@media (pointer: coarse)`
  tap-size rule, and the gold `:focus-visible` outline used by `.btn`.
- **Tokens:**
  - `--tap` for 44 px;
  - `--radius-small` for the corners;
  - `--border-strong` for the border, `--text` on hover;
  - `--accent` for the current ring, the focus ring and the ★;
  - `--muted` for the label and "Dominant";
  - `--fs-small` for the label and caption, `--fs-large` for the ✓;
  - `--space-1` and `--space-2` for the gaps.
- **Functions:** `inkFor` (with the new 3:1 fallback) for the ✓, `colorFromString` for the automatic
  colour without a cover, and `analyzeCover` for the palette.
- **New CSS:** one block `/* ---- spine colour (T-0019) ---- */` next to `/* ---- page edges */`,
  holding `.spine-colour-swatches`, `.spine-swatch`, `.spine-swatch[aria-pressed='true']`,
  `.spine-swatch.outside` and `.spine-colour-dominant`.

# Test

To be written by the tester.

# Log

- 2026-11-22 architect: task written from Hanna's feature chat of 2026-11-21; checked that nothing
  recolours a book automatically (only adding a book and picking a new cover write `color`), so no
  new stored field; D-0027 records that a spine colour is only changed by her; spine-lettering
  contrast rule and choices under *Choices made by the team*; group 1; handed to the UX designer.
- 2026-11-22 ux-designer: designed: the Spine colour row between Change cover… and Page edges
  (swatches 44 px on a phone and 36 px with a mouse, ✓ and a gold ring, a ★ Dominant caption, Back
  to automatic), the loading, failed and no-cover states, the turn to the spine on a tap, buttons
  with aria-pressed and plain colour names, and the exact wording; choices 11–17 added, and design
  checks added to *Done when*; handed to the developer.
- 2026-11-22 developer: built the Spine colour row (`SpineColourField`, `analyzePixels` palette,
  `automaticColour`, `colourName`, `inkFor` 3:1 fallback); 10 clusters and distance 36 picked, see
  *Build notes*. `pnpm test`: 82 files passed, 1 skipped; 646 tests passed, 9 skipped.
  `pnpm exec tsc --noEmit`: no errors. `pnpm run build`: built. `pnpm exec harness check`: tasks,
  decisions, engineers, generated files all ✓. 36 screenshots at 390 and 1280 on lavender and
  midnight, no console errors; draft PR #228; handed to the UX designer for review.
