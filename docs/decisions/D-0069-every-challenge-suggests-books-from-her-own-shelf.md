---
id: D-0069
title: "A challenge that is still open suggests up to three books from her own shelf that would count, and says plainly when her shelf has none"
description: "The world, the seasonal and her own challenges get what A–Z (#152) and bingo (T-0017) already had: up to three books from her pile — what she is reading or has paused first, then what she wants and could really start next — each with the reason it fits, opening the book when tapped; when nothing on her shelf fits, the card says so instead of showing nothing, and nothing is ever fetched from the internet."
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

Hanna asked for "books that fit a challenge as a recommendation" and said they are not on
all challenges. That is exactly right: the A–Z card has offered books from her pile since
\#152 (`alphabetYear().tips`), and a bingo square suggests one when she opens it (T-0017),
while the world, the seasonal and her own challenges offered nothing at all.

She chose her **own shelf** as the source rather than Open Library, which "New for you"
already uses: the suggestions are then instant, always right, and they get her own unread
pile moving. She also chose that a challenge with nothing matching should **say what would
fit** rather than show nothing, so a card is never silently blank.

Three challenges are left out on purpose, because no book is more fitting than another for
them: the reading goal, the minutes a day and the monthly picks (which she makes herself),
and the series challenge, which already has its own picks.

# Decision

1. **The pile rule is the A–Z one, shared.** `pileOf` in `src/lib/challengeFits.ts` is the
   single definition: a book she is reading or has paused first, then one she wants, and a
   wanted book only when she could really start it next (a series in order, D-0025). Never a
   sleep read, never a book that isn't out yet, never one she has finished.
2. **Up to three suggestions** per challenge, each with the reason it fits in her words
   ("Set in Peru", "For winter").
3. **One reason per suggestion:** three world suggestions are three new countries, and three
   seasonal ones are three different seasons, not three books for the same gap.
4. **Tapping a suggestion opens the book** and never changes the shelf.
5. **Nothing fetched.** Only her own shelf is read, so a challenge card can never sit waiting
   on the internet or fail with it.
6. **When nothing fits, the card says what would.** "Nothing on your shelf is set in a new
   country — 4 more countries to go."
7. **A finished challenge suggests nothing,** so a completed card stays a celebration.

# Rationale

One pile rule shared by every challenge means the suggestions can never disagree about what
she could pick up next, and lifting it out of `alphabet.ts` was the whole cost. Her own shelf
keeps the feature instant and offline, which matters on a card that is drawn on every visit
to the page.

# Consequences

- A book with no places, no genres and no tropes can never be suggested; that is a reason to
  fill those in, and the book panel already offers them.
- The A–Z card and the bingo card keep their own, older ways of suggesting; they were not
  rewritten onto this one.

# Guidance for agents

- Add a new challenge's suggestions to `challengeFits.ts` with `pileOf`, never a second pile
  rule, and never a network call from a challenge card.
- A suggestion never writes to the shelf: it opens the book and stops there.
