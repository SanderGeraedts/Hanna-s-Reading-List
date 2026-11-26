---
id: D-0090
title: "My year shows the year, not just three numbers: the covers she finished, how the goal is going, and a bar per month"
description: "The My year block keeps its ring and its books/pages/hours line, and gains the goal's pace line beside it, twelve little bars of books finished per month, and a row of the covers she finished this year, each opening the book; everything from figures the app already works out."
status: Accepted
date: 2026-11-26
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [dashboard, stats]
---

# Context

Hanna, with a screenshot of her dashboard: *"Can we add more to the my year block? It looks
pretty empty right now."* And it was: a goal ring on the left, one line of numbers beside it
("14 books · 254 pages · 157 h 4 min listened"), and a wide empty space.

The block is what was left on the dashboard when the charts moved to the Stats page (T-0080,
D-0060), so it had been pared back to almost nothing.

Asked what should fill it, she chose three of the four offered: **the covers of what she
finished**, **how she is doing against the goal**, and **a small bar per month**. She did not
take "this year's records" (longest book, top author, busiest month), which stay on the Stats
page.

# Decision

1. **The covers of the books she finished this year**, newest first, as a row under the block,
   each one a button that opens the book. At most twelve, then "+3" for the rest — a dashboard
   block, not a second Cover wall.

2. **The goal's pace line**, beside the numbers: "1 book to go, 5 weeks left: about one every 5
   weeks". The app already worked this out for the Reading goal before it was folded in here; it
   simply wasn't shown. It appears only when a goal is set.

3. **Twelve little bars**, one per month, each as tall as that month's books against her busiest
   month, with the month's first letter under it and the full count in its label. An empty month
   is a faint stub, so the shape of the year reads at a glance.

4. **Nothing new is computed.** `periodStats`, `monthlyCounts` and `goalPace` already exist for
   the Stats page and the Reading goal; the block just asks them.

5. **Nothing is shown in a year she has finished nothing**: the block says so and leaves the
   bars and the covers out entirely.

# Rationale

A block about her year that shows her actual books is worth more than one that shows three
numbers about them, and the covers are the thing she recognises. The bars are the cheapest
possible shape of a year — twelve numbers she already has — and the pace line is the one thing
the ring implies but never said.

Leaving the records on the Stats page keeps "Open ›" worth pressing.

# Consequences

- `MyYearCard` takes `onShowBook`, so a cover can open its book.
- The block is taller. It sits in the *My stats* section, where a taller block is expected.
- "254 pages" against "157 h listened" is not a mistake and is left alone: a book she only
  listens to counts as listening time and not pages (#51, D-0008), so the pages number is her
  paper reading.
