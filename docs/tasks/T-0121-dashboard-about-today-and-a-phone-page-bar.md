---
id: T-0121
title: "Make the dashboard about today, with a page bar at the bottom on a phone"
description: "The dashboard keeps only today's blocks; the looking-back ones move to Stats and A–Z and Book bingo stay on Challenges; on a phone a bottom bar (Shelf, Dashboard, Calendar, Challenges, More) replaces the tabs at the top."
status: Doing
size: full
depends_on: []
decisions: [D-0060, D-0092]
raised_on: 2026-11-27
done_on: ""
result: []
---

# Goal

Hanna: getting around took too many taps, the dashboard was too long, and the same things
showed up in several places. D-0092 records what she chose.

- **The dashboard keeps:** Waiting for you, Currently reading, This week (the calendar block,
  now only the current week, with "Open ›" for the month), Finish by, Lent out, Give it another
  try, Monthly challenge, Fact of the day, Creatures, Garden, Bookshop, What next?, New for you
  and Newly added. The lone "Today" heading is gone.
- **Moved off** (`OFF_DASHBOARD` in `src/lib/dashboardLayout.ts`): My year, Favourite authors,
  Series, Want-to-read pile, My ratings, On this day, Badges, Tropes & characters, Cover wall
  and Where your books are set go to the Stats page, in a new section "Your books, all the
  years" (Year in review was already there). A–Z and Book bingo were already on the Challenges
  page and now live only there.
- **Saved layouts and stars** that name a moved block load without it.
- **On a phone (720 px wide or less):** a bar at the bottom with Shelf, Dashboard, Calendar,
  Challenges and More. More opens Stats, Creatures, Garden and Bookshop (which opens the
  dashboard with the shop open). The tabs at the top are hidden. The quick-update button, the
  zoom buttons and messages move up above the bar (`--bottom-bar-h`).
- **On a computer** nothing changes: the tabs stay at the top.

# Done when

- `pnpm test` and `pnpm run build` pass.
- On a phone-sized preview: the bar is at the bottom, every button in it and in More opens the
  right page, and nothing fixed to the bottom hides behind it.
- A saved layout that names a moved block still loads.
- Hanna finds her way around on her phone and says the dashboard is right.

# Notes

- `src/lib/dashboardLayout.ts` (`OFF_DASHBOARD`), `src/routes/index.tsx`, `src/styles.css`.
- Tests that counted dashboard blocks were updated to the new list (T-0122's commit).

# Design

Agreed with Hanna on her instance: five buttons in a bar at the bottom of a phone screen, More
for the four less-used pages, and everything pinned to the bottom lifted above the bar by
`--bottom-bar-h` (`src/styles.css`). Nothing moves on a computer.

# Test

The full suite and the build run locally; see *Log*.

# Log

- 2026-11-28 developer: built on `fix/unfinished-bits`; D-0092 recorded.
- 2026-11-28 developer: Remaining: Hanna checks it on the preview/live site.
