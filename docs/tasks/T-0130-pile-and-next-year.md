---
id: T-0130
title: "Count the pile from the day the challenge was made, and let her draft next year's challenges"
description: "From my pile counts books on the shelf before the challenge was made; the Challenges page steps one year ahead for drafting."
status: Doing
size: small
depends_on: [T-0126]
decisions: [D-0098]
raised_on: 2026-11-28
done_on: ""
result: []
---

# Goal

See D-0098.

# Done when

`pnpm exec vitest run src/lib/ownChallenges.rules.test.ts src/components/ChallengesPage.nextYear.test.tsx` passes, and Hanna sees her pile challenge's new date line and makes a 2027 monthly challenge on the live site.

# Notes

`challengeStart`, `fitsRule` and `rulePhrase` in `src/lib/ownChallenges.ts`; the year list and `year >= thisYear` in `ChallengesPage.tsx`.

# Design

The pile rule reads "Books on your shelf before <day>"; the year switch on the Challenges page goes one past this year.

# Test

- 2026-11-28: `pnpm test`, `tsc`, `harness check` and the build pass.

# Log

- 2026-11-28 developer: built.
- 2026-11-28 developer: Remaining: Hanna checks it on the live site.
