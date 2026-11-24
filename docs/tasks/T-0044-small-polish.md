---
id: T-0044
title: "Small polish: Arrange chip focus, the open book's clip and the shelf after rotation, the birthday row's focus"
description: "Three small follow-ups found by the team: the Hidden chips keep their full focus outline when Tab scrolls one into view and focus moves to a sensible spot after Enter; the open book's paper clip stays clear of the toolbar on the computer, the shelf snaps back to the top row when the phone turns with a book open, and a sideways-only sheet height is no longer saved as the preference; focus stays on the birthday row after Save or Clear."
status: Doing
size: small
depends_on: [T-0037, T-0038, T-0043]
decisions: [D-0014, D-0020, D-0022]
raised_on: 2026-11-23
done_on: ""
result: []
---

# Goal

Three fixes from the backlog ("Small follow-ups found by the team"), all small, bundled in
one task and one pull request to save Netlify build minutes. Requester: Hanna. Night mode:
she wasn't asked anything; each fix follows the look the earlier task already decided.

## F7: Arrange bar's Hidden chips focus and Enter

1. **Focus outline cut off.** `.hidden-blocks` scrolls inside a capped area (T-0038). When
   Tab scrolls a chip into view, the bottom 4 px of the chip's focus outline is clipped by
   the overflow box.
2. **Focus drops after Enter.** When Enter restores a hidden block (`showBlock` on the
   Dashboard, `showIn` on Challenges), the chip is removed from the DOM and focus falls to
   the page body.

**After:**

1. `.hidden-blocks` gets `scroll-padding-block: var(--space-1)` so the browser scrolls a
   focused chip with room for its outline above and below.
2. On Enter on a chip, focus moves to the next chip in the Hidden list (the one that now
   sits where the clicked chip did). If there is no next chip (the last one was restored,
   or it was the only one), focus moves to the restored block's drag handle
   (`.dashboard-grid [data-block="<id>"] .block-handle`, or the favourites copy's).

## F8: Open book and shelf

1. **The paper clip touches the toolbar on the computer.** On wide screens
   `landscapeInspect`'s `fits` check keeps the default framing (centred, `fill: 0.6`) when
   the book itself is clear of the panel and the sheet. It does not count the clip
   (`CLIP.out`) above the book, so a book with a clip (reading or paused) has its clip
   reach under the toolbar at 1280 × 800 and larger.
2. **After the phone turns with a book open, the shelf behind shows lower rows.** When the
   screen turns while a book is out, `scroll.current.y` is clamped to the new portrait's
   `[min, max]`, but the previous landscape value may be at the centre, so after turning
   back to portrait the shelf sits a few rows below the top. Meanwhile the book was out, so
   she never scrolled; the top row is what she opened the book at.
3. **A sideways-only sheet height is saved as the preference.** On a small phone held
   sideways (e.g. 667 × 375, 720 px sheet breakpoint still matches) the sheet cap is small,
   so `useSheet`'s `fit()` clamps the saved share down and writes it back
   (`saveSheetShare(h / screen)`), so upright the next book opens at that cramped height.
   T-0037 guarded against a *mid-rotation* passing size; this is the sideways open itself.

**After:**

1. `landscapeInspect`'s `fits` check also requires the top of the book plus `CLIP.out` to
   be below the header (with the same `edge`). When it doesn't fit (e.g. a book with a
   clip at 1280 × 800), the free-rectangle framing kicks in, which already centres the
   book and its clip together. On the computer with a book without a clip nothing changes.
2. `BookshelfScene` notices when `portrait` changes while a book is open and resets
   `scroll.current.y` to `s.max` (the top row), the same spot the book opened at. Without a
   book open nothing changes, and a `fitsH` case (landscape fits the whole case) is
   unchanged (there is no scrolling then).
3. `useSheet`'s `fit()` no longer writes the clamped share back to `localStorage`. The
   sheet still opens at `openingSheetPx(saved, screen, cap)` so a saved share that doesn't
   fit is shown clamped; only a drag by Hanna saves a new preference. T-0037's remembered
   flag stays (`remembered.current`), so the clamp is still only computed on the opening
   frame and re-fit when the cap changes.

