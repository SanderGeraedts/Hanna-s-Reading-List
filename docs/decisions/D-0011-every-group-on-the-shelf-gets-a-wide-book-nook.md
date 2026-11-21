---
id: D-0011
title: "Every group on the shelf gets a wide book nook with a scene and a tall sign; no slim dividers and no series figures"
description: "When the shelf is arranged, each group stands behind a wide book nook with one of ten scenes matched to its books and a vertical sign with its name; the slim labelled dividers and the series figures were tried and taken out."
status: Accepted
date: 2026-11-08
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [look, bookshelf]
---

# Context

Recorded as the current state; the history is below, as each step replaced the one before.

- #7 (2026-11-04): Hanna asked for book nooks per series, like the ones per reading status, and
  for readable sign text. Built as small wooden dividers.
- #17 (2026-11-07): nooks for every arrangement, with different scenes that fit the group. In the
  triage she chose all arrangements, a set of scenes that take turns, scenes matched to the books,
  and "yes that" to nooks only between bigger groups. #34 built ten scenes, a nook before groups of
  three or more books and a slim divider before smaller ones.
- #36 (2026-11-07): from a screenshot with both kinds she wrote "I only want the wider ones". #38:
  every group gets a wide nook, the first and small ones too; the slim dividers are gone.
- #50 (2026-11-07): the sign text written vertically (#52: a tall narrow board, name top to
  bottom).
- #56 (2026-11-07): figures from the series in their nooks (#57: dragon, stag Patronus, trident …).
  Taken out again on 2026-11-08 in #79, "as asked" in chat; the record doesn't say by whom.
- Later additions kept to this: the gold sign with ★ for a series read completely (#18, #32), a
  medal under it (#127), a 🌙 for a sleep series (#129).

# Decision

- When the shelf is arranged, **every group gets a wide book nook** before it (when there is more
  than one group), including the first and the smallest groups. No slim dividers.
- **Ten scenes** (night alley, enchanted forest, beach at sunset, castle, snowy village, rainy neon
  street, cosy library, sunny meadow, outer space, northern lights), chosen by the group's main
  genre or name, each group in its own variation.
- **The sign is a tall board** with the group's name written down it.
- **No figures from the series** in the nooks.

# Rationale

These are Hanna's choices about how her shelf looks: wide nooks only, readable signs, and the
scenes without the figures.

# Consequences

- The divider component (`SeriesDivider.tsx`) is unused for groups; new group marks go on the nook
  sign.

# Guidance for agents

- Keep marks for a group (gold ★, medal, 🌙) on the nook's sign, not as a separate divider.
- Don't bring back slim dividers or series figures without Hanna asking for them.
