---
id: T-0003
title: "Show the bookshelf again on a phone"
description: "#181: the shelf isn't shown in the mobile version; find what broke it on narrow screens and fix it, with a test that keeps it fixed."
status: Open
depends_on: [T-0001]
decisions: [D-0002, G-0019]
raised_on: 2026-11-21
done_on: ""
result: []
---

# Goal

Hanna reported in #181 (19 November, evening): "The shelf is not shown in the mobile version."
The README promises that on a phone held upright the bookcase fills the width of the screen,
scrolls by swiping, and books open with a tap. Make the Bookshelf page show the bookcase with
her books again on a phone, as it did before.

The report came in right after a run of merges that evening, so one of them is the likely
cause; the developer finds which by reproducing it, not by guessing:

- #172 (`414c0fd`) tabs for the pages: Bookshelf, Dashboard, Challenges, Calendar;
- `5ad6ed8` hiding the ☰ menu where it would be empty;
- #175, #176, #179 (`9ab4ec0`, `9abdd95`, `80c93da`) the bookcase's crown, base, decorations
  and decoration spots, which change the bookcase's size and the camera fit;
- #170 (`bd25ec7`) zooming in and out on the shelf.

**Assumption, stated because the report is short:** "not shown" means the bookcase itself is
missing or empty on the Bookshelf page on a phone, not that a tab or menu entry is missing.
If reproducing shows it is a tab or a menu entry that can't be reached on a phone, fix that
instead; the check below covers both.

# Done when

- On the pull request's Netlify deploy preview, in Chrome's device emulation at 390 × 844
  (iPhone 12-ish) and at 360 × 800 (a small Android), the Bookshelf page shows the wooden
  bookcase with books on it after adding two books (search "Dune", add; ISBN `9780140328721`,
  add). Swiping up and down scrolls the shelves, a tap takes a book out, and Esc or a tap on
  the room puts it back. The tester attaches a screenshot of each size to the task's *Test*.
- The same at 1280 × 800: the desktop shelf is unchanged.
- The cause is named in the pull request and in the *Log*.
- A test that fails before the fix and passes after: a unit test (Vitest) on the function that
  went wrong (e.g. the layout or camera fit for a narrow, tall viewport), or, if the cause is in
  rendering, a Playwright test against `pnpm run build && pnpm run preview` at 390 × 844 that
  checks the canvas is visible with a non-zero size. Adding Playwright is allowed (D-0002).
- `pnpm test` and `pnpm run build` pass; CI is green.
- The UX designer has reviewed the screenshots.

# Notes

- Work in a worktree without `.netlify/` and without `POCKETBASE_URL`: the shelf then lives in
  the browser (G-0019, #156). Previews have no account server either.
- `src/components/BookshelfScene.tsx` (camera fit, phone scrolling), `src/lib/shelfLayout.ts`,
  `src/routes/index.tsx` (tabs and pages), `src/styles.css`.
- Nothing about how the shelf is saved changes.
- Close #181 from the pull request.

# Design

UX designer: review only, unless the fix changes what the page looks like on a phone; then
say how it should look before it is built.

# Test

# Log

- 2026-11-21 architect: Task written from #181; the report is one line, so the assumption is
  written in the Goal. Priority: first of the Requester's issues, because the shelf is the app.
