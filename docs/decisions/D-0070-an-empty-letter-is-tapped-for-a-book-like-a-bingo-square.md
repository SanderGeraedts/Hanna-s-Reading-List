---
id: D-0070
title: "A letter she has not read yet is tapped for a book from her pile, the way a bingo square is, instead of a list of tips under the card"
description: "The A–Z card's From your pile list of linked titles is replaced by the suggestion a bingo square already gives (T-0017): tapping an empty letter opens the same panel with one book from readNextChoices that really counts for that letter, Open and 🎲 Another one, a plain line when nothing counts, and a close that puts the focus back on the letter; the dashboard's copy of the card stays a look back and suggests nothing."
status: Accepted
date: 2026-11-23
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [challenges, recommendations]
---

# Context

D-0069 gave the world, the seasonal and her own challenges a shared row of suggestions under
the card, and left the A–Z card's own list alone: linked titles under "From your pile:", with
the letter in front of each.

Hanna first asked for those to be clickable, and then said what she actually meant — she
wants them **like bingo**: not a list under the challenge, but a suggestion you get by
tapping the thing that is still empty. A bingo square has worked that way since T-0017.

Its consequence line in D-0069 — that the A–Z card keeps its own, older way — is what this
decision sets aside.

# Decision

1. **An empty letter is a button.** Tapping it opens the same panel a bingo square opens
   (`.bingo-suggest`, as the world pick already reuses), with the letter named in its
   heading: "A title with B", or "An author with B" for the authors challenge.
2. **One book at a time, with 🎲 Another one** when more than one counts, and **Open** to
   open the book. Nothing changes the shelf by itself.
3. **The pool is `readNextChoices`** (D-0025: wants to read, never finished, out already, a
   series strictly in order, no sleep reads), weighted like Make a wish, filtered by the
   challenge's own `lettersOf` — so a book offered for B really does tick B when she
   finishes it. A finished book is never offered; the bingo "A re-read" square is the one
   place in the app that does that, and it stays the only one.
4. **When nothing counts** the panel says "No book on your shelf counts for B yet."
5. **Closing puts the focus back on the letter,** and a letter that becomes read while its
   panel is open closes it — the same handling the bingo card has.
6. **A letter already read keeps its own panel,** the one that picks which book stands for it
   (#152); the two never show at once.
7. **The dashboard's copy suggests nothing.** It is a look back at the year, and its letters
   stay plain text.

# Rationale

One way of asking for a suggestion across the page is easier to learn than two, and tapping
the empty thing is where she looks for it. The panel, the drawing and the weighting already
existed for bingo, so this is a letter's own pool plus the same panel, not a new idea.

# Consequences

- The A–Z card no longer lists five tips at once; she asks a letter at a time.
- The authors challenge no longer names the author beside a tip; the panel shows the book
  with its authors in full.
- `.alphabet-tips` and `.alphabet-tip-letter` are gone from the stylesheet, and an empty
  letter now has a pointer and a focus ring.

# Guidance for agents

- A letter's pool lives in `src/lib/alphabetSuggest.ts` and must keep using `lettersOf`, so
  the suggestion and the challenge can never disagree about what counts.
- The suggestion panel is shared: reuse `.bingo-suggest` rather than styling a new one.