## F12: Birthday row keeps focus after Save or Clear

The `BirthdayRow` (`src/components/NewBlocks.tsx`, T-0043) moves focus with
`focusNext.current` in a `useEffect`. Between the state commit and the effect, the browser
can briefly focus the document body (the clicked Save/Clear button has unmounted). When
focus is on the body in that frame a page-level key handler can steal it.

**After:** the row uses `useLayoutEffect` instead of `useEffect`, so the focus move runs
synchronously before the browser paints the next frame, without a body-focus frame in
between. Nothing else changes (the same two targets, `change` or `day`).

# Done when

- `src/styles.test.ts`: `.hidden-blocks` has `scroll-padding-block: var(--space-1)`. The
  existing T-0038 checks still pass.
- `src/components/useHiddenChipFocus.test.tsx` (new): a small hook test or a render test of
  the Dashboard's Arrange bar: after clicking the first Hidden chip, focus is on the next
  chip; after clicking the last chip, focus is on the restored block's `.block-handle`.
- `src/components/inspectPlacement.test.ts`: in `describe('landscapeInspect')` a case at
  1280 × 800 with the side panel and a book with a clip (`clip > 0`) falls back to the
  free-rectangle framing (`frame.yShift` non-zero), while the same book without a clip
  still gets `DEFAULT_INSPECT`. Fails before the fix.
- `src/components/BookPanel.sheet.test.tsx`: an existing or a new case checks that opening
  the sheet with a saved share above the cap no longer writes a smaller share back to
  `localStorage` (the T-0037 mid-rotation case stays). Fails before the fix at a saved
  share of 0.88 and a small cap.
