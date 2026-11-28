---
id: D-0095
title: "In every monthly challenge, a month's book is fixed once the month starts"
description: "Replaces only point 4's change rule of D-0094: a month can be picked or changed before it starts, not until it is over; the rest of D-0094 stands. A monthly challenge made mid-month starts the next month."
status: Accepted
date: 2026-11-28
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [challenges, monthly]
---

# Context

D-0094 §4 let every monthly challenge pick or change a month's book until the month was over. Hanna asked the same day for the rule the original Monthly challenge had before: change a month only as long as it has not started.

# Decision

For every monthly challenge (the original and her own), a month's book can be picked or changed only before that month starts; a month that has started is fixed. Everything else in D-0094 stands. D-0094 is not edited; this record says which part no longer holds.

# Consequences

A monthly challenge made in the middle of a month gets its first book the next month.

# Guidance for agents

`canChange` in `src/lib/monthChallenge.ts` is the one place this rule lives; both kinds of monthly challenge use it.
