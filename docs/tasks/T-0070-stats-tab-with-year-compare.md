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

Written by the UX designer before the build; the review follows it.

# Test

Written by the tester.

# Choices made while Hanna was at work

# Log

- 2026-11-23 architect: turned backlog item ST1 into this task, size full; recorded D-0060 (the
  charts move to the Stats page, the dashboard keeps one compact My year block, and the eight old
  block ids are merged into `myyear` instead of dropped). Handed to the UX designer.
