---
id: T-0126
title: "Let her make her own monthly challenges, and make every monthly challenge the same"
description: "A book a month as an own challenge (e.g. Classics, From my TBR) next to the original Monthly challenge, with one card, one set of rules and one dashboard row for all of them."
status: Doing
size: full
depends_on: [T-0124]
decisions: [D-0094, D-0066]
raised_on: 2026-11-28
done_on: ""
result: [https://github.com/SanderGeraedts/Hanna-s-Reading-List/pull/285]
---

# Goal

See D-0094: monthly own challenges, and the original Monthly challenge working the same way.

# Done when

`pnpm exec vitest run src/lib/monthChallenge.test.ts src/components/ChallengeCard.monthly.test.tsx` passes, and Hanna makes "Classics" on the live site, picks November's book, and sees a row for it on the dashboard.

# Notes

- `src/lib/ownChallenges.ts` (`kind`, `months`, `MAX_MONTHLY`, `challengeBooks` for monthly), `src/lib/monthChallenge.ts` (`PicksOf`, `ownMonthPicks`, `alsoIn`, `canChange` until the month is over, `pickable` with a hint), `src/components/ChallengeCard.tsx` (one card for both, `ThisMonthChallenges`), `OwnChallenges.tsx` (A book a month in the form), `ChallengesPage.tsx`, `Dashboard.tsx`.
- Defaults Claude picked: the original keeps its name and Any book rule; the dashboard rows' Pick goes to the Challenges page.

# Design

From the feature chat of 28 November 2026 (D-0094).

# Test

- 2026-11-28: `pnpm test` all passed; `tsc` clean; `harness check` ✓; build ✓.

# Log

- 2026-11-28 developer: built on `feat/monthly-challenges`.
- 2026-11-28 developer: merged in #285 and live; the change rule then went back to "before the month starts" in T-0127 (D-0095).
- 2026-11-28 developer: Remaining: Hanna makes a monthly challenge on the live site.
