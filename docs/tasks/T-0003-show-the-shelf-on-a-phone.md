---
id: T-0003
title: "Show the bookshelf again on a phone"
description: "#181: the shelf isn't shown in the mobile version; find what broke it on narrow screens and fix it, with a test that keeps it fixed."
status: Doing
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
- If the fix touched the header: at 390 × 844 and at 320 × 640 the page tabs are on one row and
  cover no books, also while a search is on (type "the", close the search box; the chip stays
  in the header). On the Dashboard at 390 × 844 and 1280 × 800, the strip with the book being
  read is fully visible under the tabs.

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

## Design (2026-11-21, before the build)

**What I could see.** I ran `main` (`35e447a`) locally with no account server (shelf in the
browser) and took screenshots in headless Chrome at 390 × 844, 360 × 800, 320 × 640,
768 × 1024 and 1280 × 800, with 12 books and with 300 books. In all of them the bookcase *was*
drawn, with books on it. So the problem did not show up on demo data in a desktop browser; it
is probably something only a real phone does (its graphics chip, its browser, the address bar
changing the height, or her real shelf with covers). The developer still has to reproduce it
first, as the Goal says.

**How the Bookshelf page must look on a phone once it is fixed.** This is how it looks today in
the emulator, and it is the target. Nothing new is designed:

- Top: the ☰ menu, "Hanna's Reading List", and under it the one-line count
  ("12 books · 2 reading · …", cut off with "…" when too long). On the right: 🔍, ↻ and
  "+ Add".
- Under that, the four page tabs as round icon buttons (📚 📊 🏆 📅), with 📚 in gold.
- The wooden bookcase fills the screen width, apart from its side boards. The top shelf's books
  are on the first screen without scrolling, and their spine text can be read. Swiping up and
  down moves through the shelves.
- Bottom right: the zoom buttons +, − and ⤢.
- A tap on a book takes it out. The details sheet slides up from the bottom, and the book stays
  visible above it.

**States.**

- *Loading:* "Building the shelf…" in the middle, as now, until the bookcase is drawn.
- *Empty shelf:* "Add your first book to start filling the shelf." with "+ Add book", as now.
- *Error, only if the cause turns out to be the 3D drawing failing on the phone* (the browser
  can't draw it, or drops the drawing when memory runs out): instead of an empty page, show a
  note in the middle of the page, styled like the empty-shelf note:
  - "The bookshelf can't be drawn on this phone right now."
  - "Your books are safe. The Dashboard, Challenges and Calendar still work."
  - one main button: "Try again" (draws the shelf again; reloading the page is fine).
  The note is announced to a screen reader (`role="status"`). After the tabs, "Try again" is the
  next thing the keyboard reaches. If the cause is something else, this note isn't needed.

**Seen while looking, and possibly the cause: the header since #172 (the page tabs).**

1. On the Dashboard, at every width, the tabs sit on top of the strip that shows the book she
   is reading, the streak and the books read. They hide the top half of that strip.
2. At 390 px, while a search is on (the “the” · 3 ✕ chip in the header), the four tabs no
   longer fit next to the toolbar. They stack in a column down the left side of the shelf, over
   the books.
3. At 320 px the tabs wrap onto two rows. The second row (📅) covers the top of the first
   shelf's books.

All three have the same reason. On a phone the tabs sit inside the title column, which only
gets the width left over by the buttons on the right. The header's height also changes, but
the content below doesn't know about it. **If the developer finds #181 comes from this header**,
fix it like this, keeping the look:

- On phones (up to 720 px) the tabs get their own full-width row, under the title row and the
  buttons: one line of four 44 px round icon buttons. They fit easily at 320 px (4 × 44 px plus
  gaps is about 190 px). They never wrap, and they don't move when the search chip appears.
- Everything below the header (the bookcase's camera fit, the Dashboard's top strip, the other
  pages) starts under the header's real height, so the header hides nothing.
- Desktop (above 720 px) stays exactly as it is, apart from the Dashboard strip moving down
  clear of the tabs.

**If the cause is elsewhere**, leave the header alone in this task. The three points above
should then become a task of their own (architect).

**Keyboard and screen reader:** no change. The tabs stay a `nav` labelled "Pages", with
`aria-current="page"` on the current one, and each icon button keeps its name (Bookshelf,
Dashboard, Challenges, Calendar).

**Where to look (added 2026-11-21):** the deploy previews show the sign-in screen, so they may
have the production account server's address. Until the Engineer has confirmed they don't, the
review and the tester's screenshots come from a local dev server with no backend (shelf in the
browser) or a local PocketBase, never from signing in or adding books on a deploy preview.

