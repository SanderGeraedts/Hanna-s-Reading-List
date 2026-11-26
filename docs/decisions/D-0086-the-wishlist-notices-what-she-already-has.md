---
id: D-0086
title: "The wishlist counts the wishes she bought this month, and offers to take off a wish she already has — asking first"
description: "`boughtPatch` marks a bought wish with `wasWished`, so the Wishlist bookcase can say \"You bought 3 of your wishes this month\"; and a shelf book with the same title as a wish (a Storytel import, or any other) is offered in Waiting for you with Take it off the wishlist and Keep it, the keep remembered as a `w:<wish id>` event in the choice log."
status: Accepted
date: 2026-11-26
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [wishlist, dashboard, storytel, choices]
---

# Context

Two things Hanna asked for on 26 November 2026, both about the wishlist noticing what has
happened to it.

*"Can we also add something that says like hey you … wishes this month"* — asked which she
meant, she chose **the wishes she bought**: a small well-done for the ones she got round to.

*"Also a book from Storytel with the same title can remove a book from the wishlist. But ask
first."* A book arriving from Storytel can be one she has been wishing for, leaving the wish
sitting there out of date. Her own words set the rule: **ask first**. The guardrails say the
same — before removing something of hers, say what will happen and wait for her yes.

# Decision

1. **A bought wish is marked.** `boughtPatch` ("I bought it ›") already cleared `wish` and dated
   the book today; it now also sets `wasWished: true`, an optional field (D-0002). The Wishlist
   bookcase's line then reads "3 books · €41.48 · You bought 2 of your wishes this month".
   **Wishes bought before this are not counted**: they carry no mark, and inventing one would be
   guessing.

2. **A wish she already has is offered, never taken off.** A shelf book with the same title as a
   wish — the same first author too, when both name one; the title alone when one of them has no
   author, as a Storytel import often has — appears in **Waiting for you**:

   > "Babel" is on your shelf from Storytel and still on your wishlist.
   > [Take it off the wishlist] [Keep it]

   It says "from Storytel" only when the book really came from there.

3. **"Keep it" is remembered**, as a `place` event keyed `w:<wish id>` in the creatures choice
   log (D-0034, D-0067), so she is asked once per wish and not every time she opens the
   dashboard. That matters: wanting a paper copy of a book she is listening to is a good reason
   to keep a wish.

4. **One at a time, oldest wish first**, so "Waiting for you" never becomes a list of chores.

5. **Nothing is removed by the app.** "Take it off the wishlist" is her pressing a button; the
   app only ever notices and asks.

# Rationale

Marking the bought wish is the only honest way to count them: once a wish joins the shelf it is
an ordinary book, and nothing else distinguishes it from a book she simply added.

Asking rather than acting is not politeness, it is correctness — the app cannot know whether she
wants the paper copy as well. Remembering the "keep" is what stops the question becoming a nag.

# Consequences

- `Book` gains the optional `wasWished`; nothing else reads it.
- The wishlist's count line gains a second part when there is something to say, and says the
  well-done on its own when the list is empty.
- `fulfilledWishes` matches on a normalised title, so capitals, spaces and punctuation don't
  matter; a different author with the same title is left alone.
