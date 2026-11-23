---
id: T-0070
title: "Add a Stats page with a year picker and a compare year, and leave one compact My year block on the dashboard"
description: "A sixth page tab, Stats, with a year picker (the years with data plus All time) and a compare-with year; the heatmap, books and pages per month, the genre flower, When I read most, What I read and Records move there with the other year's value beside each number, and the dashboard's Books read, Reading goal and those charts become one compact My year block with Open ›."
status: Open
size: full
depends_on: []
decisions: [D-0013, D-0014, D-0020, D-0028, D-0060]
raised_on: 2026-11-23
done_on: ""
result: []
---

# Goal

The backlog item *Stats tab with year compare (ST1)*, agreed with Hanna on 22 November 2026.

Everything about *how much she read* moves onto a page of its own, driven by one year picker, so
the dashboard can go back to being about today. On the Stats page she picks a year (or **All
time**) and, if she likes, a year to **compare with**; every number then shows the other year's
value beside it (`48 books ↑ 12 vs 2025`).

The dashboard keeps one compact **My year** block — books, pages, hours and the goal ring — with
`Open ›` to the Stats page. Her saved arrangement and her starred blocks must survive the move.

# Done when

- `pnpm test`, `pnpm run build` (which type-checks) and `pnpm exec harness check` pass, with the
  output in *Test*.
- A sixth page tab `📈 Stats` sits after Dashboard, on the phone and on the computer, and
  `?view=stats` opens it.
- On the Stats page: a year picker listing every year with reading data plus **All time**, and a
  **Compare with** picker listing the other years plus *nothing*. Picking a year changes every
  number and chart on the page; picking a compare year adds `↑ 12 vs 2025` beside each number that
  can be compared.
- The heatmap *A year of reading*, *Books per month*, *Pages per month*, the *Genre flower*,
  *When I read most*, *What I read* and *Records* are on the Stats page and **not** on the
  dashboard.
- The dashboard has one **My year** block with books, pages, hours and the goal ring and `Open ›`
  to the Stats page, and no *Books read* or *Reading goal* block.
- `src/lib/dashboardLayout.test.ts` proves, for a layout saved before this change:
  - a layout naming `count`, `goal`, `heatmap`, `months`, `flower`, `rhythm`, `breakdown` or
    `records` loads without throwing and shows `myyear` once, in the place of the first of them;
  - a favourite naming any of those blocks becomes a favourite on `myyear`, once;
  - a block hidden in the old layout does not hide `myyear` when another of the merged blocks was
    visible;
  - a layout with all eight hidden has `myyear` hidden.
- Comparing a year with itself, a year with no books and **All time** all render without an error
  (covered by tests on the compare helper and by the tester).
- The screenshots in *Design* exist under `docs/tasks/T-0070-screens/`.
- Added by the UX designer: `All time` disables the *Compare with* picker; a compare line reads
  `↑ 12 vs 2025`, `↓ 4 vs 2025`, `same as 2025` or `2025: nothing`, with a spoken form that has no
  arrow in it; the numbers card is the page's only live region; and at 390 px the page has no
  horizontal scroll.

# Notes

- Files: `src/routes/index.tsx` (the tab and the view), a new `src/components/StatsPage.tsx`, a new
  `src/lib/yearCompare.ts`, `src/lib/dashboardLayout.ts` (the merge map), `src/components/Dashboard.tsx`
  (the block list and the new *My year* card), `src/components/DashboardMore.tsx` (heatmap),
  `src/components/NewBlocks.tsx` (rhythm), `src/components/PictureBlocks.tsx` (flower, pages per
  month), `src/components/DashboardExtras.tsx` (`MonthlyChart`, `BreakdownCard`, `RecordsCard`,
  `GoalCard`), `src/styles.css`.
- `BreakdownCard` and `RecordsCard` already take a `period` and a label; `GoalCard` and
  `MonthlyChart` already take a `year`. The heatmap, the flower, *When I read most* and *Pages per
  month* are hard-wired to this year and need a year (and, for the pages chart, a compare year
  instead of "last year").
- The goal is still **set** on the Challenges page; *My year* only shows the ring (D-0060).
- `ChallengesPage.tsx` is the model for a page with a year switch and its own arrangement.
- Nothing here touches `src/lib/shelfMerge.ts`, `src/server/shelf.ts` or the sync parts of
  `src/lib/library.ts`, so no part of it needs Sander.
- Sister task: T-0071 (the year wrap-up story), built on the same branch; its `▶ Play` block also
  appears on this page.

# Design

The Stats page is the Challenges page's calm sibling: the same lavender or midnight wallpaper
(D-0022), the same `.dash-card` blocks in two columns on a computer and one on a phone, the same
card-on-wallpaper header (`.challenges-head`). No new colours, no hint texts (D-0014), no pop-ups
(D-0013).

## The tab

`📈 Stats` becomes the third tab, straight after `📊 Dashboard` and before `🏆 Challenges`, so the
two pages about her numbers sit together: **Bookshelf · Dashboard · Stats · Challenges · Calendar ·
Creatures · Garden**. On a phone it is the icon alone, like the others. `?view=stats` opens it.

## The page header

One card across the top, `Stats` as the `h1`, and on the right two labelled pickers:

```
Stats                            Year [2026 ▾]   Compare with [2025 ▾]
```

- **Year** lists every year with reading data, newest first, then `All time`. It opens on this
  year.
- **Compare with** lists `—` first (nothing to compare), then the other years, newest first. It
  starts on `—`. When *Year* is `All time` the compare picker is **disabled** and shows `—`:
  nothing compares with all time.
