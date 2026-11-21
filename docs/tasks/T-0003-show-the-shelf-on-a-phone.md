---
id: T-0003
title: "Show the bookshelf again on a phone"
description: "#181: the shelf isn't shown in the mobile version; find what broke it on narrow screens and fix it, with a test that keeps it fixed."
status: Doing
depends_on: [T-0001]
decisions: [D-0002, G-0019]
raised_on: 2026-11-21
done_on: ""
result: ["https://github.com/SanderGeraedts/Hanna-s-Reading-List/pull/198", "https://github.com/SanderGeraedts/Hanna-s-Reading-List/pull/206", "https://github.com/SanderGeraedts/Hanna-s-Reading-List/pull/207", "https://github.com/SanderGeraedts/Hanna-s-Reading-List/pull/208"]
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

## Review after building (2026-11-21)

**What I looked at.** The developer's screenshots (320, 360, 390 px: shelf, search "the" on,
Dashboard; 768 and 1280: shelf and Dashboard; the error note at 320, 360, 390; the header
signed in before and after; 150 books). I also ran the branch (`c5dad26`) myself on a local
dev server with no backend (12 demo books, headless Chrome) at 320 × 640, 390 × 844 and
1280 × 800: took a book out with a tap, turned it round, put it back with Esc, and with WebGL
switched off checked the note and the keyboard order. The app has one colour scheme, so there
is no light/dark pair to compare.

**Matches the Design.**

- *Phone header:* ☰, the title and the count (cut off with "…" at 320) on top, 🔍 ↻ "+ Add"
  on the right, and the four round tabs on a full-width row of their own, 📚 in gold. One row
  at 320, 360 and 390, also with the search chip ("the" · 3 ✕) and with the account button
  (H). Before the fix, signed in, the tabs wrapped to two rows (📅 alone at 390 and 360, two by
  two at 320) and sat over the crown and the top shelf; that is gone.
- *Bookshelf on a phone:* the bookcase fills the width, the crown and the top shelf start under
  the header, the top shelf's spines are readable on the first screen, zoom buttons bottom
  right. Same at 150 books.
- *Taking a book out:* the book comes up above the details sheet and clears the header at 320
  and 390. Turned round, its painted back (blurb, barcode) shows; Esc puts it back.
- *Dashboard:* the strip with the books being read starts fully under the tabs at 320, 360,
  390, 768 and 1280.
- *Desktop:* the 1280 shelf is the same as on `main` (compared with the `main` shot from the
  T-0004 run).
- *Error note:* the exact words of the Design, centred, each line in the empty-shelf note's
  pill, gold "Try again", announced through `role="status"`.

**Differences, and whether they block.**

1. *Keyboard order with the note:* tabs, then 🔍, ↻ (Storytel), "+ Add book", then "Try
   again" (on desktop also Sort, Genre, What next). The Design said "Try again" comes right
   after the tabs. **Accepted, doesn't block.** The header keeps one order on every width,
   the buttons are only three stops, and a screen reader hears the note as soon as it shows.
2. *Zoom buttons stay next to the note.* Only "Zoom in" can be reached (− and ⤢ are disabled
   at the whole-case view), and it does nothing visible while the shelf can't be drawn.
   **Doesn't block** for a state that should be rare; better hidden. Follow-up below.
3. *The note says "on this phone" also on a computer* (seen at 1280). My wording. **Doesn't
   block**; follow-up below.
4. *Plain colour on backs and fronts until a book is taken out.* On the shelf the camera
   looks at the spines; the covers face the neighbouring books, and only the last book in a
   row shows a sliver of its side. That sliver is now the book's own colour, which reads as a
   cloth board. I could not see a difference from `main` at 320, 390 or 1280, nor with 150
   books. A book with a cover picture shows the plain colour only for the moment until its
   picture loads (before, the painted stand-in showed for that moment); a book without one
   still gets the stand-in front. When taken out, the back is painted at once and showed when
   I turned it. **Not visible in normal use, not jarring; accepted.**

**Seen, outside this task (for the architect, as a separate task).** At 1280 × 800 the
desktop toolbar (🔍, Arrange by, Genre, What next?, ↻, + Add book) wraps under the title and
tabs and lies over the crown and the fairy lights; the "Genre" label disappears behind the
lights. It is the same on `main`, this pull request doesn't change it, and the books are not
covered, so it should not hold up #181. Proposed task: on desktop the header's real height
also moves the bookcase down (as on phones now), or the toolbar gets its own row above the
case. The same task can hide the zoom buttons while the shelf can't be drawn, and say
"on this device" instead of "on this phone" in the note.

