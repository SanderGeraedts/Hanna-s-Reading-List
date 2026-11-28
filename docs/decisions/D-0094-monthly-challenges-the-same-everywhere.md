---
id: D-0094
title: "Monthly challenges of her own, and every monthly challenge works the same"
description: "She can make her own monthly challenges (a name, a year, a rule shown first when picking, one book a month) next to the original Monthly challenge; every monthly challenge, the original included, has the same card, picking list, 'also in' note and dashboard row, and a month can be picked or changed until it is over. The original keeps its picks on the books; the new ones keep theirs in the challenge."
status: Accepted
date: 2026-11-28
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [challenges, monthly, dashboard]
---

# Context

Hanna asked for a second monthly challenge (one for classics, one for books on her TBR), to make as one of her own challenges, and then for all monthly challenges to be the same everywhere. The original Monthly challenge (#144) keeps each pick on the book (`challengeMonth`); her own challenges are kept with the shelf in the `challenges` field (one JSON field, 20 kB) and cleaned by `cleanChallenges`. She settled every point below in a feature chat on 28 November 2026.

# Decision

1. **A book a month** is a kind of own challenge (`kind: 'monthly'`): a name, a year and a rule; its twelve picks live in the challenge (`months`: "01"–"12" → book id); its target is always 12 and a month counts once its book is finished that year (late if after its month), sleep reads never.
2. **The rule is a hint**: when picking, books that fit come first ("Fits this challenge"), and any book can still be picked.
3. **One book may be in two monthly challenges**, with a note "also in … for <month>".
4. **The same everywhere**: the original Monthly challenge gets the same card, picking list, note and dashboard row, and for every monthly challenge a month can be picked or changed until it is over (it was: only before it started).
5. **The original keeps its picks on the books**; nothing is moved. It keeps its name and the Any book rule.
6. **The dashboard's "This month's challenge"** shows one row per monthly challenge of this year.
7. At most **10** monthly own challenges, so all challenges together stay well inside the 20 kB field.

# Rationale

Keeping the original's picks where they are means no saved data has to move; the two kinds share one card and one set of rules through a single "where do the picks come from" function, so she sees one kind of challenge.

# Consequences

- No new field on `Book`, nothing in `deploy/nas/`, no change to `src/server/shelf.ts`: `cleanChallenges` (which the server imports) keeps the new fields.
- A month that has started can now be changed until it ends, also in the original Monthly challenge.

# Guidance for agents

- Read and write monthly picks through `PicksOf` in `src/lib/monthChallenge.ts` (`challengeFor` for the original, `ownMonthPicks` for an own one); never move the original's picks.
- Keep `MAX_MONTHLY` × twelve ids well under the field's 20 kB (there is a test).
