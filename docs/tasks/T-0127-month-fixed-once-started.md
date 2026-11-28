---
id: T-0127
title: "Fix a month's book once the month starts, in every monthly challenge"
description: "Back to the original rule for all monthly challenges: pick or change a month only before it starts."
status: Doing
size: small
depends_on: [T-0126]
decisions: [D-0095]
raised_on: 2026-11-28
done_on: ""
result: [https://github.com/SanderGeraedts/Hanna-s-Reading-List/pull/286]
---

# Goal

Hanna: "Only as long as a month is not started yet you can change the book." See D-0095.

# Done when

`pnpm exec vitest run src/lib/monthChallenge.test.ts src/components/ChallengeCard.monthly.test.tsx` passes, and on the live site November can no longer be changed while December can.

# Notes

`canChange` in `src/lib/monthChallenge.ts`; the editor's note in `ChallengeCard.tsx`.

# Design

The editor says again: "Months that have started can't be changed."

# Test

- 2026-11-28: the tests above pass; `pnpm test`, `tsc`, `harness check` and the build pass.

# Log

- 2026-11-28 developer: rule changed back.
- 2026-11-28 developer: merged in #286 and live; empty months can be filled since T-0128 (D-0096).
- 2026-11-28 developer: Remaining: Hanna checks it on the live site.