**Verdict: matches the Design. Passed to the tester.** Still unproven, as the developer says:
whether the shelf now shows on Hanna's own phone.

# Test

Tester, 2026-11-21, in a fresh worktree of `origin/t-0003-phone-shelf` (`e8e423c`).

**Merging `main` first.** `main` had moved on by T-0004 (`e0ab043`, #195), which also changes
`src/components/textures.ts`. `git merge origin/main`: `textures.ts` merged by itself (T-0004
changes `paintSpine`, this branch adds `plainTexture` further down), and the only conflict was
the generated `docs/tasks/index.md`, which I regenerated with `harness tasks-index`. No code
conflict. Everything below ran on the merged tree.

**Merging `main` a second time** (`7218df3`). While I tested, T-0005 (#197, search matches),
T-0007 (#196, e-book link) and D-0006 to D-0020 merged. T-0005 changes `BookMesh.tsx` too,
but in other places (the match glow and `bookLight`), so it merged by itself, and again
only the generated index conflicted (regenerated). On that tree: `npm ci`; `npm test` "Test
Files 50 passed (50)", "Tests 322 passed (322)"; `npm run build` "✓ built in 1.79s";
`tsc --noEmit` clean. On the dev server at 390, 320 and 1280: search "dune" lights up Dune
and dims the rest (T-0005), the tabs stay on one row, a book taken out shows its painted
back, no note.

**Commands, with their output**

- `npm ci`: installed (one warning: esbuild's install script isn't in `allowScripts`).
- `npm test`, five full runs: three "Tests 293 passed (293)", one "Tests 1 failed | 292 passed
  (293)", the first run "2 failed | 291 passed". The failure I could see is
  `shelfLayout.test.ts > is quick enough to run on every change` ("expected 274.16 to be less
  than 250", once "322.38"). It's a timing test on `fitShelf`, which this branch doesn't change.
  It's flaky on `main` too: alone on `origin/main` it failed 1 in 6 runs ("expected 297.99 to be
  less than 250"), and on this branch 2 in 5. **This change didn't cause it.** It needs a
  task of its own (architect), or CI can turn red at random.
- `npm run build`: built. `npx tsc --noEmit`: clean.
- `harness check`: tasks ✓ (index in step), decisions ✓, engineers ✓. Six "generated files ...
  missing or stale" lines (`.claude/agents/*`, `.githooks/pre-push`, `.claude/settings.json`).
  `main` shows the same six. They wait for the harness adoption (#192), a code-owned change,
  and this pull request doesn't touch them.
- CI on the pull request: see the pull request after the merge commit was pushed.

**The Done-when, locally instead of on the deploy preview** (#193: nothing signed in or added
on the preview). I used a local dev server (`vite dev`, no `POCKETBASE_URL`, no `.netlify` link,
shelf in the browser) and headless Chrome with phone emulation (touch, `isMobile`).

- Added the two books through the app at 390 × 844: search "Dune" → "Dune, Frank Herbert", Add;
  ISBN `9780140328721` → "Added to the shelf." (Fantastic Mr. Fox). Both show on the top
  shelf, spines readable, the crown and top shelf below the header (162 px), and the zoom
  buttons bottom right. The same at 360 × 800 and 320 × 640. Screenshots:
  [390](T-0003-screens/shelf-390x844.jpg), [360](T-0003-screens/shelf-360x800.jpg),
  [320](T-0003-screens/shelf-320x640.jpg), [1280](T-0003-screens/shelf-1280x800.jpg),
  [a book taken out at 390](T-0003-screens/book-out-390x844.jpg),
  [the error note at 390](T-0003-screens/error-note-390x844.jpg).
- Swiping: a touch swipe (fast pointer events) scrolls the shelves at 390 × 844 with 40 books:
  up, up again, back down. Note on the method: Chrome's own slow touch emulation (CDP, one
  event per frame under software drawing) didn't scroll on this branch *or* on `main`. On
  `main` it even turned into a long-press that moved a book. So that method can't tell, and I
  used the fast one. The mouse wheel scrolls on both.
- A tap takes a book out at 390, 360 and 320 ("Details for Dune"; the book stays above the
  sheet, below the header). Esc puts it back, and so does a tap on the room. At 1280 a click
  takes Dune out; Esc and a click on the room put it back.
- 1280 × 800: the same as `main`, side by side with the same two books (crown, shelves,
  koala, toolbar, all in the same place; the pixel differences are the twinkling lights).
- The cause is named in the pull request and in the *Log* (memory, and the signed-in header).
- Tests that fail before and pass after: `SafeBookshelf.test.tsx`, `contextLoss.test.ts`,
  `bookFaces.test.ts`, `topGap` in `shelfLayout.test.ts`, all in the 293.
- The UX designer's review is there (passed).
- Header, signed out, with search on (typed "the", closed the box, the chip "the" · 12 ✕
  stays): the four tabs are on one row (all at y = 109) at 390 and 320, header 162 px, no book
  covered. **Signed in** on a local throwaway PocketBase (0.40.6, copied binary, account
  `test@example.com`, two books added there): with the account button, one row of tabs at 390,
  360 and 320, header 162 px, also with the search chip; at 1280 one row as before. The only
  outside addresses the browser contacted were the font servers.
- Dashboard at 390, 320 and 1280: the strip with the books being read starts fully below the
  tabs, and nothing overlaps.

**What I tried to break**

- *WebGL switched off* (`--disable-webgl --disable-3d-apis`) at 320, 390 and 1280: the note
  shows with the Design's words, `role="status"`. "Try again" brings the note back (WebGL is
  still off), and the Dashboard still works. Keyboard order: tabs, 🔍, ↻, + Add, then "Try
  again" (as the designer accepted).
- *Lost drawing while the shelf is open* (`WEBGL_lose_context.loseContext()`), twice in a row:
  the note shows each time. "Try again" draws the shelf again with a live context, and after
  two rounds a tap still takes a book out.
- *Lost drawing while a book is taken out* (the moment the back gets painted, so a likely
  moment on a phone): the note shows, but the details sheet stays open over its lower half,
  and at 390 and 320 "Try again" is under the sheet and can't be tapped. Esc or the sheet's ✕
  closes it, and then "Try again" works and the shelf comes back. **Doesn't block** (she can
  still get out, in one more tap), but better: close the sheet when the shelf fails. A
  follow-up for the architect, together with the designer's (zoom buttons next to the note,
  "on this phone" on a computer).
- *Take out, turn round, put back, take out again* at 390: the back (blurb, barcode) shows
  when turned with "Back" and with →. The 640 px pictures went 8 → 11 when taken out, stayed 11
  when put back and when taken out again, so the back is painted once and kept. At 1280:
  2 → 3, the back is painted.
- *A cover that fails to load* (a cover address that gives 404), next to a book with a cover and
  one without: two stand-in fronts get painted (the failing one and the one without). The book
  with a cover gets none.
- *Memory*, measured like the developer (2D canvas pixels × 4, at 390 × 844), branch vs `main`:
  12 books 46 vs 74 MB; 150 books with covers **88 vs 798 MB**; 200 with covers 113 vs
  1060 MB; 150 books *without* covers 443 vs 798 MB. Each book without a cover still paints a
  640 px stand-in front, so a big shelf of coverless books stays heavy. Most of her books come
  from Open Library with a cover, so it doesn't block. Worth knowing if her phone still fails.
- *Rotating and resizing* one page: 390×844 → 844×390 → 390×844 → 320×640 → 1280×800 →
  390×844. The canvas follows each size, `--header-h` follows (193, 162, 162, 189, 162 px),
  and no note shows.
- *Switching pages* back and forth (Dashboard, Challenges, Calendar, Bookshelf, Dashboard,
  Bookshelf) at 390, 320 and 1280: the shelf is back each time, with no note.
- *T-0004 after the merge*: the lettering on dark spines is light (white) and on light spines
  dark, with gold bands (zoomed screenshot at 390). `textures.test.ts` from T-0004 passes.
- *Code-owned paths*: the diff with `main` touches none of them (`.github/`, `netlify/`,
  `netlify.toml`, `deploy/nas/`, `CLAUDE.md`, `.claude/`, `docs/hanna-guardrails.md`,
  `src/lib/shelfMerge.ts`, `src/server/shelf.ts`).

**Verdict: passed.** Nothing remains for the team. Still open, and Hanna's to check: that the
bookshelf now shows on her own phone. So the task stays *Doing*, and #181 stays open
(`Refs #181`).

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
- 2026-11-21 ux-designer: reviewed: matches the Design, passed to the tester. Phone header
  one row at 320, 360, 390 (signed in, search on), Dashboard strip clear, desktop unchanged,
  error note as designed; plain-colour covers not visible on the shelf. Not blocking: keyboard
  reaches the header buttons before "Try again"; zoom buttons and "on this phone" in the note;
  the desktop toolbar over the crown (also on `main`), proposed as a separate task.
  Remaining: Hanna checks on her own phone that the bookshelf shows with her books.
- 2026-11-21 tester: passed. Merged `main` (T-0004) in: only the generated index conflicted,
  regenerated, twice (T-0004, then T-0005 and T-0007); T-0004's white spine lettering and
  T-0005's search glow still show. Done-when run locally (no preview
  sign-in, #193), signed in on a local throwaway PocketBase; WebGL off, lost context twice,
  rotating and 150 books (88 MB, was 798) tried. For the architect: the flaky timing test
  `is quick enough to run on every change` (also on `main`), and "Try again" lying under an
  open details sheet when the drawing is lost while a book is out (Esc or ✕ gets her out).
  Remaining: Hanna checks on her own phone that the bookshelf shows with her books.
- 2026-11-21 developer: Hanna checked on her own phone (Android, Chrome): still the "can't be drawn" note, so the phone still runs out of graphics memory with her real shelf. Second fix: cover images are loaded only once a book is taken out (they face the next book on the shelf), shrunk to at most 512 px; the stand-in front is painted only then too; spines are painted at 0.55 of the sharpness on phones. Checked locally (no backend) at 390 × 844, touch, 2.6× pixels, 400 books with covers: the shelf draws, no cover is fetched until a book is taken out, then its cover shows sharp; no page errors.
  Remaining: Hanna checks on her own phone that the bookshelf shows with her books.
- 2026-11-21 developer: after #206 Hanna still sees the note on her phone (Android, Chrome). Third change: on phones no shadows, 1× pixels, no antialiasing, and each book's spine/back/stand-in canvas is freed once it is on the graphics chip (Chrome on Android caps all canvases on a page). The note gets a "Details" line saying how it failed (the error, or "lost after N s"), the number of books, the screen, the largest texture and the graphics chip, so the next step is based on her phone, not a guess. Checked locally at 390 × 844 with 400 books: the shelf draws, a lost context shows the Details line.
  Remaining: Hanna opens the shelf on her phone; if the note still shows, she sends the Details line.
- 2026-11-21 developer: Hanna asked for the old version on the phone, since that worked. On phones each book is one simple block again, as before the hardcovers of 19 November (one piece to draw instead of about nine: pages, two boards, spine and four ridges); the computer keeps the hardcovers. Checked locally: phone size shows the blocks with 400 books, desktop the hardcovers.
  Remaining: Hanna opens the shelf on her phone; if the note still shows, she sends the Details line.
- 2026-11-21 developer: with #207 the note's Details on Hanna's phone said "Error creating WebGL context … no WebGL": Chrome had blocked WebGL after the earlier crashes. After force-stopping Chrome the shelf showed, but it lagged and stuttered when turning a book. Fourth change, for smoothness: the shelf stops drawing while another page lies over it (it drew about 25,000 calls a second behind the Dashboard); on phones only the main light, still decorations, and on the shelf each book is drawn in two parts (paper and spine) instead of six, medals without their rim; fairy-light bulbs and ivy leaves are instanced (all phones and computers); on phones the back and stand-in front are painted at 0.6 of the size and without grain. Built app, 114 books at 443 × 824: draw calls on the shelf down from about 78,600 to 32,000 per 3 s, 0 behind the Dashboard.
  Remaining: Hanna checks on her phone that the shelf scrolls and turns books smoothly.
- 2026-11-21 developer: Hanna saw blurry spine titles on her phone. Undone two savings from #206/#207 that were only needed while the cause looked like memory: spines are painted at full sharpness again, and phones draw at up to 1.5 pixels per screen point instead of 1. Side-by-side close-ups: titles clearly sharper; draw calls unchanged (~34,000 per 3 s).
  Remaining: Hanna checks on her phone that the shelf is smooth and the titles sharp.
