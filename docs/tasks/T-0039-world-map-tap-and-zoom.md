---
id: T-0039
title: "Tap a country on the world map to see its covers in a card under the map, and zoom the map with + −, pinch, Ctrl+scroll and dragging"
description: "In Where your books are set, tapping a country (or its name in the list) opens an inline card under the map with that country's covers, each opening its book (a plain country says No books set here yet.), imaginary-land covers open their book too, and the map zooms with + − buttons, pinch, Ctrl+scroll and drag-to-pan when zoomed, while at zoom 1 the page scrolls as before; still no numbers in the block."
status: Doing
size: full
depends_on: [T-0018, T-0022]
decisions: [D-0013, D-0014, D-0020, D-0022, D-0026]
raised_on: 2026-11-23
done_on: ""
result: [https://github.com/SanderGeraedts/Hanna-s-Reading-List/pull/248]
---

# Goal

Part 1 of "a better world map", agreed by Hanna in a feature chat on 2026-11-22 (the travel
badges, part 2, are T-0040). Requester: Hanna. Night mode: she wasn't asked anything; the team's
picks are under *Choices made by the team*.

The dashboard block **Where your books are set** (`BooksWorldMapCard` in
`src/components/PictureBlocks.tsx`) shows lit countries filled with her covers (T-0018, D-0026),
the country names under the map (most books first, no counts) and the imaginary lands as rows of
tiny covers (T-0015). Today nothing in it can be tapped and the map is small on a phone. This task
makes it something she can explore.

## 1. Tap a country: a card under the map

- **Tapping a country on the map** (lit or plain), **or its name in the list under the map**,
  opens a card **inline, right under the map** (like the bingo suggestion card, `.bingo-suggest`
  in `DashboardMore.tsx`; not a pop-up or overlay, D-0013). It pushes the list and the lands down.
- **The card shows** the country's name and the covers of her finished books set there, in the
  map's tile order (`worldMap().countries`, `tileOrder`), with the spine-colour chip for a
  missing or broken cover (as `LandCover`). **Tapping a cover opens that book** (`onShowBook(id)`,
  as the cover wall does).
- **A plain country** (no books): its name and **"No books set here yet."**
- **Closing:** a × button on the card, tapping the same country (or name) again, or Escape.
  Tapping another country switches the card to that one. The chosen country is marked on the map
  (an outline in the gold accent, both wallpapers) while its card is open.
- **Imaginary lands:** their tiny covers become buttons too; tapping one opens the book. Lands
  get no card (they are already a row of covers).
- **Still no numbers anywhere in the block** (D-0026): not in the card, not "3 books", not in
  labels or the zoom controls' text. Titles where words are needed.

## 2. Zoom and pan

- **+ and − buttons** on the map, plus **⤢ show the whole map**, in the shelf's zoom-button style
  (`.zoom-controls` in `src/routes/index.tsx`): − and ⤢ disabled at zoom 1, + disabled at the
  maximum.
- **Pinch** with two fingers on a phone, **Ctrl+scroll** (and a trackpad pinch, which arrives as
  Ctrl+scroll) on the computer, zooming around the fingers / the pointer. The buttons zoom around
  the middle of what is shown.
- **Drag to pan** when zoomed in: mouse drag on the computer, one finger on the phone. The map
  never slides out of its frame (pan is clamped to the map's edges).
- **At zoom 1 the page scrolls normally**: a one-finger swipe over the map scrolls the page, a
  plain mouse wheel scrolls the page (only Ctrl+scroll zooms), and nothing pans. A one-finger drag
  pans only when zoomed in.
- **A tap is still a tap**: a press that moves less than a few pixels opens the country; a drag
  never opens a card.
- **Keyboard:** the zoom buttons are real buttons; when the map has focus and is zoomed in, the
  arrow keys pan it; the lit countries can be reached with Tab and opened with Enter or Space
  (plain countries by mouse and touch only, see choices); the names in the list are buttons; the
  card's covers and × are buttons; Escape closes the card. Visible focus everywhere (D-0020
  tokens).

# Done when

- **Component tests** (extend `src/components/BooksWorldMap.test.tsx`; its titles contain no
  digits, so a digit in the block's text is a count):
  - clicking a lit country's path opens a card under the map with the country's name and one
    button per book, named by its title, in tile order; clicking a cover button calls
    `onShowBook` with that book's id;
  - clicking a plain country shows its name and exactly "No books set here yet.";
  - clicking a name in the list opens the same card; clicking the country again, the ×, or
    pressing Escape closes it; clicking another country switches it;
  - a lit country is focusable and Enter opens its card;
  - an imaginary-land cover is a button and clicking it calls `onShowBook` with its id;
  - **no digit** in the block's text with a card open (lit and plain) and with the map zoomed in,
    and none in any `aria-label` or `title` inside the block;
  - + zooms in (the map's `viewBox` gets smaller), − and ⤢ are disabled at zoom 1 and bring it
    back; Ctrl+wheel zooms and calls `preventDefault`; a plain wheel does neither;
  - at zoom 1 an arrow key does not pan; zoomed in, an arrow key moves the `viewBox`.
- **Zoom maths in `src/lib/`** (a new small module, e.g. `src/lib/mapZoom.ts`, with
  `mapZoom.test.ts`): zooming around a point keeps that point under the pointer, the zoom stays
  between 1 and the maximum, and panning is clamped so the view never leaves the map (at zoom 1
  the view is always the whole map).
- **A Playwright script** in `docs/tasks/T-0039-screens/`, on a local dev server with no backend
  (never a production `POCKETBASE_URL`, G-0019), demo books with places in several countries and
  two imaginary lands, Dashboard with the world block, at 390 × 844 (touch emulation) and
  1280 × 800:
  - tapping a lit country opens the card, tapping a cover opens that book's panel; a plain country
    shows "No books set here yet."; a land cover opens its book;
  - **at zoom 1 a one-finger swipe over the map scrolls the page** (`scrollY` changes) and a plain
    wheel over the map scrolls the page; a two-finger pinch (CDP touch events) zooms the map;
    zoomed in, a one-finger drag pans it and does not scroll the page; a drag never opens a card;
  - Tab reaches the zoom buttons, the lit countries and the list names; Enter opens a card;
  - no console errors, no horizontal scroll of the page.
- **Screenshots** in `docs/tasks/T-0039-screens/`, lavender and midnight where it says `*`:
  `card-lit-390-*`, `card-lit-1280-*`, `card-plain-390-lavender`, `zoomed-390-*` (zoomed in and
  panned, controls visible), `zoomed-1280-lavender`, `focus-1280-lavender` (a focused country).
- **From the design** (checked in the component tests, the Playwright script or the screenshots):
  - the zoom buttons are 44 × 44 px, in a strip under the map inside its frame, `+ − ⤢` left to
    right, labelled `Zoom in`, `Zoom out`, `Show the whole map`; one press doubles or halves the zoom
    and the maximum is reached in three presses;
  - at zoom 1 on 390, a tap about 15 px outside the Netherlands' edge (on the sea) opens its card;
  - the chosen country has the thick gold mark (2.5 px over 5 px) on both wallpapers, a plain one
    with the gold wash too; a Tab-focused lit country has the dashed mark;
  - opening a card moves focus to its heading; × and Escape put focus back on the lit country or
    the name that opened it; the names have `aria-expanded`;
  - covers in the card and in the lands are at least 44 px wide, and each is a button named by its
    title only;
  - plain-country borders and gold outlines are as thin at 8× as at zoom 1.
- `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm run build` and `pnpm exec harness check` pass;
  `src/routeTree.gen.ts` is not committed.

# Notes

- **Read first:** T-0018 (covers in the countries, `CoverPattern`, the T-0018 screenshot script in
  `docs/tasks/T-0018-screens/`), T-0015 (lands, `placesOf`), T-0022 (the date-line fix in
  `loadWorld`), D-0026 (no numbers), D-0013 (no pop-ups: the card is inline), D-0032 and
  `BookshelfScene.tsx` lines ~460-600 (how the shelf already does pinch and Ctrl+scroll, and why
  a one-finger swipe scrolls the page at zoom 1).
- **Files:** `src/components/PictureBlocks.tsx` (`BooksWorldMapCard`), `src/components/Dashboard.tsx`
  (pass `onShowBook` to the world block, as `CoverWallCard` gets it), `src/styles.css`
  (`.world-*`), the new `src/lib/mapZoom.ts` + test, `src/components/BooksWorldMap.test.tsx`.
- **Hints for the developer, not rules:** zoom by changing the SVG `viewBox` (the cover patterns
  use map units, so they scale with it); `touch-action: pan-x pan-y` on the map at zoom 1 lets the
  page scroll while a pinch still reaches the map, `touch-action: none` while zoomed in; Ctrl+wheel
  needs a non-passive `wheel` listener. The `<svg>` now holds buttons, so it is no longer a plain
  `role="img"`; keep a short label naming the countries (no counts).
- **Group 1** (guardrails): app code only, nothing about saving books, no code-owned path, no new
  package.
- **Size: full.** A new way of using a dashboard block (tapping, a card, zoom and pan gestures);
  the UX designer designs the card, the selected-country mark and the zoom controls' place on the
  map before it is built.
- **No new decision.** The card follows D-0013 and D-0026; zoom is local to the block and not
  remembered.
- **Not doing:** numbers in the block; remembering the zoom between visits; zooming in on a
  country by itself when it's tapped; a card for imaginary lands; more names in the list under the
  map than today.

## Choices made by the team

Hanna wasn't asked anything (night mode). The architect took these:

1. **Tapping a country doesn't zoom by itself**: the card opens under the map and the view stays
   where she put it. Fewer surprises, and the zoom stays hers.
2. **Only the lit countries are Tab stops** (about as many as she has countries with books), not
   all 175: Tabbing through every plain country would make the block hard to pass with the
   keyboard. Plain countries open by mouse and touch.
3. **The zoom isn't remembered**: leaving the dashboard and coming back shows the whole map again.
4. **Maximum zoom about 8×**: enough to tap small European countries comfortably on a phone; the
   designer may adjust it.
5. **The card shows covers only**, titles in their labels and hover text, like the imaginary lands,
   so the card doesn't need numbers or long lists of words.

## Questions to re-ask Hanna in the morning

1. "When you tap a country, the card with its covers opens under the map, but the map doesn't zoom
   in on that country by itself. Would you like it to?"
2. (UX designer) "The + − buttons sit in a thin strip just under the map instead of floating on it,
   so they never hide New Zealand or South America. Is that alright, or would you rather have them
   on the map itself?"
3. (UX designer) "To make them easy to tap, the little covers of your imaginary lands get a bit
   bigger, the same size as the covers in the country card. Do you like that, or were they nicer
   small?"

# Design

Everything stays inside the existing card `.dash-card.world-card`, title unchanged ("Where your
books are set"). From top to bottom: **the map frame** (the map, and under it a strip with the zoom
buttons), **the country card** when one is chosen, the list of names, the imaginary lands, then at
most one muted line (as T-0018). Tokens only (D-0020), no hint text (D-0014), **no number anywhere**
(D-0026). This design replaces T-0018's "no hover effect" and "covers are not buttons".

## The map frame

The frame is today's `.world-map` box (ocean tint `rgba(120, 160, 200, 0.12)`, `--radius-small`,
`--space-2` above and below), now a `div.world-map-frame` around two things:

1. **The map** (`<svg>`, `viewBox` starts at `0 0 360 142`, `width: 100%`, `height: auto`),
   `overflow: hidden` inside the frame's rounded corners. Zoom changes only the `viewBox`, so the
   frame never changes size and the page never jumps.
2. **The zoom strip** under the map, inside the same ocean-tinted frame: `display: flex;
   justify-content: flex-end; gap: var(--space-2); padding: var(--space-1) var(--space-2)
   var(--space-2)`. It holds the three buttons, right-aligned.

**Why a strip and not floating over the map:** on a phone the map is only about 334 × 132 px. Three
44 px buttons don't fit as a column in 132 px, and a row over any corner hides land: bottom right
hides New Zealand and Australia, bottom left South America, top left Alaska and Canada. In the
strip they hide nothing, still read as part of the map (same tint, same frame), and sit in the
same place on the phone and the computer. The strip adds 56 px of height (44 + `--space-1` +
`--space-2`).

## The zoom buttons

- **Look:** the shelf's zoom buttons exactly. Reuse the `.zoom-controls .btn` rules (light
  `rgba(255, 255, 255, 0.78)` button, `--pill-ink` glyph, `#fff` on hover, `var(--tap)` × `var(--tap)`
  = **44 × 44 px**, `--fs-large` glyph, round), by adding the strip's class to those selectors, not
  by copying the values. Not `position: absolute` (that part of `.zoom-controls` stays the shelf's).
- **Order, left to right:** `+`, `−`, `⤢`. Wrapped in `div role="group" aria-label="Zoom"`.

| Button | `aria-label` | `title` (hover) | Disabled when |
|---|---|---|---|
| `+` | `Zoom in` | `Zoom in (Ctrl + scroll)` | at the maximum |
| `−` | `Zoom out` | `Zoom out` | at zoom 1 |
| `⤢` | `Show the whole map` | `Show the whole map` | at zoom 1 |

- Disabled buttons use the existing `.btn:disabled` look (dimmed) and are skipped by Tab.
- **One press doubles or halves the zoom**, around the middle of what is shown: zoom 1, 2, 4, 8.
  Three presses to the maximum on a small map; the shelf's 1.4 step would need seven.
- **Maximum zoom 8×** (the architect's number, kept): the Netherlands, about 6 px wide on a phone at
  zoom 1, is about 48 px at 8×, and a cover tile grows from 7 × 11 px to 56 × 88 px, so the covers
  inside the countries become recognisable.
- A button press **animates** the `viewBox` over 150 ms (ease-out); with
  `prefers-reduced-motion: reduce` it jumps. Pinch, Ctrl+scroll and dragging follow the fingers
  directly, never animated, no glide after letting go.
- No zoom level is shown anywhere (no "2×", no percentage).

## Zooming and what stays the same size

- The **cover tiles** scale with the map (they are in map units): zooming in makes the covers bigger.
  That is the point of zooming.
- **Lines stay the same width on screen:** the gold outlines already use
  `vector-effect: non-scaling-stroke`; give the plain countries' border the same, at **0.3 px**
  (about what 0.25 map units is today at zoom 1), so borders don't turn into thick lines at 8×.
- **Pan is clamped:** the shown part never leaves the map; at zoom 1 it is always the whole map.

## On the phone (touch)

| What she does | Zoom 1 | Zoomed in |
|---|---|---|
| One finger swipes over the map | **the page scrolls**, the map doesn't move | the map pans with the finger; the page doesn't scroll |
| Two fingers pinch | the map zooms around the point between the fingers | same |
| Taps a country (finger moves less than 6 px) | the card opens | same |
| Swipes or pinches | never opens a card | same |

- `touch-action: pan-x pan-y` on the map at zoom 1 (the page scrolls, a pinch reaches the map),
  `touch-action: none` when zoomed in. The 6 px is the shelf's own threshold (`BookshelfScene`).
- Zoomed in, the page still scrolls by swiping anywhere outside the map (the map is only 132 px of
  an 844 px screen), and `⤢` brings the page-scrolling map back.
- A second finger that lands during a one-finger press turns it into a pinch: no tap, no card.
- **Pinching out below zoom 1** stops at 1 (no smaller map, no bounce).

## On the computer (mouse and trackpad)

- **Plain mouse wheel or two-finger trackpad scroll over the map: the page scrolls,** zoomed in or
  not. Only **Ctrl+scroll** (and a trackpad pinch, which arrives as Ctrl+scroll) zooms, around the
  pointer; the page then doesn't scroll and the browser doesn't zoom the page.
- **Drag** with the left button pans when zoomed in. At zoom 1 a drag does nothing.
- **Cursor:** `pointer` over a country at zoom 1; zoomed in `grab` over the map and `grabbing`
  while dragging (a click on a country still opens it).
- **Hover** (`@media (hover: hover)` only): a plain country lightens to `fill: var(--border-strong)`;
  a lit country keeps its covers (its hover text, name and titles, stays as T-0018). Nothing else.

## Telling a tap from a pan

- A press is a **tap** when the pointer (or finger) moves **less than 6 px** on screen between down
  and up, with no second finger, and the browser didn't take it over for scrolling
  (`pointercancel`). Only a tap chooses a country. No time limit: a slow tap is still a tap.
- From the first move past 6 px it is a **drag**: it pans (zoomed in) or scrolls the page (zoom 1,
  touch), and when it ends nothing opens.
- A tap on the sea (no country, no tap zone, below) does nothing: it doesn't close the card.

## Tap targets for tiny countries

At zoom 1 many lit countries are a few pixels wide (the Netherlands about 6 px on a phone, Luxembourg
about 1 px). Every lit country gets a **tap zone of at least 44 × 44 px on screen**:

- For each lit country whose drawn box is **smaller than 44 px** in width or height at the current
  zoom, an invisible copy of its shape with a **transparent 44 px stroke**
  (`vector-effect: non-scaling-stroke; pointer-events: stroke`) is drawn above all the countries.
  The zone then reaches 22 px beyond its edge, whatever the zoom. Recomputed when the zoom changes,
  so it shrinks away as the country grows: at 8× the Netherlands is big enough and has none.
- Larger lit countries need no zone (their own shape is the target), so a lit USA never steals a tap
  meant for Canada.
- **Overlapping zones:** the smaller country is drawn last and wins (draw zones largest first).
- **Plain countries get no zone:** at zoom 1 Belgium is a sliver next to a zoned Netherlands; she
  zooms in to tap Belgium. Plain countries matter less, and a zone around every tiny plain country
  would cover the lit ones.
- The zones are pointer targets only: `aria-hidden`, not focusable, no hover text of their own (a
  tap on one acts exactly as a tap on the country).

## The selected country

While a country's card is open, it is marked on the map, drawn in its own group **above everything**
(lit outlines and tap zones included), `pointer-events: none`, `non-scaling-stroke`, round joins:

1. underneath: `stroke: var(--bg)`, **5 px** (dark edge);
2. on top: `stroke: var(--accent)`, **2.5 px**, solid.

That is twice the 1.25 / 2.5 px of every lit country's outline, so it is the one that stands out.
A **plain** chosen country also gets `fill: var(--accent-soft)` (the gold wash used for "chosen"
elsewhere), so the whole shape shows, not only its edge. A lit one keeps its covers.

**Both wallpapers:** the map sits on the walnut card, which is the same `--surface` on lavender and
midnight, so the mark is identical on both and needs no new contrast pair (`--accent` already passes
3:1 on a card in `colours.test.ts`). Screenshots on both confirm it.

## The country card

Inline, **right under the map frame** and above the list of names (D-0013: no pop-up), pushing the
list and lands down. It looks and behaves like the bingo suggestion card:

- **Box:** the `.bingo-suggest` look: `--surface-sunken`, 1 px `--accent-line` border,
  `--radius-card`, padding `--space-3`, `display: grid; gap: var(--space-3)`, `position: relative`.
  Reuse those rules (add the new class to them, or generalise the class), don't copy. Margin-top 0
  (the frame already has `--space-2` below it); `--space-3` below it, before the list.
- **Heading:** an `h3` with the country's name as the map knows it ("United States of America"),
  `--serif`, `--fs-body`, 600, `--text`, wrapping with `overflow-wrap: anywhere`; right padding
  leaves room for ×, as `.bingo-suggest-top`. `tabIndex={-1}` so focus can land on it.
- **Lit country: the covers,** one button per finished book set there, in tile order (as the
  map's pattern), all of them, never "and more":
  - a `ul`, `display: flex; flex-wrap: wrap; gap: var(--space-2)`, no bullets;
  - each cover **3 × 4.5 rem (48 × 72 px)**, `border-radius: var(--radius-small)`,
    `object-fit: cover`, spine colour behind it while it loads; a missing or broken cover is a
    `cover-chip` in `book.color`, same size (as `LandCover`);
  - about **5 per line at 390** and **8 per line at 1280**; more books wrap onto more lines (a
    country with twenty books is four lines on the phone);
  - cover size `size=M`, `loading="lazy"`.
- **Plain country:** under the heading, `No books set here yet.` in `muted` (as the bingo card's
  "No book on your shelf fits this one yet."). No covers.
- **×:** `btn icon small` top right (as `.bingo-suggest-close`), `aria-label="Close"`, 44 × 44 px on
  a touch screen (`pointer: coarse`) as the bingo card's ×. Last in Tab order, drawn top right.
- No title text, no authors, no "books", nothing else in the card.

**What opens, switches and closes it**

| Action | Result |
|---|---|
| Tap (or click) a country, lit or plain, or its name in the list | card opens for that country, the country is marked |
| Tap the chosen country or its name again | card closes, mark goes |
| Tap another country or name | the card switches in place (no close-and-open flicker) |
| × | card closes |
| Escape, with focus anywhere in the block | card closes |
| Tap a cover in the card | that book's panel opens (`onShowBook(id)`); the card stays open behind it |
| Tap the sea, drag, pinch, zoom | nothing changes in the card |

- **Opening or switching** moves focus to the card's heading (`preventScroll`) and scrolls the
  card into view only if it is off-screen (`scrollIntoView({ block: 'nearest' })`, smooth, or
  instant with reduced motion), exactly as the bingo card. On the phone, tapping a country near the
  bottom of the screen scrolls just enough to show the card.
- **Closing** (× or Escape, or Enter on the same country) puts focus back where it came from: the
  lit country, or the name in the list. Opened by a tap on a plain country (which can't take focus),
  focus goes to the block's title (`#world-title`, `tabIndex={-1}`, no visible ring on mouse use,
  as `#bingo-title`).
- Tapping a country doesn't zoom or pan the map (team choice 1). A chosen country panned out of
  view stays chosen; the card stays.
- If the chosen country loses its last book while open, the card shows "No books set here yet."

## The list of names

Each name under the map becomes a `button` that opens the same card, styled to read as today's
names: no background, no border, `font: inherit`, `--fs-body`, `--text`, left-aligned, wrapping,
`min-height: var(--tap)` on a touch screen (`pointer: coarse`, so the rows are 44 px apart there),
focus ring as `.btn:focus-visible` (2 px `--accent`, 2 px offset). The chosen country's name is
`--accent` and weight 600. Each has `aria-expanded` (true for the chosen one) and `aria-controls`
the card's id.

## Imaginary lands

Their covers become buttons (`aria-label` = the book's title, `title` = the title) that open the
book. **Their size goes up to the card's 3 × 4.5 rem (48 × 72 px)** so every cover is a 44 px tap
target: take `.world-land-books` out of the shared rule with `.own-challenge-books` (which stays
2.2 × 3.3 rem) and add it to the card's cover rule. About 5 per line on the phone, 8 on the
computer. No card, no chosen state.

## Keyboard

Tab order inside the block, top to bottom:

1. **The map itself**, only while zoomed in (`tabIndex` 0 then, otherwise none), so arrow keys
   have somewhere to go even when no country is lit;
2. **the lit countries**, in the map's own (alphabetical) order. Each is `role="button"`,
   `tabIndex={0}`, `aria-label` = its name, `aria-expanded`, `aria-controls` the card. Plain
   countries are not Tab stops (team choice 2);
3. **the zoom buttons** that aren't disabled;
4. **the card**, when open: its covers, then ×;
5. **the names in the list**;
6. **the imaginary-land covers**.

| Key | Where focus is | What happens |
|---|---|---|
| Enter or Space | a lit country, a name | opens its card (or closes it, when it's the chosen one) |
| Enter or Space | a cover (card or land) | opens the book |
| Escape | anywhere in the block, card open | closes the card, focus back to what opened it |
| `+` or `=` | the map, a country or a zoom button | zoom in, around the middle |
| `−` or `-` | same | zoom out, around the middle |
| Arrow keys | the map or a country, **zoomed in** | pan by a fifth of what is shown, clamped; `preventDefault` |
| Arrow keys | at zoom 1 | nothing: the page scrolls as usual |

**Focus on a country** (an SVG path can't take a CSS outline reliably): the focused lit country gets
the selected mark's two strokes, but the gold one **dashed** (`stroke-dasharray: 4 3`, screen
pixels), drawn in the top group. Solid gold means chosen, dashed gold means focused; when it is
both, solid. Shown on `:focus-visible` only (keyboard), not after a mouse click. Every other control
uses the existing 2 px `--accent` ring (D-0020).

## What a screen reader hears

- **The map:** no longer `role="img"`: `role="group"` with today's label, `World map of where your
  books are set: United Kingdom, France, Greece` (or `World map` when nothing is lit). Countries
  inside: "United Kingdom, button, collapsed".
- **Zoom:** "Zoom, group. Zoom in, button. Zoom out, button, dimmed. Show the whole map, button,
  dimmed." No live announcement when the zoom changes.
- **Opening a card:** focus lands on the heading, so it reads "United Kingdom, heading level 3".
  Then Tab: "Pride and Prejudice, button", "Jane Eyre, button", … "Close, button". The card is a
  `section aria-labelledby` its heading. A plain country: "Belgium, heading level 3", then "No books
  set here yet."
- **The list:** "United Kingdom, button, expanded" for the chosen one.
- **Land covers:** "Hogwarts, list" (as today), then each "{title}, button".
- **Cover images inside buttons** have `alt=""` (the button carries the title), so nothing is read
  twice. A chip inside a button loses its `role="img"` and `aria-label` for the same reason.
- The tap zones and the outline groups are `aria-hidden`.

## No numbers

No digit anywhere in the block's text, `aria-label`s or `title`s: not in the card (no "3 books"),
not on the zoom buttons (glyphs `+ − ⤢`, words "Zoom in", "Zoom out", "Show the whole map"), no zoom
level, no "and more". Only a book's own title may contain a digit (a book called "1984").

## Exact words (English, as the app)

- Plain country card: `No books set here yet.`
- ×: `Close`
- Zoom group: `Zoom`; buttons `Zoom in` (hover `Zoom in (Ctrl + scroll)`), `Zoom out`,
  `Show the whole map`
- Map: `World map of where your books are set: {countries}` or `World map` (unchanged)
- Everything else unchanged from T-0018.

## Layouts

**Phone, 390 × 844** (card padding 1rem, map about 334 px wide):

```
┌ Where your books are set ───────────────┐
│ ┌─────────────────────────────────────┐ │
│ │   [map 334 × 132, covers, gold]     │ │  ← chosen country: thick gold, others thin
│ │                                     │ │
│ │                     ( + )( − )( ⤢ ) │ │  ← strip, 44 px buttons, right-aligned
│ └─────────────────────────────────────┘ │
│ ┌ United Kingdom ──────────────── (×) ┐ │  ← the card
│ │ [▯][▯][▯][▯][▯]                     │ │  ← 48 × 72 covers, 5 a line
│ │ [▯][▯]                              │ │
│ └─────────────────────────────────────┘ │
│ United Kingdom (gold)   France          │  ← names, 2 columns, 44 px rows
│ Greece                  Japan           │
│ 🗺️ Imaginary lands                      │
│ Hogwarts                                │
│ [▯][▯][▯][▯][▯]                         │
└─────────────────────────────────────────┘
```

**Computer, 1280 × 800** (one of two dashboard columns, map about 486 px wide, 192 px tall):
the same stack; the card holds about 8 covers a line, the names 3 columns, the land rows about
8 covers a line. The strip's buttons sit at the right under the map, same as the phone.

**Wallpapers:** everything here sits on the walnut card, so lavender and midnight differ only in
the wallpaper around the card; the map, the card, the gold marks and the buttons look the same.
Both are screenshotted to prove it.

## Screenshots (in `docs/tasks/T-0039-screens/`)

Those in *Done when*, plus three:

| File | Shows |
|---|---|
| `card-lit-390-lavender`, `card-lit-390-midnight` | a lit country chosen at zoom 1: thick gold mark, card with covers wrapping onto a second line |
| `card-lit-1280-lavender`, `card-lit-1280-midnight` | the same at 1280 |
| `card-plain-390-lavender` | a plain country chosen: gold wash and mark, "No books set here yet." |
| `zoomed-390-lavender`, `zoomed-390-midnight` | zoomed in and panned over Europe, covers big in the countries, borders thin, all three buttons enabled |
| `zoomed-1280-lavender` | the same at 1280 |
| `focus-1280-lavender` | a lit country focused by Tab: dashed gold mark |
| `tiny-390-lavender` (new) | the Netherlands chosen at zoom 1 by a tap about 15 px off its edge |
| `controls-390-lavender` (new) | zoom 1: the strip with `−` and `⤢` dimmed |
| `lands-focus-390-lavender` (new) | the bigger land covers, one focused with the gold ring |

## Review after building (2026-11-23)

**Verdict: matches the design. Nothing must be fixed before the tester.** Looked at
`git diff origin/main...HEAD -- src`, all 13 screenshots (the chosen and focused marks also
enlarged, since the UK and the Netherlands are only a few pixels at zoom 1),
`screens-output.txt` (88 ok, 0 FAIL) and the component tests.

**What matches, state by state**

- **Map frame and strip:** the ocean-tinted frame holds the map and, under it, the strip with
  `+ − ⤢` right-aligned, 44 × 44, the shelf's light buttons (the strip's class added to the
  `.zoom-controls .btn` rules, not copied). At zoom 1 `−` and `⤢` are dimmed
  (`controls-390-lavender`); zoomed in all three are enabled (`zoomed-*`). Labels, hover text and
  the `Zoom` group as designed. Nothing on the map is hidden by the buttons.
- **Zoom:** ×2 a press, the maximum (8×) in three presses, the buttons glide 150 ms and jump with
  reduced motion; pinch and Ctrl+scroll follow the fingers / pointer and keep the point under them;
  pan is clamped; the frame never changes size. Plain borders 0.3 px and the gold outlines stay thin
  at 8× (`zoomed-390-*`, `zoomed-1280-lavender`: covers big in the countries, lines thin).
- **Touch and mouse:** at zoom 1 a one-finger swipe and a plain wheel scroll the page; a pinch
  zooms without zooming the page; zoomed in a drag pans and doesn't scroll; no drag or pinch ever
  opens a card; 6 px threshold; `grab` / `grabbing` cursors; the hover lightening is plain
  countries only, under `(hover: hover)`.
- **Card:** inline right under the frame, the bingo card's own rules reused; serif heading,
  × top right and last in Tab order; 48 × 72 covers in tile order, five a line at 390 (seven books
  wrap onto a second line, `card-lit-390-*`), one line with room for eight at 1280
  (`card-lit-1280-*`); the missing cover is a spine-colour chip of the same size. A plain country
  shows only its name and "No books set here yet." (`card-plain-390-lavender`). No title text,
  no count, nothing else.
- **Marks:** the chosen country has the solid gold over the dark edge (enlarged: the UK and, in
  `tiny-390-lavender`, the Netherlands read as a gold shape with a dark rim); Brazil also has the
  gold wash; the Tab-focused UK in `focus-1280-lavender` shows the dashed mark. Identical on
  lavender and midnight.
- **Names and lands:** the names are buttons that still read as names, the chosen one gold and
  600, 44 px rows on touch, `aria-expanded`. The land covers are 48 × 72 buttons named by title,
  with the gold focus ring (`lands-focus-390-lavender`).
- **Keyboard and screen reader:** Tab order map (zoomed only), lit countries alphabetically,
  zoom buttons, card, names, land covers, as designed and as the 1280 run lists it. Enter/Space,
  `+`/`−`, arrows only when zoomed, Escape from anywhere in the block; focus to the card's heading
  on open and back to the country or name on close, to the block title after a plain-country tap.
  Map `role="group"` with the unchanged label, images inside buttons `alt=""`, zones and marks
  `aria-hidden`.
- **No numbers:** none in text, labels or titles with a card open (lit, plain) or zoomed in.

**The developer's deviations**

1. **A tap zone doesn't take a tap that lands on another lit country's own shape** (tapping in the
   UK no longer opens the Netherlands). **Accepted, and it becomes part of the design.** It is
   what the zones were for: a country's own shape is always its target, and a zone only lends a
   tiny country the sea and the plain land around it. The Netherlands still opens from about 15 px
   off its edge over the sea (`tiny-390-lavender`), and a lit country next to it (the UK, Germany)
   opens where the finger actually is. The cost: at zoom 1 a tiny lit country walled in by lit
   neighbours has less to tap; she zooms in (as for Belgium), uses its name, or Tabs to it. Covered
   by a component test; the 390 and 1280 runs tap the UK at zoom 1 and get the UK.
2. **The Playwright script checks the scroll on `.dashboard` (`scrollTop`) as well as `scrollY`.**
   Accepted: the dashboard is the page's scroller, so that is what "the page scrolls" means for
   her. No visible difference.
3. **Two console messages are filtered out** (Open Library cover 404s, where the spine colour shows
   as T-0018 designed, and the dev server's missing `favicon.ico`). Accepted: neither comes from
   this block's behaviour.
4. **T-0018's tests now find the map as a `group` and the land covers as buttons named by title.**
   Accepted: that is what this design asked for; what they check is otherwise unchanged.

**Small differences, not to be fixed now**

- Closing a card by tapping the same *plain* country again leaves focus on the page, not the block
  title. The design only promised a focus target for ×, Escape and Enter; a mouse or finger user
  doesn't see focus.
- `controls-390-lavender` was taken before the covers loaded, so the countries show their spine
  colours. That is the designed loading state, just an earlier moment than the other shots.
- At zoom 1 the chosen UK or Netherlands is almost all gold mark and its covers can't be seen;
  expected for a country a few pixels wide, and zooming in shows them.

**Design checks** (from *Done when*)

- [x] zoom buttons 44 × 44, in a strip under the map inside its frame, `+ − ⤢`, labelled
  `Zoom in`, `Zoom out`, `Show the whole map`; ×2 a press, maximum in three presses
- [x] at zoom 1 on 390, a tap about 15 px off the Netherlands (on the sea) opens its card
- [x] chosen country: 2.5 px gold over 5 px, both wallpapers; plain one with the gold wash;
  Tab-focused lit country dashed
- [x] opening moves focus to the heading; × and Escape put it back on the country or name; names
  have `aria-expanded`
- [x] covers in the card and the lands at least 44 px wide (48), each a button named by its title
  only
- [x] plain borders and gold outlines as thin at 8× as at zoom 1

Questions 2 and 3 for Hanna (strip placement, bigger land covers) stay open for the morning; the
build doesn't change them. Handed to the **tester**.

# Build notes

- **Zoom maths:** `src/lib/mapZoom.ts` (`zoomAround`, `panView`, `clampView`, `between`,
  `MAP_ZOOM_MAX` 8, `MAP_ZOOM_STEP` 2), with `mapZoom.test.ts`. The view is the svg's `viewBox`
  and always keeps the map's 360 × 142 shape, so the picture never changes size.
- **`BooksWorldMapCard`** (`PictureBlocks.tsx`): `onShowBook` is now a prop (passed from
  `Dashboard.tsx`). The map sits in `div.world-map-frame` with the zoom strip (`.world-zoom`,
  `role="group" aria-label="Zoom"`) under it. The `<svg>` is `role="group"` with the same label,
  `tabIndex` 0 only when zoomed in, `touch-action: pan-x pan-y` at zoom 1 and `none` when zoomed.
  Lit countries are drawn after the plain ones, in alphabetical order (their Tab order), as
  `role="button"` paths with `aria-expanded`/`aria-controls`. The plain countries and the cover
  patterns are memoised, so zooming only redraws the `viewBox`, the zones and the marks.
- **Gestures:** native listeners on the svg (non-passive `wheel`; `pointerdown` on the svg,
  `pointermove`/`pointerup`/`pointercancel` on the window). The 6 px threshold, a second finger
  makes a pinch, and both set a flag so the click that may follow isn't a tap. A country opens on
  `click` (delegated through `data-country`), so a tap, a click and a test's `fireEvent.click` go the
  same way. The buttons glide over 150 ms (ease-out, `requestAnimationFrame`) and jump with reduced
  motion. Pinch, Ctrl+scroll, drags and arrow keys follow directly.
- **Tap zones:** the lit countries whose bounding box is under 44 px on screen (box in map units ×
  the svg's measured width / `view.w`, measured with a `ResizeObserver`) get a `.world-zone` copy
  with a transparent 44 px non-scaling stroke, largest first.
- **Card:** `section.bingo-suggest.world-pick` reuses the bingo card's rules (and its
  `.bingo-suggest-top`, `.bingo-suggest-close`) instead of copying them. `.world-pick` only resets
  the margin and wraps the heading. Covers are `CoverButton`s (`button.world-cover`, `alt=""`
  image or a role-less chip, 3 × 4.5 rem), used in the card and in the lands.
  `.world-land-books` left the shared rule with `.own-challenge-books`.
- **CSS:** `.world-zoom .btn` was added to the shelf's `.zoom-controls .btn` selectors (colour,
  hover, 44 px size). Plain borders are `0.3px` with `vector-effect: non-scaling-stroke`. The mark
  is `.world-marks` (`.world-mark-edge` 5 px `--bg`, `.world-mark` 2.5 px `--accent`, `.focus`
  dashed `4 3`, `.plain` with the `--accent-soft` fill).
- **Earlier tests changed by the design:** T-0018's tests looked for the map as `role="img"` and
  the land covers as images. They now look for the map as `group` and the covers as buttons
  named by title. What they check is unchanged otherwise.
- **Developer's call, for the UX designer to review:** a tap zone never takes a tap that lands on
  another *lit* country's own shape. At zoom 1 the Netherlands' 22 px zone covers the east of the
  United Kingdom (and at 4× part of Germany), so with zones on top a tap in the middle of the UK
  opened the Netherlands. This follows the design's "a lit USA never steals a tap meant for
  Canada". Over the sea or a plain country, the zone still wins (the Netherlands from 15 px off
  its edge, Belgium only when zoomed in). Covered by a component test.
- **Send-back F1 (tap zones by main landmass):** each country's largest piece (shoelace area of its
  outer rings) decides whether it is "tiny" and is what its zone is drawn around (`main` in
  `CountryShape`). France is now judged as mainland France (11.7 × 8.1 px at 390, so it gets a
  zone; before, French Guiana made it 59 × 45). The USA is judged without Alaska (53 × 22 px, zone
  around the mainland), Norway without Svalbard, Denmark by Jutland.
- **Developer's call on overlapping zones, for the UX designer to review:** the design's "the
  smaller country is drawn last and wins" let the Netherlands take every tap near France (its zone
  reaches about 14 px past Brittany). The new rule: a lit country's own shape under the finger wins.
  Otherwise, where zones overlap, the country whose coast is within **8 px** and nearest wins
  (`nearestCoast`, sampled along the zones' paths). Further out at sea, the topmost zone, the
  smallest country, still wins. Measured at 390 (`screens-output.txt`): the Netherlands still opens
  from 15 px north, the UK at zoom 1 opens the UK, and with only France and the Netherlands lit, a
  tap 6 px west of mainland France (Bay of Biscay or Brittany) opens France.
  **Deviation from the send-back's wording:** on the demo shelf, the UK, Spain, Italy and Germany
  are lit too and lie within 6 px of mainland France on every side. Of 216 non-lit points 6 px from
  France's outline, France is the nearest lit coast at only 4. A tap 6 px west of France there opens
  Spain or the UK, whichever coast is nearer (0.5 to 2.5 px nearer), never the Netherlands. To
  open France from those spots, a rule would have to take taps from a nearer neighbour.
- **Send-back, focus at the zoom limits:** a press that takes the view to 8× moves focus from + to
  −. One that takes it to 1× moves focus from −, ⤢ or the map itself (which stops being a Tab stop)
  to +. The buttons stay truly `disabled`, as the design says.
- **Send-back, the one/two-column width:** the dashboard puts the block in a different column, so
  React remounts it. The open card is handed from the old block to the new one within the same
  commit (a module variable, cleared in a microtask). A later visit still starts closed. The zoom
  isn't carried over (team choice 3).
- **The Playwright script** (`docs/tasks/T-0039-screens/screens.mjs`, output in
  `screens-output.txt`): 101 checks after the send-back (88 before), all passing, on `vite dev --port 3155` with no backend. The
  phone context uses touch emulation and real CDP touch events (`Input.dispatchTouchEvent`) for
  the tap, the swipe, the pinch and the drag. The page scrolls in `.dashboard` (its `scrollTop`),
  not on `window`, so the script checks both `scrollY` and `.dashboard` `scrollTop`. Two console
  messages are filtered out as not this block's: 404s from `/api/cover/` (covers Open Library
  doesn't have; the spine colour shows, T-0018) and the dev server's missing `favicon.ico`.

# Test

(Tester, 2026-11-23, night mode, Hanna not asked. G-0031: I read CI's run instead of repeating it,
ran the new and affected tests again, then tried to break the change on the dev server.)

**Verdict: sent back to the developer.** One designed behaviour fails (F1 below). Everything else
held up. The pull request stays a draft.

**CI** (`gh pr checks 248`, run 45096647175, head `812ee5c`): `checks / checks` passed in 59 s on
**attempt 1** (no re-run). *Test Files 98 passed | 1 skipped (99)*, `✓ tasks` and both builds
(`✓ built`) in the log, no retried test. `checks / shards` and `checks / e2e` are skipped by the
harness workflow, the same as on every PR here. The Netlify deploy preview is ready.

**Local, from clean:** `pnpm install --frozen-lockfile` (done), `pnpm exec tsc --noEmit` (clean),
`pnpm exec harness check` (✓ tasks, ✓ decisions, ✓ engineers, ✓ generated files). The new and
affected tests (`vitest run BooksWorldMap.test.tsx mapZoom.test.ts Dashboard`) ran three times:
**38 passed (38)** each time.

**Tried to break it** on `vite dev --port 3156` with no `POCKETBASE_URL` and no backend, the demo
shelf from `screens.mjs`, and playwright-core with Chrome. The phone runs used 390 × 844 with touch
emulation and real CDP touch events, the computer runs 1280 × 800. The scripts are scratch files
and are not committed. 58 phone checks and 50 computer checks passed, apart from F1. No console
errors and no horizontal scroll in any run.

| Area | What I tried | Result |
|---|---|---|
| **F1 tap zones** | Lit countries' boxes against their tap zones at 390, zoom 1 | **FAIL.** France gets **no tap zone**: its box is 59 × 45 px because it includes French Guiana, but mainland France is only **11.7 × 8.1 px**. The sea next to mainland France is covered by its neighbours' zones, so a tap 3–8 px west of France (Bay of Biscay) **opens the Netherlands** (`elementsFromPoint` there: Netherlands, Germany, UK, Spain and Italy zones, then the svg). The design says "every lit country gets a tap zone of at least 44 × 44 px". The USA has no zone for the same reason (Alaska), but the mainland is 53 × 22 px, so that matters less. |
| Tap vs pan, touch, zoom 1 | Finger moves 0 / 3 / 5 / 5.9 px, then 6.5 / 8 / 12 / 20 px; held for 1.2 s; out 15 px and back | 0 to 5.9 px opens; 6.5 px and more opens nothing; a slow tap is still a tap; out and back is a drag ✓ |
| Tap vs pan, touch, zoom 2 | 4 / 5.5 px, then 7 / 10 px | Under 6 px: a tap with no pan. 7 and 10 px: pans (y 35.5 → 31.7 → 26.3), no card, the page doesn't scroll ✓ |
| Tap vs pan, mouse | 3 / 5.5 / 6.5 / 10 px at zoom 1 and 2 (India) | Under 6 px opens with no pan. Over 6 px: nothing at zoom 1, pans at zoom 2. Cursor `grabbing` while dragging, even off the map, then `grab`. A right-button drag doesn't pan ✓ |
| Pinch with a finger lifted | Pinch, lift finger 2, move finger 1 40 px; lift finger 1 first; finger 2 lands and lifts without moving | No card in any case. The remaining finger doesn't move or jump the map (viewBox unchanged). The next plain tap opens a card. A fresh one-finger drag pans ✓ |
| Pinch limits | Pinch in hard at 2×; pinch out at 8× | Stops at `0 0 360 142` and touch-action is `pan-x pan-y` again; stays at 8× (w 45.000) ✓ |
| 8× and the edges | + three times, then 14 swipes to each edge | 45 × 17.75 units; + disabled; x stops at 315.000 and 0, y at 124.250 and 0; the zoom never changes while dragging. − at the corner gives 4×, still inside the map. At 8× only Romania and the Netherlands keep zones ✓ |
| Ctrl+scroll vs wheel | Plain wheel at zoom 1 and zoomed; Ctrl+wheel; 40 Ctrl+wheels at the corner; a line-mode 1e9 delta; a sideways wheel; Ctrl+wheel over the zoom strip | Plain wheel scrolls the page (4050 → 4350) and leaves the map alone. Ctrl+wheel zooms, the page doesn't scroll, and the point under the pointer stays within 0.75 px. 41/41 `preventDefault`; stops at 8× inside the map; the huge zoom-out lands exactly on the whole map; the sideways wheel does nothing; the strip is left to the browser ✓ |
| Page scroll at zoom 1, phone | Swipe up starting on a lit country, a plain country, the Netherlands' zone, a land cover; again after ⤢ | The page scrolls about 320 px each time, with no card and no book opened. Zoomed in, the same swipe pans and doesn't scroll. After ⤢ it scrolls again ✓ |
| Keyboard | Tab through the block; Enter and Space; Escape from a name and from a card cover; `+ = - −`; arrows at 1× and zoomed; 30 × → and ↑ | Tab order: 14 lit countries (alphabetical), then Zoom in (− and ⤢ are skipped at 1×), names, land covers. The map itself is a stop only when zoomed. The card: heading, covers, then Close. Escape puts focus back on the opener. Arrows pan by a fifth (135, 53.25 → 153, 60.35), clamp at the north-east edge, and don't scroll the page. At 1× ↓ doesn't pan. The dashed mark shows only on Tab focus. The ring on names is 2 px gold ✓ |
| Card + wallpaper / resize | France card open, then 844 × 390, 320 × 640 and back; midnight via the page; the Room panel round trip; 1280 → 900 / 600 / 1600 | Card, gold mark and zones stay; a wider map has fewer zones (9 instead of 12); the gold is identical on midnight; after the Room panel France opens normally ✓ |
| Imaginary lands | Tap the first and last land cover; swipe from one | Each opens its own book (48 × 72); the swipe scrolls and opens nothing ✓ |
| No digits | Text, every `aria-label`/`title`/`alt`, svg `<title>`, CSS `content`: at 8×, with the UK card, a plain card, a 105-cover card, and Japan at 1280 | None ✓ |
| 300 books | 40 lit countries, 324 tiles, a 105-cover France card, phone at CPU ×1 and ×4 | ×1: frames 10 ms median and p95 for the glide, drag and pinch, no long tasks; the card opens in 57 ms. ×4: drag p95 60 ms, pinch p95 80 ms, the button glide 200–260 ms a frame (it plays as a jump on a slow phone), the card in 342 ms. Acceptable, see below |

**Smaller things seen, not blocking** (for the developer while fixing F1, or a later task):

- **Keyboard focus is lost** when the focused button becomes disabled: Enter on + at 4× (to 8×),
  Enter on − at 2× (to 1×), or `-` on the zoomed map until 1× (the map stops being a Tab stop).
  Focus then sits on `<body>` with no ring. The next Tab goes on from there (to the names), so no
  one gets stuck.
- **A tap within about 150–400 ms after panning the zoomed map** gets no `click` from Chrome in
  emulation, also on the + button outside the map. I didn't see this after a page scroll. It
  might be Chrome's own tap suppression. Worth a look on a real phone.
- **Crossing the dashboard's one/two-column width** (between 900 and 600 px) remounts the block, so
  the card closes and the map shows whole again. A phone turned sideways keeps it. This matches
  team choice 3 (zoom not remembered).
- **Tapping a cover opens the book on the shelf**, as every dashboard cover does (`showBook`
  leaves the dashboard). So the card doesn't "stay open behind it" as the design's table says.
  After Back, the book panel is still open over the dashboard; that was already so before this task.
- At CPU ×4 the button glide runs at about 4 frames a second (each frame changes the zoom).

**Gap tests added** in `src/components/BooksWorldMap.test.tsx` (all pass, 30 tests in the file):
the 6 px threshold (5.9 px is a tap; 6 px straight or diagonal is not); a second finger makes a
pinch whichever finger lifts first, and the next press is a tap again; a pinch zooms between 1 and
8 and the remaining finger doesn't move the map; a cancelled press never opens a card; Escape from
a card cover closes it with focus back on the name; `+`/`−` keys on a zoom button take one step
within the limits.

**To pass next time:** every lit country has a 44 px tap target around its **mainland** (for
example, measure the largest piece, or give each small piece its own zone). The check: at 390 and
zoom 1, a tap 6 px west of mainland France opens France, and the Netherlands still opens from
15 px off its edge. Plus a component test that mocks the svg's width so France's zone is decided
the way it is in a browser.

# Log

- 2026-11-23 architect: wrote the task from Hanna's agreed brief ("a better world map", parts 1
  and 2, feature chat 2026-11-22); the travel badges (part 3) are T-0040. No new decision; follows
  D-0013, D-0014, D-0020, D-0022, D-0026. Night mode: five choices under *Choices made by the
  team*, one question for the morning. Size: **full**. Handed to the **UX designer** for the design
  of the card, the selected-country mark and the zoom controls.
- 2026-11-23 ux-designer: designed: the card under the map (bingo-card look, 48 × 72 covers
  wrapping, ×, focus to its heading and back), the thick gold mark for the chosen country (dashed
  for focus), 44 px tap zones for tiny lit countries and a 6 px tap/drag threshold, the zoom
  buttons in a strip under the map (×2 a press, up to 8×), touch, mouse and keyboard behaviour,
  screen-reader wording, layouts at 390 and 1280 and the screenshot list. Night mode: two
  questions added for the morning (strip placement, bigger land covers). Handed to the
  **developer**.
- 2026-11-23 developer: built the tap card, the gold mark, the 44 px tap zones, tap vs drag, the zoom
  strip (+ − ⤢, ×2 a press, 8× max), pinch, Ctrl+scroll, drag to pan, page scroll at zoom 1,
  keyboard and screen-reader wording; `src/lib/mapZoom.ts` + test; `onShowBook` passed from the
  Dashboard (see *Build notes*). One call left to the UX designer's review: a tap zone doesn't take
  a tap on another lit country's own shape. Checks: `pnpm test` 97 files passed (1040 tests,
  9 skipped), with `BooksWorldMap.test.tsx` 24 and `mapZoom.test.ts` 8; `pnpm exec tsc --noEmit`
  clean; `pnpm run build` built; `pnpm exec harness check` ✓ tasks, decisions, engineers,
  generated files. `node docs/tasks/T-0039-screens/screens.mjs --url=http://localhost:3155`
  (no backend): "all checks passed" (88 ok, 0 FAIL, at 390 with CDP touch and at 1280,
  lavender and midnight). All 14 screenshots are in `docs/tasks/T-0039-screens/`. Handed to the
  **UX designer** for review.
- 2026-11-23 ux-designer: reviewed: matches the design, nothing to fix. Deviations 1–4 accepted
  (a tap zone yields to another lit country's own shape, now part of the design; scroll checked on
  `.dashboard`; two console messages filtered; T-0018 tests find the map as a group and covers as
  buttons). Three small differences noted, not to fix. Design checks ticked. Handed to the
  **tester**.
- 2026-11-23 tester: sent back: France (its box stretched by French Guiana) gets no tap zone, so
  mainland France is an 11.7 × 8.1 px target on the phone, and a tap a few px off it opens the
  Netherlands (see *Test*, F1). CI attempt 1 green; everything else held up; six gap tests added.
  #248 stays a draft. Handed back to the **developer**.
- 2026-11-23 developer: send-back fixed. Tap zones are decided and drawn by each country's main
  landmass (France without French Guiana, the USA without Alaska, Norway without Svalbard). Where
  zones overlap, a coast within 8 px wins, nearest first, otherwise the smallest. Focus moves to the
  other zoom button at 8× and 1×, and the open card survives the one/two-column remount (see *Build
  notes*). Deviation: on the demo shelf, France's neighbours are nearer than 6 px west of France, so
  the nearer coast (Spain or the UK) opens there, never the Netherlands; France opens 6 px west of
  itself when the neighbours aren't lit. New component tests: main landmass at a phone's width, focus
  at the limits, card across a remount. `vitest run BooksWorldMap Dashboard mapZoom`: 47 passed (47).
  `pnpm test`: 98 files passed, 1084 tests passed, 9 skipped. `tsc --noEmit` clean, `pnpm run build`
  built, `harness check` ✓ tasks, decisions, engineers, generated files. `screens.mjs` on 3155:
  "all checks passed" (101 ok, 0 FAIL; 15 px north of the Netherlands opens it, the UK at zoom 1 opens
  the UK, 6 px west of France with only France and the Netherlands lit opens France, resizing
  1280 → 600 → 1280 keeps the card). Handed to the **UX designer** for review (the overlap rule),
  then the tester.