- A new `src/components/useScrollTopOnTurn.test.tsx` (name the developer's) or an added
  case in an existing BookshelfScene test: after a `portrait` → `!portrait` → `portrait`
  cycle with a book open, `scroll.current.y === s.max`. Fails before the fix when the
  intermediate landscape left `scroll.current.y` at the midpoint.
- `src/components/BirthdayBadge.waiting.test.tsx` (extend) or a new case: after clicking
  Save and after clicking Clear the active element is the Change button or the Day select
  **in the same paint**: `document.activeElement` is correct right after the React commit
  (not after a `waitFor`). Fails before the switch to `useLayoutEffect` when a `focus`
  event on `document.body` is observed between commit and the effect's run.
- `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm run build` and `pnpm exec harness check`
  pass; `src/routeTree.gen.ts` is not committed. The backlog's "Small follow-ups" section
  has F7, F8 and F12 removed (F13 and F14 stay; F14 is done).

# Notes

- Read first: T-0037 (sheet cap and the inspect frame), T-0038 (`.hidden-blocks` capped
  scroll area), T-0043 (BirthdayRow focus).
- Files: `src/styles.css`, `src/components/Dashboard.tsx`,
  `src/components/ChallengesPage.tsx`, `src/components/inspectPlacement.ts`,
  `src/components/BookshelfScene.tsx`, `src/components/BookPanel.tsx`,
  `src/components/NewBlocks.tsx`, their tests, `docs/backlog.md`.
- One commit for all three if possible (the task is one PR). The UX designer reviews
  after building (G-0031, small).

# Design

Nothing new visible beyond what each earlier task already decided.

**Review after the build (G-0031, small).** The three fixes were checked against the
backlog's own words, which stood in for a design:

- F7 (Arrange chips, Dashboard and Challenges): with Arrange on and several blocks hidden,
  Tab moves between the chips with the full focus ring visible on each (the new
  `scroll-padding-block` leaves room above and below). Enter on a chip restores the block
  and focus moves to the next chip in the Hidden list, or, when that was the last chip, to
  the restored block's drag handle in the grid. Nothing else about Arrange changes.
- F8.1 (paper clip on the computer): a book she is reading or paused now stands a little
  lower on wide screens, enough that the clip clears the toolbar. A book without a clip
  stays centred as today. On phones it already stood clear (T-0037 F1 and F3).
- F8.2 (shelf behind after a turn with a book open): the shelf snaps back to the top row
  the book was opened at, not the middle of the case. Without a book open nothing changes.
- F8.3 (sideways open saves the sheet height): a book opened on a small phone held
  sideways no longer rewrites the upright preference. A drag by Hanna still saves (she
  meant it then).
- F12 (birthday row focus): after Save or Clear the focus is on the Change button or the
  Day select in the same paint, with no page-body frame in between.

No wording or colour changes. Handing to the tester.

# Test

Targeted checks for a small task (no new state, no new screen).

**`pnpm exec tsc --noEmit`** — no output, exit 0 (passes).

**`pnpm test -- --run`** — 123 test files, 2 skipped; 1593 tests passed, 22 skipped. The new
and affected tests, with the file they are in:

- `src/styles.test.ts` → `scroll-padding-block` on `.hidden-blocks` is `var(--space-1)`,
  plus the existing T-0038 cap and short-screen checks still pass.
- `src/components/Dashboard.hiddenChips.test.tsx` (new) → Enter on a chip moves focus to
  the next chip; Enter on the last chip moves focus to the restored block's
  `.block-handle`.
- `src/components/inspectPlacement.test.ts` → a book with a clip at 1280 × 800 no longer
  uses the centred frame (`yShift` non-zero) and the top of the clip sits at or below
  `header + edge`; a book without a clip at the same screen stays
  `{ fill: 0.6, yShift: 0, xShift: 0 }`. The SMALL screens with the clip still pass.
- `src/components/BookPanel.sheet.test.tsx` → opening at 667 × 375 with a saved 0.880
  shows the sideways cap but does not overwrite the saved preference (still 0.880).
  The existing upright-first-open save and the mid-rotation keep-preference tests still
  pass.
- `src/lib/shelfPan.test.ts` → `scrollYOnTurn` snaps to the top when the orientation
  changes with a book open, and keeps the current Y otherwise.
- `src/components/BadgesCard.test.tsx` → after Save, focus is on Change; after Clear,
  focus is on Day; no focusin on `document.body` between the state change and the focus
  move (the `useLayoutEffect` switch).

**`pnpm run build`** — vite built the client and the server in 860 ms; no errors.

**`pnpm exec harness check`** — tasks index in step (44 tasks), 42 decision records,
2 engineers, generated files current.

**Tried to break it:**

- Hidden chips: Tab across the chip row with the focus ring visible on each, including the
  last visible one near the fold. Clicking a chip in the middle moves focus to the chip to
  its right, as the design says. Clicking the only chip left moves focus to the restored
  block's handle; Hide × on that block puts the chip back in the Hidden row (Enter on the
  handle would move it, not hide it).
- Clip and toolbar: a reading book (`status: reading`, has a clip) opened at 1280 × 800
  stands below the toolbar with the clip clear of it; a `read` book (no clip) is centred
  as today.
- Shelf rotation with a book open: portrait → landscape → portrait returned the shelf
  behind to the top row; without a book open, scroll stayed where it was.
- Sheet saved on a sideways open: with saved 0.880, opening at 667 × 375 showed the small
  sideways cap and did not write it back. On a drag she still saves the clamped share, as
  she means to.
- Birthday row: Save and Clear both leave the focus on the row's next button.
`src/routeTree.gen.ts` is not staged (gitignored).

Verdict: passed. Handing to the GitHub checks; the PR will be marked ready when CI is
green.

# Log

- 2026-11-23 architect: sized small; bundles F7, F8 and F12 from the backlog into one task
  and one pull request. Handing to the developer.
- 2026-11-23 developer: built all three in one commit. Added
  `src/components/Dashboard.hiddenChips.test.tsx`, a `landscapeInspect` clip case,
  a BookPanel sideways-sheet case, a `scrollYOnTurn` helper with tests, a BirthdayRow
  focus case. Local: tsc clean; `pnpm test -- --run` 1593/0; `pnpm run build` 860 ms;
  `pnpm exec harness check` passes. Handing to the UX designer.
- 2026-11-23 ux-designer: reviewed the result against the backlog's own words (G-0031
  small, review after). Matches. Handing to the tester.
- 2026-11-23 tester: passed (checks and Test section above). The PR goes up as a draft;
  marked ready once CI is green.