# Test

# Log

- 2026-11-21 architect: Task written from #181; the report is one line, so the assumption is
  written in the Goal. Priority: first of the Requester's issues, because the shelf is the app.
- 2026-11-21 ux-designer: design written. Not reproduced on demo data in headless Chrome
  (390, 360 and 320 px; 12 and 300 books): the shelf showed. Found the page tabs covering
  content on phones, and the Dashboard strip at every width. The design says how to fix that if
  it is the cause, and adds an error note in case the cause is the 3D drawing failing.
- 2026-11-21 developer: Built in a draft pull request. **Cause, as far as it can be found
  without her phone:** not reproduced in headless Chrome (390, 360, 320 px). Two things only
  her real phone does, both new or made worse by the evening's merges:
  1. *Memory (most likely the main cause).* Every book painted three pictures for its covers
     (spine, back, and a stand-in front, the last two 640 px wide), whether they could be seen
     or not: about 5 MB per book. Measured in Chrome: 12 books 74 MB, 150 books 798 MB of
     painted pictures, plus as much again on the graphics chip. A phone's browser drops the
     3D drawing (WebGL context lost) or refuses new pictures long before that, and the app had
     no handling for either: the shelf area just stays empty. The evening's merges (#175,
     #176, #179: four parts per book, softer shadows, decorations) added load on top, which
     plausibly tipped her shelf over. With WebGL switched off, the whole page went blank.
  2. *The header when signed in.* The designer's runs had no account button; hers do. With it,
     the page tabs from #172 wrap to two rows at 390, 360 and 320 px (header 218 px), over the
     top shelf.
  **Fixed:** the back is painted only once a book is taken out, the stand-in front only when
  a book has no cover image or it failed (a plain colour until then): 150 books with covers
  now take 88 MB instead of 798 MB. The shelf is wrapped so a failure to start WebGL, a
  painting error or a lost context shows the Design's note ("The bookshelf can't be drawn on
  this phone right now." / "Your books are safe. The Dashboard, Challenges and Calendar still
  work." / "Try again", `role="status"`); "Try again" draws it from scratch. Phone header as
  designed: the tabs are a full-width row of their own, one line, also with the search chip
  and the account button (header 162 px at 390, 360 and 320); the camera keeps the crown and
  top shelf below the header's measured height; the Dashboard, Challenges and Calendar start
  under it at every width. Desktop shelf unchanged (compared with the designer's 1280 shot).
  Tests: `src/components/SafeBookshelf.test.tsx` (WebGL creation throws: note shown; Try
  again; context lost), `src/components/contextLoss.test.ts`, `src/lib/bookFaces.test.ts`,
  `topGap` in `src/lib/shelfLayout.test.ts`. Checks: `npm test`: 44 files, 290 tests passed;
  `npm run build`: built; `tsc --noEmit`: clean. Screenshots from a local dev server with no
  backend (320, 360, 390 px, search on, Dashboard, error note with WebGL off).
  **Unproven without her phone:** that memory was what her phone ran out of, and that the
  shelf now shows there. Deviation from the Design for the designer to judge: the keyboard
  reaches 🔍, ↻ and + Add between the tabs and "Try again" (the tabs stay inside the title
  block in the page's order, so desktop stays exactly as it is); the zoom buttons stay
  visible next to the note. Seen, not fixed (for the architect): at 1280 × 800 the desktop
  toolbar wraps under the title and sits over the top of the bookcase (also on `main`).
  Remaining: Hanna checks on her own phone that the bookshelf shows with her books.
