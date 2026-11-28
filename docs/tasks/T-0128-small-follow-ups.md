---
id: T-0128
title: "Fill empty months, open the map from the 📍 line, show the book of the week, and fewer words"
description: "Empty started months can still get a book (D-0096); the 📍 line in Reading today opens the Stats page at the map; Today in your world names the bookshop's book of the week; three more sentences trimmed."
status: Doing
size: small
depends_on: [T-0124, T-0127]
decisions: [D-0096, D-0093]
raised_on: 2026-11-28
done_on: ""
result: [https://github.com/SanderGeraedts/Hanna-s-Reading-List/pull/287]
---

# Goal

Hanna's follow-ups of 28 November: add a book to a month that has none (D-0096), and the three things left from the earlier plans (the map link, the book of the week on the dashboard, a proper pass over unnecessary text). Stars on the Stats page: not added (Claude's default; she can ask).

# Done when

`pnpm exec vitest run src/lib/monthChallenge.test.ts src/components/ChallengeCard.monthly.test.tsx` passes, and Hanna checks the four things on the live site.

# Notes

- `canPick` in `monthChallenge.ts`; `openMap` in `routes/index.tsx` and `focusMap` on `StatsPage`; `weekBest` in `YourWorldCard.tsx`.
- Text pass: every on-screen sentence of seven words or more was read (63); kept the empty states, warnings and instructions; dropped "Spines and back covers are generated…", the When I read most footer, and shortened New for you's empty line. Facts and game texts are content and stay.

# Design

Nothing new to look at besides the lines named above.

# Test

- 2026-11-28: `pnpm test`, `tsc`, `harness check` and the build pass.

# Log

- 2026-11-28 developer: built.
- 2026-11-28 developer: merged in #287 and live.
- 2026-11-28 developer: Remaining: Hanna checks it on the live site.
