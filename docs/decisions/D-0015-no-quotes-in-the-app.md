---
id: D-0015
title: "No quotes anywhere in the app; quotes she already typed stay in her data"
description: "The quote card, loved quotes and the quotes field in the book panel were removed at Hanna's request; Book.quotes and Book.lovedQuotes stay in the data, unused, so nothing she typed is lost."
status: Accepted
date: 2026-11-08
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [dashboard, data]
---

# Context

The dashboard (#59, #64, 2026-11-07) had a quote card from read books, and #66 (#69) added loved
quotes. On 2026-11-08 Hanna asked in #84: "Please remove the quotes options everywhere." #95
(merged 2026-11-12) removed the quote card, loved quotes and the quotes field in the book panel;
`src/lib/library.ts` keeps `quotes` and `lovedQuotes` with the comment "no longer shown (#84), kept
so nothing she typed is lost", and merging duplicates still combines them.

On 2026-11-19 she asked in #183 for quotes (among other things) made with AI; that is open
question Q-002, about AI. Q-002's description of quotes as "typed by Hanna (loved quotes on the
dashboard)" predates checking this: they are not shown anywhere today.

# Decision

- The app shows **no quotes**: no quote card, no loved quotes, no quotes field.
- **The stored quotes stay** on her books (`Book.quotes`, `Book.lovedQuotes`), unused, and keep
  being combined when books are merged.

# Rationale

Her request, about her own app. Keeping the data costs nothing and means nothing she typed is
lost, should quotes come back.

# Consequences

- If quotes come back (Q-002 or a new request), this decision is replaced, and the stored quotes
  can be shown again.

# Guidance for agents

- Don't add quote features unless Hanna asks for them again; then replace this decision.
- Never remove `quotes` or `lovedQuotes` from `Book` or from the merge rules; removing a field is
  the Engineer's (`docs/hanna-guardrails.md`).
