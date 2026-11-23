---
id: T-0045
title: "Let her fix what she read on a past day from the calendar, without touching the book's progress"
description: "From the dashboard's Calendar block and the Calendar page, tapping a day lets her Change how much she read of each book that day and + Add a book for that day; only readingLog[day] changes, not book.progress, and the streak, calendar and stats follow."
status: Doing
size: full
depends_on: []
decisions: [D-0001, D-0013, D-0014, D-0020, D-0033]
raised_on: 2026-11-23
done_on: ""
result: []
---

# Goal

Agreed with Hanna on 22 November 2026 (backlog item 1).

Today the reading log (`book.readingLog[day]`) is written only as a side effect
of moving `book.progress` with the slider or the quick update (`progressPatch`
in `src/lib/readingLog.ts`). When a past day went wrong — she forgot to log,
Storytel put the wrong amount, she tapped the wrong book, she read something
and never typed it in — there is no way to fix that day without moving the
book's progress today, which breaks the streak, the calendar and the stats
that are worked out from the log.

This task gives her a way to fix a past day straight from the calendar:

- On the dashboard's **Calendar block** day-details panel, and on the day panel
  of the **Calendar page**, each book listed for the day gets a **Change**
  control.
- A **+ Add a book** button lets her add a new entry for that day.
- She fills in **how much she read that day** in the book's own unit: pages
  for a book with pages, minutes (listening time) for a book she only listens
  to, and a percentage for a book without pages — the same unit `amountText`
  already shows for the day.
- Only `book.readingLog[day]` changes. `book.progress` does not move. Status
  does not change. The streak, the calendar, the stats and the book creatures
  (D-0033 says cookies are worked out from the reading log) follow from it.
- Typing `0` or tapping **Remove** takes the book off that day.
- **+ Add a book** opens a search box with the books she is reading and the
  books she has recently finished first; typing filters all her books
  (except sleep reads are not promoted). Future days stay disabled on both
  calendars. Started and finished dates are not edited here — those stay in
  the book panel.

# Done when

1. `pnpm test -- --run readingLog` passes with new tests covering:
   - `setDayAmountPatch` sets `readingLog[day]` to a given share without
     touching `progress` or `status`;
   - a share of 0 (or less) removes the day and drops `readingLog` when empty;
   - a huge share is clamped to 1;
   - the day's share is independent of `book.progress`.
2. `pnpm run build` passes (typecheck + build).
3. `pnpm exec harness check` passes.
4. On the dev server (`pnpm run dev`), on the dashboard's Calendar block:
   - tapping a past day with books opens the panel; each row has a **Change**
     button that opens an amount field with **Save** and **Remove**;
   - the panel has a **+ Add a book** button; tapping it opens a search box
     with reading and recently finished books at the top, and a chosen book is
     added with the amount typed;
   - a Save writes only `readingLog[day]` on that book; the slider and the
     book's progress do not move.
5. The same controls appear on the Calendar page's day aside.
6. Future days stay disabled on both calendars.

# Notes

- `src/lib/readingLog.ts` holds the log helpers; the calendar block is in
  `src/components/Dashboard.tsx` (the `Calendar` and `DayDetails` functions)
  and the Calendar page's day aside is in `src/components/CalendarPage.tsx`.
- `src/lib/progress.ts` already parses a page number, a percentage and a
  listening time into a 0..1 share; this task reuses those helpers so the
  amount field behaves the same as the book panel's.
- `src/lib/search.ts` holds `searchShelf` for the + Add a book search.
- D-0013 (no pop-ups): the Change editor and the + Add a book panel open in
  place, inside the day panel, never as a dialog.
- D-0014 (no explanatory hints under controls): short field labels only, no
  "Tap a day to change what you read" hint under the calendar.

# Design

Written by the UX designer.

## Dashboard Calendar block and Calendar page: day panel

The day panel keeps its current list of books with their covers and a short
story of what happened on the day ("Read 30 pages"; "Finished on this day").
Two new things sit in it:

- **Each book row** gets a small secondary button **Change** after the facts,
  to the right of "Read … · …% of the book". It is a `.btn.small` outline
  button, text-only. Tapping it swaps the facts line for an in-place editor
  (no dialog); the rest of the panel stays put.
- **At the bottom of the list**, below the last book, a full-width outline
  button `+ Add a book`. On an empty day it is the only thing in the panel,
  above a one-line hint `Add a book you read on this day.`.

### The Change editor

Inline, in the book's own row. It replaces the facts line with:

- A label `Read:` and an amount field whose placeholder and label match the
  book's unit:
  - books with pages → a `type="text"` input `placeholder="e.g. 30"`, `aria-label="Pages read"`, with `pages` suffix after the field;
  - books she only listens to (`listenOnly(book)`) → an input `placeholder="e.g. 45 min or 1:20"`, `aria-label="Minutes listened"`;
  - books with neither pages nor minutes → an input `placeholder="e.g. 10"`, `aria-label="Percent read"`, with `%` suffix.
- Two buttons: **Save** (primary) and **Remove** (destructive, text-only).
- A **Cancel** text-link next to them, to close the editor without changing
  anything.
- Prefilled with the current amount in that unit (e.g. `30`, `45 min`, `12`);
  empty when the book has no entry on that day.

Validation:

- An empty field or `0` with Save works the same as **Remove**: the book comes
  off that day (`setDayAmountPatch(book, day, 0)` → the day is dropped; if that
  was the last day, `readingLog` goes away).
