---
id: T-0132
title: "Show every series as covers on a Series page, and open the next unread book from Read the series"
description: "A Series tab with covers in order (read in colour, unread greyed), sortable; Read the series opens a series' next unread book."
status: Doing
size: full
depends_on: []
decisions: [D-0100]
raised_on: 2026-11-28
done_on: ""
result: []
---

# Goal

See D-0100.

# Done when

`pnpm exec vitest run src/lib/seriesPage.test.ts src/components/SeriesPage.test.tsx` passes, and Hanna sees her series on the Series tab (More › Series on her phone), sorts them, and opens a next book from Read the series on the live site.

# Notes

`src/lib/seriesPage.ts`, `src/components/SeriesPage.tsx`, the Series view in `routes/index.tsx`, `nextInSeries` in `seriesChallenge.ts`, `ReadyChallenges.tsx`; the Series block removed from `StatsPage.tsx`.

# Design

From the feature chat of 28 November 2026; looked at on a phone and a computer with demo books.

# Test

- 2026-11-28: `pnpm test`, `tsc`, `harness check` and the build pass.

# Log

- 2026-11-28 developer: built on `feat/series-page`.
- 2026-11-28 developer: Remaining: Hanna checks it on the live site.
