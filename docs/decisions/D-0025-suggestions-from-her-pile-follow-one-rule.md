---
id: D-0025
title: "Every book suggested from her pile follows one rule: series strictly in order, nothing not out yet, no sleep reads, and re-reads only on bingo's re-read square"
description: "Make a wish, What next?, the weekly dust-off book, bingo suggestions and A–Z tips for want-to-read books all come from readNextChoices, which now also leaves out sleep reads; the bingo re-read square is the only place a finished book is suggested."
status: Accepted
date: 2026-11-21
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [suggestions, series, sleep-reads, bingo, alphabet, dashboard]
---

# Context

`readNextChoices` (`src/lib/readNext.ts`, #58, made strict for Make a wish in T-0013) is the list of
books Hanna could start next: want to read, never finished, out already, and in a series only when
every earlier book is read (a book missing from the shelf counts as unread). Make a wish, the
dashboard's What next? and the weekly dust-off book (T-0014) use it. Two places did not follow it:

- the A–Z tips (`alphabetYear` in `src/lib/alphabet.ts`) suggested any book not yet read, so book 3
  of a series could be a tip while book 2 was still unread;
- sleep reads (books she reads to fall asleep, `sleepReadIds` in `src/lib/sleepSeries.ts`) could be
  offered by `readNextChoices` itself, while she never wants them recommended as a next read.

In a feature chat on 2026-11-21 Hanna also asked for suggestions on empty bingo squares (T-0017),
with the same rules, and one exception: the "A re-read" square.

# Decision

- **One list.** Every want-to-read book the app suggests from her own shelf comes from
  `readNextChoices`: Make a wish, What next?, the weekly dust-off book, the bingo square
  suggestions and the A–Z tips.
- **No sleep reads.** `readNextChoices` leaves out every book in `sleepReadIds` (ticked itself or
  through its series).
- **Re-reads only on bingo's re-read square.** That square suggests a book she has finished; no
  other suggestion offers a finished book.
- **Books she is reading or has paused** may still be A–Z tips (she is already at them; the series
  rule is about which book to *start*).
- **Not covered:** the monthly challenge picker (`src/lib/monthChallenge.ts`) and her own
  challenges keep their own rules; New for you suggests books that are not on the shelf.

# Rationale

One rule in one function means a new suggestion can't forget the series order or the sleep reads,
and Hanna never sees a book she can't or won't start next. Changing `readNextChoices` itself puts
all existing suggestions right in one place.

# Consequences

- Every caller of `readNextChoices` stops offering sleep reads at once (Make a wish, What next?,
  the dust-off item, `src/lib/pile.ts`).
- A new feature that suggests a book from her pile must use `readNextChoices`, or record a decision
  that replaces this one.

# Guidance for agents

- Preserve: the series check, the not-out-yet check and the sleep-read check live in
  `readNextChoices`; callers don't repeat or loosen them.
- Avoid: suggesting a finished book anywhere but bingo's "A re-read" square; filtering
  `readNextChoices` results with a looser list "to have more to show".
- Stop and ask (Hanna, in plain words) before changing the monthly challenge picker to this rule:
  she asked for it to stay as it is.
