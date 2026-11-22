---
id: T-0024
title: "Let the want-to-read pile's pace line follow the All · Paper · E-book · Audiobook switch"
description: "With Paper, E-book or Audiobook picked in the Want-to-read pile block, the pace line counts only the waiting books of that kind at the pace she finishes books of that kind (D-0031); Audiobook works in hours (waiting listening time ÷ hours of audiobooks finished a month); a kind she hasn't finished in the last year gets a short no-pace line; All stays as it is."
status: Open
depends_on: [T-0023]
decisions: [D-0008, D-0010, D-0014, D-0020, D-0022, D-0030, D-0031]
raised_on: 2026-11-22
done_on: ""
result: []
---

# Goal

Hanna asked in issue #233 ("TBR Pile") and agreed in a feature chat (2026-11-22): the pace line in
the **Want-to-read pile** block should follow the switch T-0023 added. Today the switch changes only
the height line; the pace line under it always says the whole pile, e.g. "At your pace of 1.1 a
month, that's about 5 years of reading." She decided, and D-0031 records it:

1. With **📖 Paper** or **📱 E-book** picked, the pace line counts only the waiting books of that
   kind, at the pace she finishes books of that kind: "At your pace of 0.6 paper books a month,
   that's about 3 years of reading."
2. With **🎧 Audiobook** it works in **hours**: the waiting listening time (the same total as the
   🎧 line) at her pace of hours listened a month: "At your pace of 14 h a month, that's about
   5 years of listening."
3. **All** stays exactly as it is now.
4. A kind she hasn't finished recently has **no pace**: a short line says so, instead of dividing
   by zero.
5. **Kinds** are the switch's (T-0023 / D-0030): a book counts in every kind it has.

## 1. How the pace is worked out today (and stays for All)

`wantPile` in `src/lib/insights.ts`, shown by `PileCard` in `src/components/DashboardExtras.tsx`:

- **Which finishes:** `allFinishes(books)` (`src/lib/stats.ts`): one per time a book was finished,
  so a **re-read counts each time**; a finish only counts when it has a **day**.
- **Which period:** the day is **after the same date a year ago** and **not after today**
  (`f.day > yearAgo && f.day <= today`), local dates.
- **Which books:** every book, whatever its status now. **Sleep reads count** (nothing filters
  `sleepRead` / `sleepSeries`), and so do books with only Other or no format.
- **Pace:** that number ÷ 12 (`perMonth`). **Months:** `ceil(waiting books ÷ perMonth)` when the
  pace is above 0 and the pile isn't empty.
- **Shown:** `perMonth.toFixed(1)` with a trailing ".0" dropped ("1.1", "1", "0.1"); the time is
  "N month(s)" under 12 months, otherwise "about N year(s)" (`Math.round(months / 12)`), through
  the block's `plural` helper.
- **No pace** (no finish with a day in the year) and a non-empty pile: the muted small line
  "Once some books have a “Finished on” date, this shows how long the pile would take."
- **Empty pile:** no pace line.

All of this stays for **All**, words and numbers unchanged.

## 2. The pace of a kind (D-0031)

The same finishes and the same period as All, only those of books of that kind. The kind of a
book is `bookKinds(book)` from `src/lib/pileHeight.ts` (through `formatsOf`, so an old Storytel
import counts as Audiobook), taken from its formats today; a book counts in **every** kind it has,
for the waiting books and for the finishes. A finished book with only Other or no format counts in
All only.

| Kind | Waiting | Pace a month | Time |
|---|---|---|---|
| 📖 Paper | want-to-read books with a paper format | finishes of paper books in the period ÷ 12 | `ceil(waiting ÷ pace)` months |
| 📱 E-book | want-to-read e-books | finishes of e-books in the period ÷ 12 | `ceil(waiting ÷ pace)` months |
| 🎧 Audiobook | the 🎧 line's total: `audioMinutes` summed over want-to-read audiobooks (`minutes`, else `pages × 2`, else 560) | `audioMinutes(book)` summed over each finish of an audiobook in the period ÷ 12, in minutes | `ceil(waiting minutes ÷ pace minutes)` months |

- A **re-read** of an audiobook adds its minutes again; a **sleep read** counts; a finish without a
  day doesn't, exactly as for All.
- The months become words as for All: under 12 → "N month(s)", otherwise "about N year(s)".
- The 🎧 waiting total is the same number the 🎧 height line shows (`pileHeights(books).audioMinutes`).

## 3. The line

