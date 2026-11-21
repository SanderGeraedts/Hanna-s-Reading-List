---
id: T-0011
title: "Add a quick update button to move a book on or finish it without the full book panel"
description: "A round 📖 button in the corner of every page opens the books Hanna is reading as big covers; tapping one opens a small card with big − / + buttons, typing the page, Finished! and More."
status: Done
depends_on: []
decisions: [D-0013, D-0014, D-0020]
raised_on: 2026-11-21
done_on: 2026-11-21
result: []
---

# Goal

From an improvement round with Hanna (2026-11-21): updating her progress on the phone was the
most annoying thing. She had to find and tap a thin spine, scroll through the long book panel, and
the slider was imprecise. She chose "all of these" as the fiddly part.

- **A round 📖 button** in the bottom left corner of every tab, on the phone and on the computer.
  It doesn't show when nothing is being read or paused, or while the book panel is open.
- **One tap** shows the books she's reading (latest touched first), then the paused ones, as big
  covers with their percentage. With only one book on the go, it opens that book's card
  straight away.
- **The card:** cover, title, author and a progress bar. Where she is in big numbers ("137 of 400
  pages", "6 h of 12 h", or "42% read" for a book without a length). Then:
  - **−** and **+** buttons: one page per tap (a minute for an audiobook, a percent without a
    length), faster and faster while held;
  - **+10**;
  - tap the number to type where she is with the keypad;
  - **Finished! 🎉** marks it read at the last page. The rating waits under "Waiting for you"
    (D-0013, no pop-ups);
  - **More** opens the full book panel.
- **Tapping a book on the shelf** still opens the full panel, as before.

# Done when

- Unit tests for `src/lib/quickUpdate.ts` cover:
  - the order of the books;
  - whole-page steps that never drift and stop at the ends;
  - a step noted in today's reading log, like the slider;
  - steps for an audiobook and for a book without a length;
  - typed positions;
  - Finished! marking the book read at the last page.
- On a local dev server with no backend (shelf in the browser):
  - starting at page 124 of 400, +1 three times and +10 shows 137;
  - typing 250 shows 250;
  - the audiobook shows "6 h of 12 h";
  - the progress and that day's reading log are saved.
- No page errors.
- `npm test` and `npm run build` pass.

# Notes

- `src/lib/quickUpdate.ts`: the books to offer, the steps (built on `progressPatch`, so the
  reading log, streaks and the calendar keep working, and a paused book picks up again), typed
  positions, and Finished!.
- `src/components/QuickUpdate.tsx`: the button, the list, the card, and the hold-to-repeat
  button.
- Wired into `src/routes/index.tsx`, next to the badge toasts.
- Saving to the server is already debounced by `useLibrary`, so rapid taps don't flood it.
- Bottom left, because the shelf's zoom buttons and the badge toast are in the bottom right.
- Nothing is needed from Sander: app code only, and no new fields on `Book`.
- Storytel audiobooks are refreshed nightly from Storytel, so a change made by hand to one is
  overwritten then. Accepted.

# Design

Decided with Hanna in the improvement round (feature-chat). Screenshots of the build are in
[T-0011-screens](T-0011-screens/), taken on a local dev server with no backend and a
five-book demo shelf:

- `phone-1-button.jpg` (390 × 844): the 📖 button in the bottom left corner of the shelf.
- `phone-2-list.jpg`: "Reading now" with the three books.
- `phone-4-after-steps.jpg`: the card for The Night Circus at page 137 of 400.
- `desktop-5-audiobook.jpg` (1280 × 800): the card for an audiobook, in the bottom left corner.
- `phone-0-dashboard.jpg`: the button over the dashboard.

On a phone the card is a bottom sheet; on a computer it's a card in the bottom left corner. The
gold button and gold + follow D-0020. There are no explanatory texts (D-0014).

# Test

Run with Playwright (playwright-core driving the installed Chrome) against `npm run dev` with no
`POCKETBASE_URL`, at 390 × 844 and 1280 × 800:

- **The Night Circus** (124 of 400): +1 three times, then +10 → "137"; typed 250 → "250".
- **Circe** (audiobook, 720 min, 50%): "6 h of 12 h".
- **After closing:** the saved book has progress 0.625, with that day's reading log at 0.315.
- **Page errors:** none.
- **Unit tests:** `quickUpdate.test.ts`, 6 passed.

**Verdict:** passed.

# Log

- 2026-11-21 architect: improvement round with Hanna; the quick update was decided and planned.
- 2026-11-21 developer: built it. The button moved from bottom right to bottom left after the
  first screenshots showed it covering the shelf's zoom buttons.
- 2026-11-21 tester: passed on a local dev server. Remaining: Hanna checks it on the deploy
  preview on her phone.
