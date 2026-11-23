---
id: D-0038
title: "Badges are round medals in a grid; a badge's rim is bronze, silver or gold by its step in its family, and a badge on its own is gold"
description: "The Badges block shows every badge as a round medal with its emoji in a grid, earned (newest first), then locked (closest first), then hidden; a tap opens one card under the grid; badges whose ids differ only in their last number (books-1 … books-250) are one family, whose lowest step is bronze, highest gold and the rest silver; a badge without a family is gold; locked medals are grey, hidden ones dark with a ?."
status: Accepted
date: 2026-11-23
decided_by: architect
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [badges, dashboard, design-system]
---

# Context

Hanna asked (feature chat "better badges", 2026-11-22) for a compact Badges block: a grid of
round medals instead of the long list of tiles, with a bronze, silver or gold rim ("first step
bronze, middle silver, last gold; one-off badges gold"), locked medals grey and hidden ones a dark
medal with a "?". The block has 60 badges today and more are coming (T-0043), so the tier must
follow from the badges themselves, not from a hand-kept list that a new badge can forget.

# Decision

- **The grid:** every badge is a round medal with its emoji in the middle, in one grid, in this
  order: earned (newest day first, undated last), locked (closest to done first), hidden (secret
  and not earned). The head row stays: the title that folds the block, "N of M unlocked (P%)"
  and the bar.
- **The card:** tapping a medal opens one small card under the grid, inline (no pop-up,
  D-0013), with its name, what it takes and its day or progress; a hidden medal's card shows its
  riddle and never its name. Tapping it again, or another medal, closes it or switches.
- **The tier** is worked out in `src/lib/badges.ts` as `Badge.tier`:
  - a **family** is the badges whose ids are the same up to a final `-<number>` (`books-1`,
    `books-5` … `books-250`; `reread-3` and `reread-5`; `author-5` and a later `author-10`),
    secret ones included;
  - in a family of two or more, ordered by that number: the lowest is **bronze**, the highest
    **gold**, every one between **silver** (a family of two has no silver);
  - a badge in no family (one-off ones like `bingo`, the postcards, `home-sweet-home`, or a
    single `continents-6`) is **gold**.
- **Locked** medals are grey whatever their tier; **hidden** medals are dark with a "?". Only an
  earned medal shows its rim colour.
- The rim colours are design-system tokens (D-0020) defined for both wallpapers (D-0022).

# Rationale

Deriving the family from the id keeps one rule for every badge, today's and tomorrow's: a new
step badge gets the right rim by its id alone, and a test can check the whole list. Grey for
every locked medal keeps one clear difference between earned and not earned, as the tiles had.

# Consequences

- A new step badge must use the `<family>-<number>` id pattern to join its family; a one-off
  badge must not end in `-<number>` unless it is meant to join a family.
- Adding a higher step later moves the old highest step from gold to silver (e.g. a 365-day
  streak makes the 100-day streak silver). That is intended.
- The badge toast and the "Waiting for you" line don't change.

# Guidance for agents

- Keep the tier in `badges.ts`, not in the component; the component only reads `tier`.
- Don't hand-list tiers per badge id.
- Never show a hidden badge's name or emoji before it is earned.
