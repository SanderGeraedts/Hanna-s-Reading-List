---
id: T-0047
title: "Split the book panel into Reading, Notes, Details and Looks tabs"
description: "The book panel's thirty-odd controls move onto four tabs under the title — Reading, Notes, Details, Looks — with the merge section at the end of Details; the panel opens on Reading for every book and never remembers the last tab."
status: Done
size: full
depends_on: []
decisions: [D-0041, D-0013, D-0014, D-0020]
raised_on: 2026-11-23
done_on: 2026-11-23
result: ["https://github.com/SanderGeraedts/Hanna-s-Reading-List/pull/261"]
---

# Goal

The book panel is one long scroll. On a phone it is a bottom sheet, so "I'm at page 120" —
the thing Hanna does nearly every time she opens a book — is several screens down, under the
cover, the colour and the page edges.

Split it into four tabs under the title, exactly as D-0041 sets out: **Reading · Notes ·
Details · Looks**, with the merge section at the bottom of Details, and the panel opening on
**Reading** every time. Nothing is removed, renamed or re-worded; only the grouping changes.

This task is built together with T-0048 (tropes & characters) in one pull request: they both
rewrite the same component, and the Notes tab is where the tropes and characters land.

# Done when

1. `pnpm test` and `pnpm run build` pass, and `pnpm exec tsc --noEmit` is clean.
2. New tests in `src/components/BookPanel.tabs.test.tsx` show:
   - the four tabs are there, in the order Reading, Notes, Details, Looks;
   - the panel opens on Reading for a want-to-read book, a reading book and a finished book;
   - opening book A, switching to Details, then opening book B shows **Reading** again, and
     so does closing and reopening book A;
   - each field named in D-0041 §1 is under its tab and under no other (one assertion per
     tab, covering status, progress, rating, journal, lent, formats, series, back cover, the
     merge section, Change cover…, the spine colour and the page edges);
   - the title, the byline, the facts line, ×, Put back and Remove are reachable on **every**
     tab;
   - a half-typed series name, lent name and back cover are saved when she switches tab, not
     lost (the regression D-0041's guidance warns about).
3. Keyboard and screen reader: the tab row is a `tablist`; ← → move between tabs, Home/End to
   the first and last, and only the open tab is in the tab order. A test asserts the roles,
   `aria-selected` and the arrow-key move.
4. The UX designer has reviewed the built panel at 390 px and 1280 px on both wallpapers and
   written the review in *Design*.

# Notes

- The file is `src/components/BookPanel.tsx` (about 1100 lines). All the draft state
  (`seriesName`, `blurb`, `lentTo`, `pagesDraft`, `minutesDraft`, `isbnDraft`,
  `publishedDraft`, `titleDraft`, `genreDraft`) stays in `BookPanel` so that switching a tab
  cannot throw away what she typed; the tabs are sections of markup, not components with
  state of their own.
- The tab row reuses the project's existing `.tabs` / `.tab` classes in `src/styles.css`
  (see `AddBookDialog`). On a phone the four tabs must fit on one line at 390 px without
  scrolling sideways; the UX designer decides how (shorter labels are **not** allowed —
  D-0041 §6 keeps the words).
- The sheet behaviour (`useSheet`, `inspectPlacement.ts`) and the existing tests
  `BookPanel.sheet.test.tsx` must keep passing unchanged.
- `src/styles.css` is checked by `colours.test.ts` for contrast on both wallpapers (D-0020).

# Design

Written by the UX designer, 2026-11-23, before the build.

## The panel's shape

Top to bottom, the panel keeps three fixed zones with the tabs in the middle:

1. **The head** (unchanged): the sheet handle on a phone, the title with ✎,
   "Shorten to …", the "Was … · Restore" line, the byline, the facts line
   (`2008 · 412 pages · ISBN …`), the **Open in Storytel** / **Open the e-book**
   buttons, and the **×** at the top right.
2. **The tab row**, immediately under the head, above everything else.
3. **The open tab's panel**, scrolling as the panel scrolls today.
4. **The actions** at the very bottom, outside the tabs: **Put back** and
   **Remove**, exactly as now.

The `.side-pick` row (Front · Spine · Back) and `Change cover…` leave the head
and move into **Looks** (D-0041 §4).

## The tab row

Four tabs, in this order, with these exact words:

`Reading` · `Notes` · `Details` · `Looks`

- Reuses the project's `.tabs` / `.tab` / `.tab.active` classes, so it is the
  same row as the Add book dialog: a one-pixel `--border` line under the row,
  the open tab in `--text` with a two-pixel `--accent` underline, the others
  `--muted`.
- Full width of the panel, the four tabs sharing it evenly (`flex: 1`) rather
  than hugging their text, so the row reads as one control and every tab is an
  easy target. At 390 px the four labels fit on one line with
  `padding: 0.5rem 0.4rem`; the row never scrolls sideways and never wraps.
  On a touch screen each tab is `min-height: var(--tap)` (44 px).
- It sits just under the head and **above** the scroll, so switching tab is
  always one tap away, also on a phone sheet dragged small.
- No counts, no dots, no "3" badges on a tab: D-0014 (no explanatory hints)
  and the project's calm look. A tab with nothing in it for this book simply
  shows little.

## What is on each tab

**Reading** — "where am I in this book"

1. Status (`select`)
2. The did-not-finish "stopped at" line, when there is one
3. Progress (slider + Percentage / Page / Listening time), while reading or paused
4. Rating, Spice, Times read, Finished on — for a finished book or one read before
5. Started on

**Notes** — "what I thought and who was in it"

1. Journal (the existing read-only list of notes per day)
2. **Tropes** (T-0048)
3. **Characters** (T-0048)
4. Lent to a friend (and To / Since when it is on)
5. 🌙 Sleep read, and 🌙 The whole series when that applies

**Details** — "what this book is"

1. How I have it (format chips)
2. Price (only while she owns a copy)
3. E-book link
4. Series (name + number, suggestions, "Part of a series?")
5. Pages, and Length beside it for an audiobook
6. ISBN, Published
7. Language
8. Genres
9. Set in
10. Back cover + Find back text
11. **Merge** (the `MergeSection`), last

**Looks** — "how it stands on the shelf"

1. Front · Spine · Back
2. Change cover…
3. Spine colour
4. Page edges

## States

- **A want-to-read book:** Reading holds the status and Started on only; that
  is two controls on a nearly empty tab. That is right — she sees at a glance
  there is nothing to update yet. No empty-state text (D-0014).
- **A phone sheet dragged to its smallest:** the head plus the tab row stay
  visible; the open tab scrolls under them. The tab row never scrolls away.
- **Long content** (a long back cover, many finished dates): only the open
  tab's content scrolls; the tab row stays put.
- **Offline / loading:** nothing changes; the panel has no loading state today.
- **Reduce motion:** there is no animation on a tab change in any case — the
  new tab is simply shown. No sliding, no fading.

## Switching tab

- Tapping a tab shows that tab's panel at the **top** of the scroll area
  (the panel's scroll resets to the top of the tab's content, so Looks does not
  open halfway down).
- **Anything half-typed is saved first.** Switching a tab runs the same save
  the panel runs when it closes, so a series name, a lent name, a price, an
  ISBN, a page count or a back cover typed but not blurred is kept. This is the
  one thing that must not regress.

## Keyboard and screen reader

- The row is `role="tablist"` with `aria-label="Book details"`; each tab is
  `role="tab"` with `aria-selected`, and each panel is `role="tabpanel"` with
  `aria-labelledby` pointing at its tab and `tabIndex={0}` so it can be scrolled
  from the keyboard.
- **Roving tabindex:** only the open tab is in the tab order
  (`tabIndex={0}`, the others `-1`). ← → move to the previous/next tab and wrap
  around; Home and End jump to Reading and Looks. Moving focus opens that tab
  (the usual "automatic activation" pattern, which fits here because no tab
  costs anything to open).
- Tab (the key) from the tab row goes into the open tab's first field, not to
  the next tab.
- Escape still closes the panel, as today.
- The × and the title keep their labels; a screen reader reads, in order:
  "Details for <title>" (the panel's label), the title, the byline, then
  "Book details, tab list, Reading, selected, 1 of 4".

## Wording

Only four new words in the interface: **Reading**, **Notes**, **Details**,
**Looks**. Everything else keeps the words it has today.

## Screenshots the developer takes

1. `panel-tabs-reading-390.png` — a book she is reading, Reading tab, 390 px, lavender
2. `panel-tabs-notes-390.png` — the same book, Notes tab, 390 px, lavender
3. `panel-tabs-details-390.png` — the same book, Details tab (scrolled to the merge section), 390 px, lavender
4. `panel-tabs-looks-390.png` — the same book, Looks tab, 390 px, lavender
5. `panel-tabs-reading-1280.png` — a finished book, Reading tab, 1280 px, lavender
6. `panel-tabs-details-1280.png` — a finished book, Details tab, 1280 px, lavender
7. `panel-tabs-want-390.png` — a want-to-read book, Reading tab (the near-empty state), 390 px
8. `panel-tabs-reading-midnight-1280.png` — Reading tab, 1280 px, midnight-blue wallpaper
9. `panel-tabs-looks-midnight-390.png` — Looks tab, 390 px, midnight-blue wallpaper

## Review after the build, 2026-11-23

Looked at the nine screenshots in [`T-0047-screens/`](T-0047-screens/) (taken as `.jpg`),
state by state, against the design above.

**Matches**

- The row is the four tabs in the right order, with the project's `.tabs` look: the open tab
  in `--text` with the gold underline, the others muted, one `--border` line under the row.
  At 390 px all four labels sit on one line with room to spare (`panel-tabs-reading-390`),
  and nothing scrolls sideways.
- The row sits under the facts line and above the fields, on the phone and on the computer.
- **Reading** for a reading book is status + progress (slider, %, page, listening time) +
  Started on, and nothing else (`panel-tabs-reading-390`). For a finished book it is the
  rating, the spice, the times read and the dates (`panel-tabs-reading-1280`).
- **Notes** is journal → tropes → characters → lent → sleep read
  (`panel-tabs-notes-390`, `tropes-notes-1280`).
- **Details** is formats → price → e-book link → series → pages → ISBN/published → language
  → genres → Set in → back cover → merge (`panel-tabs-details-390`, `-1280`).
- **Looks** is the sides, Change cover…, the spine colour and the page edges
  (`panel-tabs-looks-390`).
- The title, the byline, the facts line, × and Put back / Remove are on every tab.
- The near-empty Reading tab of a want-to-read book (`panel-tabs-want-390`) reads as
  intended: the status, Started on, and nothing invented to fill it.
- Both wallpapers are the same panel; the gold underline reads clearly on the midnight-blue
  one (`panel-tabs-reading-midnight-1280`, `panel-tabs-looks-midnight-390`).

**Differences, none blocking**

- The ✎ rename button sits on its own line under the title on a phone. That is how the panel
  has always been; it is not something these tabs changed. Not for this task.
- The tab row is sticky inside the panel, which the design did not ask for by name but
  follows from "switching tab is always one tap away, also on a phone sheet dragged small".
  Kept.

**Verdict: pass.** Handed to the tester.

# Test

Written by the tester, 2026-11-23.

## The checks, as run

```
$ pnpm exec tsc --noEmit
(no output)

$ pnpm test
 Test Files  132 passed | 2 skipped (134)
      Tests  1693 passed | 22 skipped (1715)

$ pnpm run build
✓ built in 941ms (client) · ✓ built in 817ms (server)

$ pnpm exec harness check
✓ tasks: 48 tasks, index in step
✓ decisions: 45 records, index complete, 3 overrules valid
✓ engineers: 2 listed
✓ generated files: current
```

The new and affected files, run three times over (no `--repeat-each` in vitest 5; three
whole runs instead), all 84 tests passing each time, nothing flaky:

```
$ pnpm exec vitest run BookPanel.tabs BookPanel.tabs.break BookPanel.sheet TropesField TropesCard tropes characters   (×3)
 Test Files  9 passed (9)
      Tests  84 passed (84)      (identical on all three runs)
```

## What was tried to break it

In `src/components/BookPanel.tabs.break.test.tsx` (5 gap tests):

- **The same tab twice, and a quick run round all four.** Stays on the tab tapped last, and
  only ever one `tabpanel` is in the document — the closed tabs are not rendered at all, so
  nothing hidden can be tabbed into or read out.
- **Arrow keys move focus, not only the open tab.** After ← → the roving `tabindex` follows:
  the open tab is 0, the others −1, and `document.activeElement` is the new tab.
- **Keys it has no business with** (↑ ↓ PageDown, a letter, space) leave the tab alone.
- **Closing the panel from Details** still saves a series name typed and not blurred: the
  unmount save runs whatever tab was open.
- **The tropes and characters fields on Notes** add through the panel's own `onUpdate`.

Checked by hand in the twelve tests of `BookPanel.tabs.test.tsx`: the tab order, the open tab
for a want-to-read / reading / finished book, that the next book and a reopened book both
start on Reading, which field is on which tab (status, progress, rating, journal, lent,
formats, series, back cover, merge, Change cover…, spine colour, page edges), that the title,
byline, ×, Put back and Remove are on every tab, and that a half-typed series name, lent name
and back cover survive a tab switch.

**What still works:** `BookPanel.sheet.test.tsx` (T-0037's phone sheet heights) passes
unchanged — the tab row is inside the sheet and does not change its height rules.

**Regressions found and fixed in this pull request:** the badge grid tests and one dashboard
layout test carried the old counts (72 badges, the Fun column without `tropes`); they were
updated to 75 and to the new default column, and the trope family was moved to the end of the
visible badges so the badge order the tests pin (`countries-5` after `authors-50`, `rated-10`
after `lands-10`) still holds. `tsc --noEmit` was failing on `main` from an earlier task (an
unused `within` import in `DayEditor.test.tsx`); that is fixed here too.

**Verdict: passed.** Nothing remains for a human.

# Log

- 2026-11-23 architect: wrote the task from the backlog item "Book panel tabs" agreed with Hanna on 22 November 2026; recorded D-0041 (four tabs, opens on Reading, merge at the end of Details, title and actions outside the tabs); size full. Built together with T-0048 in one pull request. Handed to the UX designer.
- 2026-11-23 ux-designer: designed the four tabs, their contents, the keyboard and screen-reader pattern and the screenshot list.
- 2026-11-23 developer: built the tab row and the four tab panels in BookPanel.tsx (fields mounted only for the open tab, every draft still held by the panel and saved on a switch), moved the Suggestions row to its own component, added .panel-tabs CSS, and wrote BookPanel.tabs.test.tsx (12 tests). Also fixed the `tsc --noEmit` error left on main (an unused `within` import in DayEditor.test.tsx). Checks: `pnpm exec tsc --noEmit` clean; `pnpm test` 130 passed, 2 skipped (1671 tests); `pnpm run build` ✓ built in 931ms; `pnpm exec harness check` all ✓. Screenshots in T-0047-screens/.
- 2026-11-23 ux-designer: reviewed the built panel at 390 and 1280 on both wallpapers — pass, no blocking differences.
- 2026-11-23 tester: passed; 5 gap tests on the tab row, the checks re-run from clean, the new files run three times with no flakiness, Done.
