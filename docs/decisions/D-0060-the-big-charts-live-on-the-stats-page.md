---
id: D-0060
title: "The big charts live on a Stats page with a year picker and a compare year; the dashboard keeps one compact My year block"
description: "A sixth page tab, Stats, holds the heatmap, books and pages per month, the genre flower, When I read most, What I read and Records for a chosen year next to a compare year; the dashboard's Books read, Reading goal and those six chart blocks are replaced by one My year block with Open ›, and saved layouts and favourites that name a moved block are migrated onto it."
status: Accepted
date: 2026-11-23
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [dashboard, stats]
---

# Context

- On 22 November 2026 Hanna agreed the backlog item *Stats tab with year compare (ST1)*: a page
  of its own for the numbers, with a year picker, **All time**, and a **compare with** year, and
  the big charts moving there off the dashboard.
- The dashboard had grown to 34 blocks, six of them full-width charts about the same thing (the
  heatmap *A year of reading*, *Pages per month*, the *Genre flower*, *When I read most*, *What I
  read* and *Records*), plus *Books read* (with books per month inside it) and *Reading goal*.
- Dashboard layouts are saved per device (`dashboardLayout.ts`), and her starred blocks
  (*Favourites*) follow her account (D-0028). `cleanLayout` drops a block id it doesn't know, so
  removing eight ids would silently drop a star she had set.

# Decision

- **The Stats page is the sixth page tab** (`📈 Stats`), after Dashboard. It has one year picker
  — every year with reading data, plus **All time** — and one **Compare with** picker (another of
  those years, or nothing).
- **Every number on it is for the chosen year**, with the compare year's value beside it as
  `48 books ↑ 12 vs 2025`. A chart with no sensible comparison shows the chosen year only.
- **These blocks move off the dashboard onto the Stats page:** the heatmap *A year of reading*,
  *Pages per month*, the *Genre flower*, *When I read most*, *What I read*, *Records*, and the
  *Books per month* chart that sat inside *Books read*.
- **The dashboard keeps one compact block, *My year*:** books, pages, hours and the goal ring,
  with `Open ›` to the Stats page. *Books read* and *Reading goal* are part of it; their block
  ids are gone.
- **Saved layouts are migrated, not dropped.** `count`, `goal`, `heatmap`, `months`, `flower`,
  `rhythm`, `breakdown` and `records` are folded into the new `myyear` id wherever they appear:
  in a section (keeping the first of them's place), in *Hidden* and in *Favourites*. A block that
  was visible in any of them wins over one that was hidden, so nothing she could see disappears.
- **The goal is still set on the Challenges page**, where the full *Reading goal* block lives;
  *My year* only shows the ring.

# Rationale

The dashboard is what she opens every day; the charts are what she looks at now and then. Putting
them on a page of their own makes both calmer, and a year picker with a compare year is only
possible where one picker drives the whole page. Folding the eight old ids into `myyear` rather
than dropping them keeps her arrangement and her stars meaningful across the change.

# Consequences

- `BLOCKS` loses eight ids and gains `myyear`; `DEFAULT_LAYOUT`'s *My stats* section becomes
  `myyear` plus the blocks that stayed (calendar, series, pile, authors).
- `cleanLayout` grows a merge map, and must read the sections before *Hidden* so a visible block
  wins; a test covers a layout saved before the move, and a favourite naming a moved block.
- `BreakdownCard`, `RecordsCard`, `GoalCard` and `MonthlyChart` already take a period or a year;
  the heatmap, the flower, the rhythm and the pages chart gain one.

# Guidance for agents

- A new chart about *how much she read* goes on the Stats page, not on the dashboard. A new small
  block about *today* goes on the dashboard.
- Never remove a block id from `BLOCKS` without a line in the merge map or a test that shows what
  happens to a layout and a favourite that name it.
- Keep *My year* compact: four numbers and the ring, no chart, no hint text (D-0014).
