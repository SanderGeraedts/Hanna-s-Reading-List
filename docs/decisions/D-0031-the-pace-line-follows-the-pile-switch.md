---
id: D-0031
title: "The pile's pace line follows the All · Paper · E-book · Audiobook switch, and audiobooks are counted in hours"
description: "With a kind picked under the pile switch, the pace line counts only the waiting books of that kind, at the pace she finished books of that kind in the last year (the same finishes and window as the All pace, sleep reads and re-reads included, a book counting in every kind it has); for Audiobook it divides the waiting listening time by the hours of audiobooks finished a month; a kind with no finishes in the last year gets a short no-pace line; All stays as it is."
status: Accepted
date: 2026-11-22
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [dashboard, pile, audiobooks]
---

# Context

The Want-to-read pile block ends with a pace line: "At your pace of 1.1 a month, that's about
5 years of reading." (`wantPile` in `src/lib/insights.ts`). Since T-0023 the block has an
All · 📖 Paper · 📱 E-book · 🎧 Audiobook switch (D-0030), but it only changes the height line.
In issue #233 and a feature chat on 2026-11-22 Hanna asked for the pace line to follow the switch.

The All pace is: every finish (`allFinishes` in `src/lib/stats.ts`, so a re-read counts each
time) whose day is after the same day a year ago and not after today, divided by 12. Sleep reads
count, finishes without a day don't, and the book's current status doesn't matter. The months
are `ceil(waiting books ÷ pace)`.

# Decision

- **All** stays exactly as it is.
- **📖 Paper and 📱 E-book:** the waiting books of that kind, divided by the finishes of books of
  that kind in the same window (÷ 12). Same finishes as All: re-reads and sleep reads count,
  finishes without a day don't.
- **🎧 Audiobook works in hours:** the waiting listening time (the same total as the 🎧 height
  line, D-0030: `minutes`, else `pages × 2`, else 560 per book) divided by the listening time of
  the audiobooks finished in the window (each finish adds that book's minutes by the same rule)
  ÷ 12.
- **Kinds** are those of the switch (D-0030, `bookKinds`): a book counts in every kind it has, for
  the waiting books and for the finishes. The kind comes from the book's formats today; the app
  doesn't note which format she used for each read.
- **A kind with no finishes in the window has no pace:** a short line says so instead of a time.

# Rationale

- One rule for every pace: the same window and the same finishes as the line she already knows,
  so the kinds can be compared with All.
- Hours are the honest unit for audiobooks: one 40-hour book and one 4-hour book are not the same
  amount of waiting, and the 🎧 line two lines above already speaks in hours.
- Counting a book in every kind it has keeps the pace and the pile under each button made of the
  same books, as Hanna agreed for the switch.

# Consequences

- A book she has on paper and on Storytel adds to both the paper pace and the listening pace when
  she finishes it, even if she only read the paper copy.
- The pace line changes with the switch; the switch's choice now matters to two lines.
- Built and tested in T-0024.

# Guidance for agents

- Keep the window, the finishes and the kinds shared with the All pace and with D-0030; don't
  give one kind its own rules.
- Don't change the All line's wording or numbers.
- Changing the window, leaving sleep reads out, or counting audiobooks in books instead of hours is
  Hanna's choice: ask her first.
