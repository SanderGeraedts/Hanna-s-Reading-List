---
id: D-0029
title: "The want-to-read pile's height is its books' shelf thickness added up, without books she only listens to"
description: "The Want-to-read pile block shows how tall her want-to-read books would stand stacked up: the sum of each book's thickness on the shelf (bookDims, 1 unit ≈ 1 metre), leaving out books she only listens to, which have no paper to stack; the one place where a listen-only book's minutes don't count as pages."
status: Replaced
date: 2026-11-22
decided_by: architect
overrules: []
replaces: []
replaced_by: [D-0030]
resolves: []
tags: [dashboard, pile, audiobooks, shelf]
---

# Context

Hanna asked (#224) to see how tall her want-to-read pile would be if all its books were stacked
on top of each other, in cm or m, with a fun comparison. The app already gives every book a
thickness: `bookDims(book).t` in `src/lib/shelfLayout.ts`, from `thicknessPages` (D-0008), in
world units where 1 unit ≈ 1 metre. A 300-page book is about 3.5 cm there; a book without a page
count stands as 280 pages.

D-0008 says a listen-only book's minutes count as its pages everywhere, including its thickness,
and that treating audiobooks differently in one feature is Hanna's choice. A pile of paper
books is a physical thing, and an audiobook she only listens to has no paper to put on it. The
request's scope says to leave those books out. Hanna asked the team to take the recommended option
for anything still open, so this is recorded here and listed in T-0021's choices, where she sees it
and can reverse it.

# Decision

- The height is the **sum of `bookDims(book).t`** (in metres) over her want-to-read books
  (`status === 'want'`, the same set as `wantPile`).
- A book she **only listens to** (`listenOnly`: only Audiobook and/or Storytel) is **left out**.
  This is the one exception to D-0008, for this height only; everywhere else its minutes still
  count as pages.
- Every other want-to-read book counts with the thickness it has on the shelf, including e-books
  (they stand on her shelf too), books she has on paper and as an audiobook (their own page count),
  and books without a page count (the shelf's 280 pages).
- There is no second thickness formula: a change to the shelf's thickness changes the pile's
  height with it.

# Rationale

The pile then matches the shelf she looks at every day: a book that stands thick on the shelf adds
a lot to the pile. One formula keeps them from drifting apart, as D-0008 asks. Leaving listen-only
books out matches what "stacked on top of each other" means; counting them by their minutes would
make a long audiobook add more to the pile than any printed book.

# Consequences

- `bookDims` stays the only place that turns pages into thickness; the pile reads `t` from it.
- The shelf's thickness is a bit generous for real paperbacks (about 3.5 cm for 300 pages), so the
  height is an estimate, worded as one ("about", "would be").

# Guidance for agents

- Don't add a separate "real-world" thickness for the pile; change the shelf's formula or ask.
- Don't count listen-only books in the height, and don't take this as leave to stop counting their
  minutes as pages elsewhere (D-0008 still holds there).
- Counting e-books or not, or listen-only books after all, is Hanna's choice: ask her first.
