---
id: D-0009
title: "Duplicate books are merged by hand or from suggestions, keeping the best of both copies"
description: "The book panel suggests likely duplicates and lets Hanna merge any two books; the book she merges into keeps its title, cover and details, the furthest status and progress and the most times read win, lists are combined, and a merged copy never comes back."
status: Accepted
date: 2026-11-07
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [data, books]
---

# Context

#14 (2026-11-06): some books were on the shelf twice and came back on every Storytel refresh. In
the triage comment the Engineer proposed rules; on 2026-11-07 Hanna answered that duplicates come
both from a paper copy plus Storytel and from Storytel listing a book twice, chose "use your
option" for the rules, and asked for both manual merging and suggestions. Built in #30.

Later features kept to the same rules: ratings and spice (#108), sleep reads and the No spice mark
(#125, #129), the A–Z picks (#155) and journal notes (#173) are all kept when merging.

No global decision covers this.

# Decision

- **Suggestions:** the book panel points out books that look like another copy (same ISBN or Open
  Library work, or the same title by the same author with edition notes left out). *Not the same
  book* stops a suggestion.
- **Manual merge:** *Merge with another book…* lets her pick any other book.
- **Rules:** the book whose panel she starts the merge from ("merge … into this book") keeps its
  title, cover, blurb, series and lending; the
  furthest status and progress and the most times read win; formats, genres and other lists are
  combined; missing details are filled in from the other copy.
- **It stays merged:** merged ids are remembered, so neither a Storytel refresh nor another
  device's older shelf brings the copy back (D-0006, D-0007).

# Rationale

These were the rules she accepted; they never lose reading progress or anything she typed, and
they make a merge final, which was the point of the request.

# Consequences

- Every new field on `Book` needs a merge rule in `src/lib/merge.ts`, with a test.

# Guidance for agents

- When adding a field to `Book`, decide how two copies combine (usually: keep the kept copy's
  value, fill from the other, combine lists) and test it.
- Never let a merge lose progress, ratings or text she typed.
- Changing which copy wins is Hanna's choice: ask her first.
