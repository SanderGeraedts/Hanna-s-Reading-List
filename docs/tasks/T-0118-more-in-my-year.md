---
id: T-0118
title: "Fill out the My year block: the covers she finished, the goal's pace, and a bar per month"
description: "My year keeps its ring and numbers and gains the goal pace line beside them, twelve bars of books finished per month, and a row of this year's covers that open their book; all from figures the app already works out."
status: Doing
size: small
depends_on: []
decisions: [D-0008, D-0060, D-0090]
raised_on: 2026-11-26
done_on: ""
result: []
---

# Goal

Hanna, with a screenshot: *"Can we add more to the my year block? It looks pretty empty right
now."* It held a ring, one line of numbers and a wide empty space, because the charts moved to
the Stats page (T-0080). She chose three of the four things offered: the covers of what she
finished, how she is doing against the goal, and a small bar per month.

# Done when

- `pnpm test` and `pnpm run build` pass.
- The block shows a cover per book finished this year, each opening the book; twelve month bars;
  and the goal line when a goal is set.
- A year with nothing finished says so and shows neither bars nor covers.
- On the preview: the block looks full, and the covers open the right books.

# Notes

- `src/components/MyYearCard.tsx`, with `monthlyCounts` (insights) and `goalPace`/`goalPaceText`
  (insightsMore) — both already existed.
- `Cover` and `monthName` come from `components/common.tsx` (D-0080), not from `Dashboard.tsx`.

# Design

Ring on the left; beside it the numbers and, under them, the quiet goal line. Then twelve bars
with the month's first letter under each. Then the covers, newest first, at most twelve with a
"+N" for the rest.

# Test

`pnpm exec vitest run --dir src`: all green (counts in the pull request). `pnpm run build`: built.

`src/components/MyYearCard.test.tsx` — a cover per book finished this year and a tap opens the
book; twelve bars with exactly the two filled months of the fixture; the goal line appears only
once a goal is set; and a year with nothing finished shows neither bars nor covers.

Remaining: Hanna says whether the block now looks right, and whether twelve covers is the right
number before the "+N".

# Log

- 2026-11-26 architect: raised by Hanna from a screenshot; she picked three of four fillings.
- 2026-11-26 developer: built from figures that already existed; D-0090 recorded.
- 2026-11-26 tester: ran the suite and the build.
- 2026-11-26 tester: Remaining: Hanna looks at the block.
