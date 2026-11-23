---
id: T-0071
title: "Make the year wrap-up a full-screen story she can play any time, ending in a shareable picture"
description: "Year in review becomes a ▶ Play block on the dashboard and the Stats page that opens a full-screen tap-through story for the chosen year — books, top book, top author, top genre, longest book, busiest month, pages, hours listened, new authors and her map — ending in a summary slide she can share as a picture."
status: Open
size: full
depends_on: [T-0070]
decisions: [D-0013, D-0014, D-0020, D-0061]
raised_on: 2026-11-23
done_on: ""
result: []
---

# Goal

The backlog item *Year wrap-up story (ST2)*, agreed with Hanna on 22 November 2026.

She can play her year whenever she likes — this year so far, or any past year — as full-screen
slides she taps through, one fact at a time, ending in a summary picture she can send to friends.
The entry point is the *Year in review* block, which becomes `▶ Play` and sits on both the
dashboard and the Stats page. It opens only when she taps it (D-0013). The monthly wrap-up stays
exactly as it is.

# Done when

- `pnpm test`, `pnpm run build` and `pnpm exec harness check` pass, with the output in *Test*.
- The *Year in review* block shows the year, the headline numbers and a `▶ Play` button, on the
  dashboard and on the Stats page, and nothing opens until that button is pressed.
- Pressing it opens a full-screen story for that year: one slide per fact, a progress indicator,
  forward on a tap anywhere (or `→`, `Space`, `Enter`), back with `←` and a *Back* control, closed
  by `Escape`, the `×` and the backdrop.
- The last slide is a summary with a `Share` button that draws a picture through the existing
  `shareImage` code (shared on a phone, downloaded elsewhere).
- `src/lib/yearStory.test.ts` proves: a year with books produces the expected slides in order; a
  slide with no data is left out; a year with **no** books produces a story that says so and still
  ends in the summary slide; a past year and the current year end on their own closing line.
- Keyboard only, from the block to the last slide and back out, works and is covered in *Test*;
  focus returns to the `▶ Play` button on close.
- The screenshots in *Design* exist under `docs/tasks/T-0071-screens/`.

# Notes

- Files: a new `src/lib/yearStory.ts` and `src/lib/yearStory.test.ts`, a new
  `src/components/YearStory.tsx`, `src/components/DashboardMore.tsx` (`WrappedCard` becomes the
  play block), `src/components/Dashboard.tsx`, `src/components/StatsPage.tsx`, `src/styles.css`.
- Reuse: `yearReview` and `favouriteAuthors` (`src/lib/insightsMore.ts`), `periodStats`
  (`src/lib/stats.ts`), `monthlyCounts` and `breakdown` (`src/lib/insights.ts`), `worldMap` with
  `MAP_COUNTRY_SET` (`src/lib/places.ts`, `src/lib/mapCountries.ts`), `ShareSpec` and
  `shareChallenge` (`src/lib/shareImage.ts`), `ShareButton`.
- The block id stays `wrapped`, so a saved layout or a star that names it keeps working (D-0061).
- Nothing is saved: the slide she is on lives only while the story is open.
- Sister task: T-0070 (the Stats page), built on the same branch.

# Design

Written by the UX designer before the build; the review follows it.

# Test

Written by the tester.

# Choices made while Hanna was at work

# Log

- 2026-11-23 architect: turned backlog item ST2 into this task, size full; recorded D-0061 (a
  played full-screen story for any year, ending in a shareImage picture; the block id `wrapped`
  stays). Handed to the UX designer.