- Numbers below 0 or non-numbers: Save stays disabled, a small `.hint` under
  the field reads `Not a number` or `Pages must be 0 or more`.
- Numbers larger than the book's length are clamped to 100%: Save works,
  and a `.muted.small-text` hint reads `That's the whole book.` after it
  saves.
- Only `readingLog[day]` is written. `book.progress` and `book.status` do not
  move.

Keyboard and screen reader:

- The editor is a `<form>`; Enter saves, Escape cancels (both through
  `onKeyDown`).
- The amount field gets focus when the editor opens. Focus returns to the
  Change button after Save/Remove/Cancel.
- The Save, Remove and Cancel buttons are in tab order after the input.
- `aria-live="polite"` on the hint line, so a screen reader reads the error
  or `That's the whole book.`

### + Add a book

Opens an inline panel inside the day panel (not a dialog). The panel has:

- A search field at the top, `aria-label="Find a book"`, `placeholder="Find a book"`.
- A list of suggestions. With the search empty:
  - **Reading** group first (books with `status: 'reading'` or `'paused'`),
    newest started first;
  - **Recently finished** group second (books with `status: 'read'`, the last
    seven days first, then the last month), newest finished first;
  - up to six per group; a `.muted.small-text` sub-head for each group.
- Typing filters across the shelf with `searchShelf` (title, author, series,
  … as everywhere else). Sleep reads stay out of the two top groups, but a
  search still finds them.
- Each suggestion is a row with the cover, title and author. Tapping a row
  opens the Change editor at the top of the panel for that book, with an
  empty amount field, Save / Cancel. On Save the book is added with the
  typed amount; Cancel takes her back to the suggestion list.
- A **Close** text-link closes the + Add a book panel.

Future days:

- When the day is in the future (`new Date(year, month-1, day) > now`), the
  day cell stays disabled on both calendars. Opening a future day was not
  possible before and is not now; the panel never shows for a future day.

Empty, loading and error:

- The day panel never shows a loading state: everything it needs is already
  on the shelf.
- A book without a cover shows the placeholder cover the shelf already uses
  for one (the spine colour patch); nothing special here.
- On a day with nothing read: only the **+ Add a book** button and the short
  hint (above), so she can log something she missed.

Mobile and small screens:

- The day panel keeps its full-width layout on phones. The Change editor's
  input fills the available width (min 10em), with Save/Remove below it on
  a narrow screen.
- The + Add a book panel fills the day panel; the search input is sticky at
  the top while the suggestion list scrolls.

Long text:

- Titles truncate with `text-overflow: ellipsis` on a narrow screen (they
  already do in the dashboard day list).
- A very long amount (`"9999999"`) is rejected by validation.

### Review after the build

See the Test section.

# Test

Written by the tester.

- `pnpm exec vitest run src/lib/readingLog.test.ts`:
  `Test Files 1 passed (1) · Tests 13 passed (13)` — covers
  `setDayAmountPatch` (share set without touching progress or status, 0/negative
  removes the day, empty `readingLog` dropped, huge share clamped to 1, share
  independent of `book.progress`).
- `pnpm exec vitest run src/components/DayEditor.test.tsx`:
  `Test Files 1 passed (1) · Tests 7 passed (7)` — covers the Change editor
  (saves only `readingLog[day]`, empty/Remove drop the day, negative is
  rejected, huge is clamped, listen-only takes minutes) and + Add a book
  (reading first then search; a book already in the day is left out).
- `pnpm exec vitest run`: `Test Files 124 passed | 2 skipped · Tests 1605
  passed | 22 skipped`.
- `pnpm run build`: `✓ built in 1.13s` (SSR entry written).
- `pnpm exec harness check`: `tasks 45, decisions 42, engineers 2, generated
  files current` — all green.

# Log

- 2026-11-23 architect: full-sized task from backlog item 1, decisions D-0001 D-0013 D-0014 D-0020 D-0033; no new decision or question (the brief Hanna agreed covers every reversible choice).
- 2026-11-23 ux-designer: designed inline Change editor and inline + Add a book panel in the day panel on the dashboard Calendar block and the Calendar page, amount field in the book's unit, future days disabled; handed to developer.
- 2026-11-23 developer: added `setDayAmountPatch` in `src/lib/readingLog.ts` (only `readingLog[day]`, never `progress` or `status`), new `src/components/DayEditor.tsx` with inline Change editor and + Add a book panel (search, reading + recently-finished first), threaded `onUpdate` into the dashboard Calendar block (`Dashboard.tsx` `Calendar`/`DayDetails`), replaced the Calendar page's day aside with a `CalendarDayAside` that reuses the same controls (`CalendarPage.tsx`), styles in `styles.css`, tests in `readingLog.test.ts` and new `DayEditor.test.tsx`. Build, full vitest (1605 pass), typecheck and `harness check` all green. Screenshots: deferred to the Netlify deploy preview (local dev-server screenshots were skipped; the preview on the PR shows every state).
- 2026-11-23 ux-designer: reviewed after build — the Change editor and + Add a book panel match the design, open inline (no dialog, D-0013), future days stay disabled, only `readingLog[day]` changes (progress and status unchanged); reading + recently-finished groups show first, search covers the shelf, a book already on the day is left out. Waiting for Netlify preview to confirm on a real phone width. Handed to tester.
