---
id: D-0008
title: "For a book she only listens to, a minute of listening counts as a page, everywhere in the app"
description: "An audiobook or Storytel book she doesn't also have on paper or as an e-book gets one page per minute of listening; that number sets its thickness on the shelf and counts in bingo and every other page-based figure."
status: Accepted
date: 2026-11-07
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [data, audiobooks]
---

# Context

- #48 (2026-11-07): Hanna asked for a listening time for audiobooks: "Take one min equals one page
  when it comes to the width of the book." Built in #49.
- #51 (2026-11-07): pages and listening time should depend on one another, with the time from
  Storytel. Built in #54: for a listen-only book, Pages and Length are one number.
- #140 (2026-11-15): bingo's page squares ignored audiobooks. In #141 she chose to use the shelf's
  page count (a minute a page) over a more realistic estimate for bingo only (about two minutes a
  page), knowing that audiobooks then count as longer than the printed book, so that bingo and the
  shelf agree.

No global decision covers this.

# Decision

- A book whose formats are only Audiobook and/or Storytel has **one page per minute of
  listening**; typing either Pages or Length sets the other.
- That page count (`thicknessPages`) is **the** page count for that book everywhere: its thickness
  on the shelf, bingo squares, badges, records and other page-based figures.
- A book she also has as paperback, hardcover or e-book keeps its real page count; only its Length
  comes from Storytel (D-0007).

# Rationale

One number per book keeps the shelf, the challenges and the statistics consistent with each
other, which she preferred over realism in one place.

# Consequences

- New page-based statistics or challenges use `thicknessPages`, not `pages`, so listen-only books
  count.

# Guidance for agents

- Use the shelf's page count for anything that counts pages; don't introduce a second estimate.
- Changing the ratio, or treating audiobooks differently in one feature, is Hanna's choice: ask
  her first.
