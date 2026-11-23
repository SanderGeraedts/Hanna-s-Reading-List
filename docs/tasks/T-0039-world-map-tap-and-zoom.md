---
id: T-0039
title: "Tap a country on the world map to see its covers in a card under the map, and zoom the map with + −, pinch, Ctrl+scroll and dragging"
description: "In Where your books are set, tapping a country (or its name in the list) opens an inline card under the map with that country's covers, each opening its book (a plain country says No books set here yet.), imaginary-land covers open their book too, and the map zooms with + − buttons, pinch, Ctrl+scroll and drag-to-pan when zoomed, while at zoom 1 the page scrolls as before; still no numbers in the block."
status: Open
size: full
depends_on: [T-0018, T-0022]
decisions: [D-0013, D-0014, D-0020, D-0022, D-0026]
raised_on: 2026-11-23
done_on: ""
result: []
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

# Design

To be written by the UX designer before the build.

# Test

To be written by the tester.

# Log

- 2026-11-23 architect: wrote the task from Hanna's agreed brief ("a better world map", parts 1
  and 2, feature chat 2026-11-22); the travel badges (part 3) are T-0040. No new decision; follows
  D-0013, D-0014, D-0020, D-0022, D-0026. Night mode: five choices under *Choices made by the
  team*, one question for the morning. Size: **full**. Handed to the **UX designer** for the design
  of the card, the selected-country mark and the zoom controls.
