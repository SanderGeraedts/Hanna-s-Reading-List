---
id: T-0038
title: "Keep the Arrange bar small: its Hidden chips scroll inside a capped area, and on a short screen the bar no longer sticks over the blocks"
description: "While arranging, the Hidden: chips of the Arrange bar (Dashboard and Challenges) sit in an area at most about two chip rows high that scrolls inside, so the bar never grows taller than the screen however many blocks are hidden; on a short screen (a phone held sideways) the bar stays at the top of the page instead of sticking under the header, so no bingo square ends up under it."
status: Doing
size: small
depends_on: [T-0020, T-0035]
decisions: [D-0014, D-0020, D-0022, D-0028]
raised_on: 2026-11-23
done_on: ""
result: ["https://github.com/SanderGeraedts/Hanna-s-Reading-List/pull/244"]
---

# Goal

Two things the T-0035 tester found about the sticky Arrange bar (`.dashboard-bar.arranging`,
from T-0020) on the Dashboard and the Challenges page. Requester: Hanna. Night mode: she wasn't
asked anything; the team's picks are under *Choices made by the team*.

1. **The bar grows with every hidden block.** The "Hidden:" chips (`.hidden-blocks`) wrap onto
   new rows, so with every block hidden the bar was 699 px at 390 × 844 (16 rows), 742 px at
   360 × 800 and 178 px at 1280 × 800. From about 26 hidden blocks on a phone the bar is taller
   than the screen, and the last blocks' *Hide* buttons can only be reached by scrolling under
   it (Playwright's real click was blocked). Same on `main` before T-0035.
2. **A phone held sideways with Arrange on hides part of the bingo squares.** At 844 × 390 and
   800 × 360 the header plus the sticky bar leave only 93–151 px, and a bingo square is
   171–182 px tall, so focused squares end up 2–37 px under the bar (14 of 174 at 844 × 390 with
   6 hidden; 24 of 174 at 800 × 360 with 6 hidden). As the tester wrote: nothing can fit a card
   taller than the space that's left, so the bar must take less of a short screen.

## The fix

- **Cap the chips.** `.hidden-blocks` keeps wrapping, but gets a **maximum height of about two
  chip rows** (e.g. `max-height: calc(2 × chip height + gap)`, from the tokens) and
  `overflow-y: auto`, so beyond two rows the chips scroll inside the bar. The bar's height is then
  at most its actions row plus two chip rows, whatever the number of hidden blocks. A chip that
  gets keyboard focus scrolls into view inside the area (the browser does this; check it). The
  "Hidden:" label scrolls with the chips; that's fine.
- **Short screens: the bar doesn't stick.** In a `@media (max-height: 500px)` rule the arranging
  bar is `position: static` (it stays where it is on the page, right under the Today strip,
  with Reset and Done at hand when she starts arranging), and the arranging scroll padding
  (`.dashboard:has(.dashboard-bar.arranging)`) falls back to the header's own sum, without
  `--arrange-h`. Then a focused bingo square only has to fit under the header, which it does
  (390 − about 130 px header leaves well over 182 px).
- Both pages share the CSS, so the Challenges page gets the same fix. `useArrangeBarHeight`
  stays (portrait and the computer still use `--arrange-h`).
- Nothing else about arranging changes: Reset, Done, the chips' order and what they do, dragging
  (D-0028), the bar's look.

# Done when

- **`src/styles.test.ts`** (extend it, as T-0035 did): `.hidden-blocks` has a `max-height` and
  `overflow-y: auto`; a `max-height: 500px` media rule sets `.dashboard-bar.arranging` to
  `position: static` and gives `.dashboard:has(.dashboard-bar.arranging)` a `scroll-padding-top`
  **without** `--arrange-h` that equals the plain `.dashboard` sum. The existing T-0035 checks
  still pass.
- **The focus script** (`docs/tasks/T-0035-screens/focus-check.mjs`, copied or extended into
  `docs/tasks/T-0038-screens/`), on a local dev server with no backend (never a production
  `POCKETBASE_URL`), 150 demo books, Dashboard and Challenges with Arrange on:
  - **844 × 390 and 800 × 360, with 0, 6 and 30 hidden blocks:** **0** focusable elements under
    the header or the Arrange bar (before, on `main`: 14 of 174 at 844 × 390 with 6 hidden, 24 of
    174 at 800 × 360 with 6 hidden). Run on `main` too and put both counts in the *Log*.
  - **390 × 844, 360 × 800 and 1280 × 800, with 0, 6 and 30 hidden:** 0 under the header or the
    bar, as after T-0035; the bar's height with 30 hidden is **at most 35 % of the screen
    height** at 390 × 844 and 360 × 800 (before: 699 / 742 px) and the same with 6 or 30 hidden at
    1280 × 800 once there are more than two rows of chips.
  - **Every chip and every *Hide* button can be clicked** with a real (not forced) Playwright
    click at 390 × 844 with 30 hidden (before: blocked from 26 hidden), and a chip reached by Tab
    is fully visible inside the chip area.
- **Screenshots** in `docs/tasks/T-0038-screens/`, lavender and midnight where it says `*`:
  `arrange-30-hidden-390-*` (bar with the capped, scrollable chips), `arrange-30-hidden-1280-lavender`,
  `arrange-6-hidden-844x390-*` scrolled to the bingo card (no square under anything; the bar
  scrolled away with the page), `arrange-challenges-844x390-lavender`.
- `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm run build` and `pnpm exec harness check` pass;
  `src/routeTree.gen.ts` is not committed. No console errors, no horizontal scroll.

# Notes

- **Read first:** T-0035 (*Build notes* "While arranging", the tester's Arrange and
  resize/rotate findings, `focus-check.mjs`), T-0020 (the sticky Arrange bar, why its `top` is
  small), D-0028 (favourites order while arranging).
- **Files:** `src/styles.css` (`.dashboard-bar.arranging`, `.hidden-blocks`, the arranging
  `scroll-padding-top`, a new `max-height: 500px` rule), `src/styles.test.ts`. No change to
  `Dashboard.tsx` / `ChallengesPage.tsx` is expected; if the developer needs one (e.g. a class),
  that's fine and still group 1.
- **Group 1** (guardrails): CSS and a test only, nothing about books or saving, no code-owned path.
- **Size: small.** A style change within existing pages, no new screen, data or service. The UX
  designer writes no design before the build and reviews the screenshots after.
- No new decision. Tokens only (D-0020), both wallpapers (D-0022), no hint text about the
  scrolling (D-0014).

## Choices made by the team

Hanna wasn't asked anything (night mode). The architect took these:

1. **Chips scroll inside a two-row area**, rather than one sideways-scrolling row: wheel and
   trackpad scroll it naturally on the computer, and with few hidden blocks (the usual case)
   nothing looks different from today.
2. **On a short screen the bar stops sticking** instead of being squeezed further. A bingo square
   (up to 182 px) can't fit under the header plus any sticky bar on a 360–390 px tall screen, so
   this is the one fix that guarantees nothing ends up under it. The cost: with the phone
   sideways she scrolls back up to press Done or bring a block back.
3. **500 px** as the "short screen" line: every phone held sideways is below it, every computer
   window and upright phone we check is above it.

## Questions to re-ask Hanna in the morning

1. "With your phone sideways, the Arrange bar (Reset, Done and the hidden blocks) now stays at the
   top of the page instead of following you down. Is scrolling back up to press Done all right?"

# Design

No design before the build (small task). The UX designer reviews the screenshots after.

# Build notes

- **CSS only** (`src/styles.css`); no change to `Dashboard.tsx`, `ChallengesPage.tsx` or
  `useArrangeBarHeight`.
- **The chip area:** `.hidden-blocks` gets `--chip-row` (one `.btn.small` chip:
  `var(--fs-small) * 1.25 + 2 * var(--space-1) + 2px`, about 26 px) and `--chip-gap` (its existing
  0.4rem gap), `max-height: calc(2 * var(--chip-row) + var(--chip-gap) + 2 * var(--space-1))` and
  `overflow-y: auto`. On a touch screen (`@media (pointer: coarse)`) `--chip-row` is 36px, the
  `min-height` `.btn.small` already has there. The area has `padding: var(--space-1)` taken back
  by `margin: calc(-1 * var(--space-1))`: nothing moves, and a focused chip's outline (2 px +
  2 px offset) isn't clipped by the scroll area.
