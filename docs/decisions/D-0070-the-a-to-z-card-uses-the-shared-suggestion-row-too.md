---
id: D-0070
title: "The A–Z card suggests with the same clickable covers as every other challenge, instead of its own list of titles"
description: "D-0069 left the A–Z card's older From your pile list of linked titles alone; at Hanna's request it now uses the shared suggestion row — up to three covers, the missing letter as the reason, tapping opens the book — so a suggestion looks and behaves the same everywhere on the Challenges page. The bingo card keeps its own, which suggests inside a square she has opened."
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

D-0069 gave the world, the seasonal and her own challenges a shared suggestion row and left
the A–Z card's own list alone, because it already suggested from her pile: a line of linked
titles under "From your pile:", with the letter in front of each. Hanna asked for those to be
clickable suggestions like the new ones rather than a list beneath the challenge.

Its consequence line — that the A–Z card keeps its own, older way — is what this decision
sets aside. The bingo card is a different thing: it suggests inside a square she has opened,
not under the card, so it is untouched.

# Decision

1. **The A–Z card uses `ChallengeFits`**, the same row as the other challenges: up to three
   books from the same pile (`pileOf`, D-0069 §1), each shown as its cover with the reason
   underneath, and tapping one opens the book.
2. **The reason is the missing letter**, written "Letter T", for both the titles and the
   authors challenge.
3. **The row shows only while letters are missing,** and says the shared "nothing fits" line
   when her pile has nothing for any of them, so a finished alphabet stays a celebration
   (D-0069 §6, §7).
4. **Up to three, not five.** The old list showed five; the shared row shows three, like
   every other challenge.

# Rationale

One look for a suggestion across the whole page is easier to learn than two, and a cover is
quicker to recognise than a title in a list. The row already existed, so this costs a swap
rather than new code.

# Consequences

- The A–Z authors challenge no longer names the authors beside a suggestion: the cover and
  the letter carry it, and the book's own panel has the rest.
- Two fewer suggestions are offered there than before.
- `.alphabet-tips` and `.alphabet-tip-letter` are gone from the stylesheet.

# Guidance for agents

- A new challenge's suggestions use `ChallengeFits` and `pileOf`; the bingo square is the one
  exception and stays as it is.