| Choice | Line |
|---|---|
| All | At your pace of `<n>` a month, that's `<time>` of reading. (as now) |
| Paper | At your pace of `<n>` paper books a month, that's `<time>` of reading. |
| E-book | At your pace of `<n>` e-books a month, that's `<time>` of reading. |
| Audiobook | At your pace of `<h>` h a month, that's `<time>` of listening. |

- `<n>` is written as for All (`toFixed(1)`, ".0" dropped). When it shows exactly "1": "1 paper book
  a month", "1 e-book a month".
- `<h>` is the pace in hours (minutes a month ÷ 60), written the same way ("5.1", "14"), at least
  "0.1" so a tiny pace never shows "0". A non-breaking space between number and "h", and heard in
  full through `.visually-hidden`, like T-0023's times: "5.1 hours", "14 hours", "1 hour".
- **No pace for a kind** (no finish of that kind with a day in the period), as a muted small line
  like All's no-pace line:
  - "You haven't finished a paper book in the last year, so there's no pace yet."
  - "You haven't finished an e-book in the last year, so there's no pace yet."
  - "You haven't finished an audiobook in the last year, so there's no pace yet."

  This line shows on a kind even when no book at all has a finish day; All keeps its own line then.
- A kind is only reachable when it has waiting books (its button only shows then, T-0023), so a
  kind line never has 0 waiting books. The Audiobook total is always above 0 (560 per book at
  least).
- The UX designer may refine the words and decide how the change is announced (the height line is
  a polite live region while the switch shows; the pace line now changes with it too), keeping
  the numbers, "of reading" / "of listening" and plain language.

# Done when

The **pace shelf**, used by the unit and component tests (dates relative to the test's "now"; in
`insights.test.ts` NOW is 7 November 2026, in the component test use `daysAgo`):

- finished in the last year: **P1–P6** paperbacks (one finish each); **E1–E3** e-books; **S1**
  Storytel, `minutes: 600`, finished **twice**; **S2** Storytel without pages or minutes; **X**
  paperback + Storytel, `pages: 300, minutes: 720`; **Z** Storytel, `sleepRead: true`,
  `minutes: 1200`; **O** only Other;
- not counted: **Old** paperback finished exactly a year ago in the unit test (2025-11-07) and `daysAgo(400)` in the
  component test (365 days can fall inside the year in a leap year);
  **N** paperback with `status: 'read', readCount: 1` and no finish day;
- want to read: **W1–W11** paperbacks of 300 pages; **WE** e-book of 300 pages; **WS1**, **WS2**
  Storytel with `minutes: 600`; **WX** paperback + Storytel, `pages: 300, minutes: 720`.

Expected: All 15 finishes → 1.25 a month, 15 waiting → 12 months. Paper 7 finishes (P1–P6, X) →
0.583 → "0.6", 12 waiting (W1–W11, WX) → 21 months → "about 2 years". E-book 3 → 0.25 → "0.3"
(`toFixed(1)`, as for All), 1 waiting → "4 months". Audiobook 3,680 min finished (S1 600 × 2, S2 560,
X 720, Z 1,200) → 306.7 min a month → "5.1 h", 1,920 min waiting (600 + 600 + 720) → 7 months.