- **Short screens:** a new `@media (max-height: 500px)` block sets `.dashboard-bar.arranging` to
  `position: static` and `.dashboard:has(.dashboard-bar.arranging)` to the plain `.dashboard`
  `scroll-padding-top` (no `--arrange-h`). The hook still measures the bar; the value just isn't
  used there.
- **Tests:** two new cases in `src/styles.test.ts` (chip area: `max-height` from `--chip-row`,
  `overflow-y: auto`; the 500 px block: `position: static`, and a scroll padding without
  `--arrange-h` that is exactly the `.dashboard` one). Both fail on `main` (no `max-height`, no
  such media block). The six T-0035 cases are unchanged and pass.
- **The focus script:** `docs/tasks/T-0038-screens/focus-check.mjs`, extended from T-0035's: Arrange
  on, Dashboard and Challenges, 0 / 6 / 30 hidden, five sizes, plus the bar's height and position,
  sideways scroll and console errors per run; then at 390 × 844 it hides **every** block with real
  Playwright clicks, brings every block back with real clicks on the chips, and Tabs through the
  chips with 30 hidden. The Challenges page has only **4** blocks to hide, so its "6" and "30" runs
  are 4 hidden (the lines say `4-hidden`). On `main`, where a real Hide click fails, the script
  falls back to `dispatchEvent('click')` so the count still runs (and says so). `main` was run by
  putting `main`'s `styles.css` in place on the same dev server (the CSS is the only difference),
  then restoring it. Outputs: `focus-before-main.txt`, `focus-after-branch.txt`.
