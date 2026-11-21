---
id: D-0024
title: "The buying jar spends what a bought book cost: €5 is one coin, exact, and the jar may go below zero"
description: "A bought book (paperback, hardcover or e-book) gets an optional price asked when it is added; each euro costs 1/5 coin from the 📚 buying jar, which shows only its coin count and can go below zero; no price costs nothing, and the 3-coin treat is gone."
status: Accepted
date: 2026-11-21
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [dashboard, pile, add-book, book-panel, data]
---

# Context

T-0014 (#222) gave the "Want-to-read pile" block a 📚 buying jar: one coin per owned book read from
the pile, "Treat earned! 🎁" at 3 coins, and adding an owned book spent 3 coins automatically, only
when there were 3 (never below 0). That rule was a team definition in the task, not a decision.
In a feature chat on 2026-11-21 Hanna asked for a jar that reflects what she actually spends.

# Decision

- **Earning is unchanged:** one coin per finish from the pile (on the shelf at least 14 days) of a
  book she owns on paper or as an e-book (`paperback`, `hardcover` or `ebook`), counting from
  2026-11-01.
- **Spending is the price:** a new optional `Book.price` (D-0002), in euros. €5 is one coin,
  exactly, with decimals (€12 is 2.4 coins, €7.99 is 1.598). An owned book added on or after
  2026-11-01 spends `price / 5` coins on the day it was added. No price spends nothing; that also
  holds for books added since 2026-11-01 before this change (they no longer cost 3 coins).
- **No threshold, no floor:** the jar shows only its count ("🪙 4.6 coins") and may go below zero
  ("🪙 −1.4 coins", in the warning colour). "N of 3" and "Treat earned! 🎁" are gone.
- **The price is asked when she adds a bought book,** in the add dialog she opened herself, and is
  shown and editable in the book panel. It is never asked for library, borrowed, audiobook or
  Storytel books, nor for books the Storytel import adds; a price on a book that isn't owned (for
  example after she changes its format to library) is kept but spends nothing.
- **A free e-book (€0)** makes the add dialog ask right away for the link to the e-book file
  (`ebookUrl`, T-0007, same https/http check), which she can skip. Not for paper books at €0.
- The 🎧 Storytel jar is unchanged: a score, never spent.

# Rationale

The coin count follows her real spending: a cheap book costs little, a hardcover costs more, and
going below zero shows honestly that she bought more than she read. Working it out from the books
(no stored jar balance) keeps her phone and computer in agreement, as in T-0014.

# Consequences

- One new optional field on `Book`, so older shelves load and sync unchanged; `shelfMerge.ts` and
  syncing don't change (group 1). Merging two copies of a book (`merge.ts`, D-0009) keeps the
  kept copy's price, else the other's.
- Editing a price or a format later changes the jar retroactively, because the jar is recomputed.
- The add dialog gains a short follow-up after adding a book (how she has it, then the price).
  That is part of a dialog she opened, so D-0013 (no pop-ups) still holds.

# Guidance for agents

- Count coins in cents (`price` × 100, rounded) to avoid floating-point drift; round only for
  display.
- Never ask a price for a Storytel import or a non-owned format, and never let a price on a
  non-owned book spend.
- No explanation text next to the price field or the jar (D-0014), e.g. no "€5 = 1 coin".