- **Unit tests** in `src/lib/insights.test.ts` (function names are the developer's):
  - the existing `wantPile` test passes unchanged (All is unchanged);
  - the pace shelf gives the numbers above for each kind: finishes / minutes a month and months;
  - Z (a sleep read) counts: without it the Audiobook pace is 2,480 min → 3.4 h and 10 months;
  - S1's re-read counts twice; Old and N don't count; O counts in All only; X counts in Paper and
    in Audiobook (its 720 minutes);
  - an old Storytel import (only `storytelId`) finished in the period counts in Audiobook;
  - a kind with no finish in the period has no pace and no months (no division by zero, no
    `Infinity` or `NaN`);
  - the line texts: "At your pace of 0.6 paper books a month, that's about 2 years of reading.",
    "At your pace of 0.3 e-books a month, that's 4 months of reading.", "At your pace of 5.1 h a
    month, that's 7 months of listening."; 12 paper finishes give "1 paper book a month"; 720 min
    of audiobooks finished in the period gives "1 h a month", heard "1 hour"; an audiobook pace
    under 0.05 h shows "0.1 h"; the three no-pace lines exactly as in section 3.
- **Component tests** in `src/components/PileCard.test.tsx`, updated:
  - on the pace shelf, All shows "At your pace of 1.3 a month, that's about 1 year of reading."
    (the current line); pressing Paper, E-book and Audiobook shows the three lines above, and
    pressing All brings the All line back;
  - the Audiobook line is seen with a non-breaking space ("5.1 h") and heard "At your pace of
    5.1 hours a month, that's 7 months of listening.";
  - on `mixed()` (its only finished book has no format) Paper, E-book and Audiobook each show their
    no-pace line, and All shows the current pace line;
  - with no finish day at all and a mixed pile: All shows the current "Once some books have a
    “Finished on” date…" line, a kind shows its no-pace line;
  - a pile with one kind only (no switch) shows the All line only;
  - the test "the rest of the block shows the whole pile and does not change with the switch" is
    updated: "books waiting", the pages · listening line and the motivation part still don't change;
    the pace line now does;
  - the block's order stays: pages line, switch, height line, pace line;
  - after unmount and mount it starts on All, with the All pace line;
  - the other T-0023 tests still pass.
- Clicked through on a local dev server with no backend (`pnpm run dev`, never a production
  `POCKETBASE_URL`; shelf seeded in localStorage), screenshots at 390×844 and 1280×800 on
  **lavender and midnight** in `docs/tasks/T-0024-screens/`: a mixed pile on All and on each kind
  with a pace, and one kind without a pace. No console errors, no horizontal scroll.
- Design checks (UX designer) added under *Design* and checked on the screenshots.
- `pnpm test`, `pnpm run build` and `pnpm exec harness check` pass; `src/routeTree.gen.ts`
  unchanged.

# Notes

- **Group 1** (app code only), nothing for Sander: no new stored field, no change to `Book`, the
  shelf or its sync (`shelfMerge.ts`, `src/server/shelf.ts`, `library.ts`), `src/server/` or
  `deploy/nas/`. No outside service, no new package. The switch is still not saved anywhere.
- **Files:** `src/lib/insights.ts` (a per-kind pace next to `wantPile`, sharing its finishes and
  period, e.g. one helper for "the finishes in the last year"; `wantPile`'s result stays the same),
  its test, `PileCard` / `PileHeightLine` in `src/components/DashboardExtras.tsx` (the switch's
  choice now has to reach the pace line too, e.g. by moving the state up into `PileCard`),
  `src/components/PileCard.test.tsx`. Use `bookKinds`, `audioMinutes` and `pileHeights` from
  `src/lib/pileHeight.ts`; don't copy their rules.
- **D-0030 / D-0031:** the 🎧 height line keeps its everyday comparisons, not her pace; her pace is
  only in the pace line. **D-0008:** elsewhere a listen-only book's minutes still count as pages.
- **D-0014:** no hint text: the no-pace line says there is no pace, not how the pace is worked out.
  **D-0020 / D-0022:** tokens only, readable on lavender and midnight.
- Closes #233 (the PR description must say "Closes #233"; close the issue by hand if auto-merge
  doesn't).

## Choices made by the team

Hanna decided points 1 to 5 of the goal in the feature chat (2026-11-22), including the no-pace
line, which was the architect's default and she accepted. The rest was open and the architect took
the recommended option without asking her:

1. **The same finishes and period as All** for every kind: the last year up to today, ÷ 12; re-reads
   count each time, **sleep reads count**, finishes without a day don't, the book's current status
   doesn't matter. One rule, so the kinds can be compared with All.
2. **The kind of a finish is the book's formats today**: the app doesn't note which format she used
   for each read. A book on paper and on Storytel adds to both the paper and the listening pace.
3. **The listening pace uses `audioMinutes`** for each finished audiobook (minutes, else pages × 2,
   else 560), the same rule as the waiting total, so both sides of the division are measured alike.
4. **Months as for All:** `ceil(waiting ÷ pace)`, then "N months" or "about N years".
5. **Pace numbers written as for All** (one decimal, ".0" dropped); hours at least "0.1"; singular
   "1 paper book" / "1 e-book" / "1 hour" (heard).
6. **The no-pace line:** "You haven't finished a paper book / an e-book / an audiobook in the last
   year, so there's no pace yet.", muted and small like All's no-pace line, shown on a kind even
   when All has its own "Once some books have a “Finished on” date" line.
7. **A new decision, D-0031,** since the per-kind pace and the hours would need a talk with Hanna
   to change.

# Design

(UX designer)

# Test

(Tester)

# Log

- 2026-11-22 architect: task written from issue #233 and Hanna's feature chat (2026-11-22): the
  pace line follows the switch; Paper and E-book by books of that kind, Audiobook in hours, All
  unchanged, a no-pace line for a kind without finishes in the last year. Found the All pace: every
  finish with a day in the last year (re-reads and sleep reads included) ÷ 12; the kinds use the
  same rule. D-0031 recorded; choices 1–7; group 1, no new stored fields. Handed to the UX designer.