- Both are `<select class="input">` with a visible label (`Year`, `Compare with`), so they work
  with the keyboard and read correctly. On a phone the header wraps to two rows, the pickers full
  width.

## Comparing a number

Every comparable number gets one quiet line beside it, never a second chart:

- more: `↑ 12 vs 2025`
- fewer: `↓ 4 vs 2025`
- the same: `same as 2025`
- the other year has nothing: `2025: nothing`

The arrow is decorative; the screen reader hears `12 more than in 2025`, `4 fewer than in 2025`,
`the same as in 2025`, `nothing in 2025`. Up is gold (`--accent`), down is `--muted`: never red,
because reading less is not a failure. Comparing a year **with itself** is allowed and simply reads
`same as 2026` on every line.

## What is on the page, in order

1. **This year in numbers** (`.stats-numbers`): four big numbers in a row — `48 books`,
   `14,218 pages`, `36 hours listened`, `212 reading days` — each with its compare line under it.
   A number that is zero for both years is left out; with nothing at all: `Nothing finished in 2024
   yet.`
2. **Reading goal** ring for that year, read-only (`Open ›` to Challenges to change it). Left out
   for `All time`.
3. **A year of reading** — the heatmap, for the chosen year (January to December, or the last
   twelve months for `All time`), with `212 reading days ↑ 16 vs 2025` in its header.
4. **Books per month** — the bar chart, chosen year; with a compare year the other year's bars sit
   behind in the `--muted` tone already used by *Pages per month*, and a key names both years.
5. **Pages per month** — the same, with its Pages/Hours switch. Its hard-wired "last year" becomes
   the compare year; with no compare year it shows the chosen year alone.
6. **Genre flower** — the chosen year; its `2026 / All time` switch goes, because the page's picker
   now says which. With a compare year, each legend row gains `↑ 2 vs 2025`.
7. **When I read most** — Weekdays / Months for the chosen year (weekdays counted inside that year,
   not "the last twelve months"), with `You read most on Sundays.` kept.
8. **What I read** — genres / languages / formats for the chosen year, each bar with its compare
   line.
9. **Records** — for the chosen year, unchanged but fed by the page's picker.
10. **Year in review** — the `▶ Play` block of T-0071, for the chosen year.

Blocks 3–10 are `.dash-card`s in the two-column grid, in that order, left column first. The page
is **not** arrangeable: one less thing to maintain, and she can still star what she wants on the
dashboard.

## Empty, long and small

- **A year with no books:** the numbers card says `Nothing finished in 2024 yet.` and each chart
  shows its own empty message (they all have one already). No chart is hidden, so the page never
  jumps around.
- **Her first year** (one year of data): the compare picker holds only `—`, and is disabled with
  the label still read out.
- **390 px:** one column, the header wrapped, the heatmap scrolling sideways as it does now, the
  flower at its smallest and its legend under it. No horizontal page scroll.
- **1280 px:** two columns inside `max-width: 68rem`, like the dashboard.
- Both wallpapers: the page's own background is `var(--wallpaper)`, and every number sits on a
  card, so the contrast test covers it unchanged.

## The dashboard's My year block

One `.dash-card` in *My stats*, headed `My year`, with `Open ›` to the Stats page:

```
My year                                   Open ›
   ⭘ 48      48 books · 14,218 pages · 36 h listened
  of 60
```

- the goal ring exactly as the *Reading goal* block drew it (same `svg`, same aria-label
  `48 of 60 books read`), on the left;
- to its right, this year's three numbers on one line, wrapping to two on a phone;
- with no goal set: the ring is left out and the numbers fill the card — no invitation to set one
  (that lives on Challenges, D-0014);
- nothing else: no chart, no pace line, no hint.

`Open ›` is the same `OpenLink` as every other block, labelled `Open My year`.

## Keyboard and screen reader

- The tab row is reached with Tab and each tab is a button with its label, as now.
- On the page, Tab order is: `Year`, `Compare with`, then each block top to bottom, left column
  first.
- Changing either picker announces the new numbers once: the numbers card is `aria-live="polite"`,
  the charts are not (nine live regions would be shouting).
- Every chart keeps the `role="img"` and `aria-label` it already has, with the year in it:
  `Books finished each month in 2024`.

## Screenshots

Under `docs/tasks/T-0070-screens/`:

- `stats-390-lavender.jpg`, `stats-1280-lavender.jpg` — the page at both widths, a year with data
  and a compare year set.
- `stats-1280-midnight.jpg` — the midnight wallpaper.
- `stats-compare-390.jpg` — the pickers with a compare year, on the phone.
- `stats-alltime-1280.jpg` — `All time` (compare disabled, no goal ring).
- `stats-empty-1280.jpg` — a year with no books.
- `myyear-390.jpg`, `myyear-1280.jpg` — the dashboard's *My year* block.

# Test

Written by the tester.

# Choices made while Hanna was at work

# Log

- 2026-11-23 architect: turned backlog item ST1 into this task, size full; recorded D-0060 (the
  charts move to the Stats page, the dashboard keeps one compact My year block, and the eight old
  block ids are merged into `myyear` instead of dropped). Handed to the UX designer.
- 2026-11-23 ux-designer: designed the Stats page (tab place, year and compare pickers, the order of
  the blocks, the compare wording and its spoken form, 390/1280 on both wallpapers) and the compact
  My year block; added four lines to Done when. Handed to the developer.
