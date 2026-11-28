---
id: D-0096
title: "A started month without a book can still get one"
description: "Adds to D-0095: in every monthly challenge a month's book is fixed once the month has started, but a month that has no book yet (this month or an earlier one) can still be filled; once filled it is fixed too."
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

Right after D-0095 Hanna asked to be able to add a book to a month that doesn't have one.

# Decision

In every monthly challenge: before a month starts its book can be picked or changed; once it has started, a month with a book is fixed, and a month without one can still get a book, which is then fixed as well. D-0095 is not edited.

# Guidance for agents

`canPick(month, hasBook)` in `src/lib/monthChallenge.ts` decides whether a month's picking list is open; `canChange` stays the "before it starts" rule.
