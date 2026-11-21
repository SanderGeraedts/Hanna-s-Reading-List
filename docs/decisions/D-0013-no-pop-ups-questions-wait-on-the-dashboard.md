---
id: D-0013
title: "The app asks nothing in pop-ups: what it wants to know waits in Waiting for you on the dashboard"
description: "The rating question after finishing a book and Part of a series? are no longer dialogs; they wait in a Waiting for you block at the top of the dashboard, which hides itself when nothing is waiting."
status: Accepted
date: 2026-11-15
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [dashboard, interaction]
---

# Context

- #100 (2026-11-12): Hanna asked for a rating pop-up after a book is marked read (#108).
- #129 added a *Part of a series?* pop-up for new books by an author with a series; #131
  (2026-11-13) reported it never appeared on her phone (#133 fixed the start time), and #137 added
  the rating pop-up for books the nightly sync finished.
- #139 (2026-11-15): she still didn't get the pop-ups. Talked through with her, she chose **no
  pop-ups at all**: what they asked waits on the dashboard instead. `RatingDialog` and
  `SeriesQuestionDialog` were removed.

Later, #169 put "New badge" notices in the same block. The short "Badge unlocked" toast of #178
asks nothing and closes by itself, so it doesn't go against this.

# Decision

- **No dialog opens by itself to ask her something.** Marking a book read opens nothing.
- **Questions wait in *Waiting for you*,** at the top of the dashboard: finished books to rate
  (stars, spice, *Done* / *Skip*), *Part of a series?* for new books, and new badges. It hides
  itself when nothing is waiting.

# Rationale

Pop-ups were missed on her phone and interrupted her; a list she can work through when she opens
the dashboard is reliable and calm.

# Consequences

- A new feature that needs her answer adds an entry to *Waiting for you* instead of a dialog.

# Guidance for agents

- Don't add pop-ups or modal questions that open on their own; use *Waiting for you*.
- A dialog she opens herself (e.g. *Add book*, *Merge with…*) is fine.
- Bringing back pop-ups is Hanna's choice.
