---
id: D-0099
title: "A challenge can run until she reaches the goal instead of for one year; the Pile challenge does by default"
description: "Besides 'For <year>', an own challenge (not a book a month) can run 'Until I reach the goal': it counts finishes from the day it was made, across New Year, and is done when the goal is reached; it shows on the Challenges page in every year it runs. The Pile challenge button picks it; an existing challenge can be switched with Change."
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

After D-0098 Hanna showed that the new-challenge form still said "New challenge for 2026": she wants the pile challenge not to belong to a year at all, running until she reaches the goal, and the choice for any challenge.

# Decision

1. An own challenge (a number of books, pages or hours) is either **For <year>** or **Until I reach the goal** (`untilDone`). A book a month is always for one year.
2. Until the goal: it counts books finished from the day it was made (`challengeStart`), whatever the year, and is done once the goal is reached. Its `year` is the year it started.
3. It shows on the Challenges page in every year from its start until the year it was reached (or this year while it runs). Its card says "since <day>, until you reach it".
4. The **Pile challenge** button makes one that runs until the goal; an existing challenge can be switched with Change.

# Consequences

No new place to save: `untilDone` rides in the challenge, kept by `cleanChallenges`.

# Guidance for agents

`showsIn` and `doneYear` in `src/lib/ownChallenges.ts` decide which years a challenge shows in.