- **Screenshots:** `docs/tasks/T-0038-screens/screens.mjs`; per-shot measurements in
  `screens-branch.txt`.
- **For the UX designer:** with the chip area at exactly two rows, the third row is cut off at the
  gap, so on a phone (no visible scroll bar) nothing shows there are more chips
  (`arrange-30-hidden-390-*`: 3 chips visible of 30). The task says no hint text (D-0014); a
  `max-height` of about 2½ rows, so the third row peeks out, would hint without text. Not done:
  that's the designer's call.
- **Found, not fixed (for the architect):** in the `max-width: 720px` rule `.dashboard`'s padding
  changes to `calc(var(--header-h) + var(--space-2))` but its `scroll-padding-top` stays the
  `--space-3` sum (4 px apart on a phone in portrait); harmless, older than this task. The
  Challenges page's Arrange bar is centred, not full width, on the computer and sideways (look of
  T-0020, unchanged).

# Test

# Log

- 2026-11-23 architect: wrote the task from T-0035's tester notes (phone sideways with Arrange on:
  bingo squares partly under the bar; 26+ hidden blocks on a phone: the bar taller than the
  screen, from T-0020). Fix: the Hidden chips scroll inside an area of about two rows, and below
  500 px of height the bar doesn't stick. Night mode: choices under *Choices made by the team*,
  one question for the morning. No new decision. Size: **small**. Handed to the **developer**; the
  UX designer reviews after the build.
- 2026-11-23 developer: built it in `src/styles.css` (CSS only): `.hidden-blocks` capped at two
  chip rows (`--chip-row`, 36px on a touch screen) with `overflow-y: auto`; `@media (max-height:
  500px)` makes the arranging bar `position: static` and its scroll padding the plain `.dashboard`
  one. `src/styles.test.ts` +2 cases (8 passed). Focus script
  (`docs/tasks/T-0038-screens/focus-check.mjs`, no backend, 150 demo books, Arrange on), elements
  under the header or the bar, **main → branch**: 844 × 390 Dashboard 0 / **14 of 174** / 0 hidden
  0, 6, 30 → **0 / 0 / 0**; 800 × 360 Dashboard **14 of 285** / **24 of 174** / 0 → **0 / 0 / 0**;
  800 × 360 Challenges 0 hidden **14 of 32** → **0**; every other run 0 on both; total **66 → 0**.
  Bar height with 30 hidden: 390 × 844 **699 → 148 px (17.6 %)**, 360 × 800 **742 → 148 px
  (18.5 %)**, 1280 × 800 178 → 117 px (14.7 %); with 6 hidden 233 → 148 px on the phones, 84 px at
  1280 (one chip row, unchanged). Sideways: bar `static`, 148 px with 6 hidden. Real clicks at
  390 × 844: main 29 of 30 Hide buttons then `Timeout ... exceeded`; branch **30 of 30 Hide
  buttons and 30 of 30 chips**. Tab with 30 hidden: **30 of 30 chips fully visible** in the chip
  area. No console errors, no sideways scroll in any run. Screenshots: `arrange-30-hidden-390-
  lavender/midnight`, `arrange-30-hidden-1280-lavender`, `arrange-6-hidden-844x390-lavender/
  midnight` (focused bingo square 171–353 px, header ends at 121), `arrange-challenges-844x390-
  lavender`. `pnpm test` 95 files, 952 passed, 9 skipped; `tsc --noEmit` exit 0; `pnpm run build`
  ✓ built. Handed to the **UX designer** for the screenshot review (see *Build notes*: a third row
  that peeks out?).
