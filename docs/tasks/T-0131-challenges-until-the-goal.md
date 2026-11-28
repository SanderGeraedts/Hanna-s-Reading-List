---
id: T-0131
title: "Let a challenge run until the goal is reached instead of for one year"
description: "For <year> or Until I reach the goal in the new-challenge form; the Pile challenge runs until the goal; the 📖 button steps aside while a form is open."
status: Doing
size: small
depends_on: [T-0130]
decisions: [D-0099]
raised_on: 2026-11-28
done_on: ""
result: []
---

# Goal

See D-0099. Also: the round 📖 button covered "Sleep reads don't count" and the form's buttons on her phone; it now hides while the challenge form is open or a field has focus.

# Done when

`pnpm exec vitest run src/lib/ownChallenges.rules.test.ts src/components/ChallengeCard.monthly.test.tsx` passes, and Hanna makes or switches her pile challenge to Until I reach the goal on the live site.

# Notes

`untilDone`, `showsIn`, `doneYear` and `challengeBooks` in `src/lib/ownChallenges.ts`; the How long switch in `OwnChallenges.tsx`; `ChallengesPage.tsx` and `challengeRings.ts` use `showsIn`.

# Design

The form: [A number of books | A book a month], then [For 2026 | Until I reach the goal]. The card: "… · since 28 Nov 2026, until you reach it".

# Test

- 2026-11-28: `pnpm test`, `tsc`, `harness check` and the build pass.

# Log

- 2026-11-28 developer: built.
- 2026-11-28 developer: Remaining: Hanna switches her pile challenge on the live site.
