---
id: D-0098
title: "A pile challenge counts books on the shelf before it was made; the Challenges page goes one year ahead"
description: "The 'From my pile' rule counts a finished book that was on her shelf before the day the challenge was made (read from the challenge's id), not before 1 January; older challenges without that moment keep 1 January. The Challenges page can step to next year, where she can make and fill in challenges already."
status: Accepted
date: 2026-11-28
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [challenges, pile]
---

# Context

Hanna asked that the pile challenge not be fixed by a year: a book should count if it was on her shelf before the challenge started. She also asked to draft her monthly challenges for 2027 already.

# Decision

1. **From my pile** (in any own challenge, the Pile challenge included) counts a book finished in the challenge's year that was added to her shelf before the moment the challenge was made. That moment is read from the challenge's id (`c` + the time); a challenge whose id doesn't carry one keeps the old rule, 1 January of its year. The rule's text names the day ("Books on your shelf before 15 Jun 2026").
2. **The Challenges page goes one year ahead**: she can step to next year, make challenges there and fill in a monthly challenge's months.

# Consequences

An existing pile challenge made after 1 January may count a few more books (those added between 1 January and the day it was made). Nothing new is saved.

# Guidance for agents

`challengeStart` in `src/lib/ownChallenges.ts` is the one place the start is read.
