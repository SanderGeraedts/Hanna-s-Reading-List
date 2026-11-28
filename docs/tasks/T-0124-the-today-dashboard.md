---
id: T-0124
title: "Make every dashboard card show only today"
description: "Reading today, Today in your world and Pick of the day replace nine blocks; quiet cards hide behind a Hidden today line; On this day comes back; and the armchair no longer breaks the room on a computer."
status: Doing
size: full
depends_on: [T-0121]
decisions: [D-0092, D-0093]
raised_on: 2026-11-28
done_on: ""
result: []
---

# Goal

The dashboard Hanna asked for on 28 November: a bit of everything, but every card only about today (D-0093). See the decision for what each card shows.

Also fixes a bug from #281 found while checking this: on a computer the reading-corner armchair (T-0120) could not be built, because its rounded pieces and its round pieces were joined in a way three.js refuses, so the bookshelf room threw an error. Every piece is now made non-indexed before merging.

# Done when

`pnpm exec vitest run src/lib/todayDashboard.test.ts src/components/Dashboard.today.test.tsx src/components/RoomExtras.merge.test.ts` passes, and Hanna sees the today dashboard on the live site.

# Notes

- `src/lib/todayDashboard.ts`, `src/components/ReadingTodayCard.tsx`, `src/components/YourWorldCard.tsx`, Pick of the day and the Hidden today line in `src/components/Dashboard.tsx`, `thisMonthOnly` in `ChallengeCard.tsx`, `BookshopHost` in `bookshop/BookshopCard.tsx`.
- Defaults Claude picked: Pick of the day shows while she reads fewer than 3 books; Another changes the pick on this device for today only.

# Design

From the feature chat of 28 November 2026 (D-0093). Looked at on a phone and a computer with 150 demo books.

# Test

- 2026-11-28: `pnpm test` all passed; `tsc` clean; `harness check` ✓; build ✓.

# Log

- 2026-11-28 developer: built on `feat/today-dashboard`.
- 2026-11-28 developer: Remaining: Hanna checks it on the live site.
