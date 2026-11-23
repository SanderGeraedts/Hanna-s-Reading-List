---
id: D-0044
title: "A book has a pose on the shelf — standing, face-out or lying flat — as one optional field she sets in the Looks tab"
description: "An optional pose?: 'faceout' | 'flat' on Book, left out for a standing book so untouched books are byte-for-byte what they were, set per book in the book panel's Looks tab, riding along with the shelf like tropes; a face-out book turns its cover to her and takes its cover's width, neighbouring flat books stack on one another spine-out, and a pose that cannot fit on an empty shelf of this bookcase is drawn standing while the field is kept."
status: Accepted
date: 2026-11-23
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [book, bookshelf, book-panel, performance]
---

# Context

Hanna agreed this in her feature chat of 22 November 2026 (backlog item 2): per book a pose in
the book panel's **Looks** tab — **Standing · Face-out · Lying flat** — as a new optional field
on a book, synced; neighbouring books lying flat form a small stack, and a face-out book shows
its cover and takes more width on the shelf.

Four things had to be settled before it is built.

**Does this need Sander?** No, for the same reason as D-0042 §: a shelf is saved as whole
books, `mergeIntoServer` compares whole book objects and never looks at single fields, and
PocketBase's `books` field is plain JSON. An optional field rides along by itself; nothing in
`src/lib/shelfMerge.ts` or `src/server/shelf.ts` changes.

**How much room each pose takes.** `computeLayout` packs books along a shelf by their thickness
`t` and stacks nothing. A flat book and a face-out book have a different footprint, and a flat
stack has a height that a row of 0.44 m cannot always hold.

**The cover on the shelf.** Covers are loaded only when a book is taken out (T-0034): a shelf
of 150 books loads no cover pictures at all. A face-out book must show its cover, so it must
load one while it stands on the shelf. That is the one real cost of this feature.

**What happens when a pose does not fit.** On a phone the case's inner width is 0.5 – 0.8 m and
a book is 0.27 – 0.35 m tall, so two flat books fill a shelf and a flat book on the narrowest
case takes most of it. A pose that cannot be drawn must do something predictable.

# Decision

1. **One new optional field on `Book`** (D-0002, so older shelves still load):
   ```ts
   /** how this book stands on the shelf; left out = standing (D-0044) */
   pose?: 'faceout' | 'flat'
   ```
   **Standing is the absence of the field.** Setting a book back to *Standing* deletes it, so a
   book she never posed, and one she posed and put back, are byte-for-byte what they were.
   `'standing'` is never written; a saved `'standing'`, an unknown word, `null` or a number all
   read as standing.

2. **It syncs like tropes: not at all, specially** (D-0042 §2). It is part of the book, goes up
   and down with the shelf, merges book-by-book on `editedAt`, and needs no change to
   `shelfMerge.ts`, `server/shelf.ts` or `deploy/nas/`.

3. **Where she sets it:** the book panel's **Looks** tab (D-0041 §1), as a three-way picker
   *Standing · Face-out · Lying flat*, above *Front/Spine/Back*. The shelf behind the panel
   follows at once, like the spine colour.

4. **What each pose is**, in the shelf's own units (`bookDims`: `w` cover width, `h` height,
   `t` thickness):

   | Pose | Faces her | Along the shelf | Upright | Into the case |
   |---|---|---|---|---|
   | Standing | the spine | `t` | `h` | `w` |
   | Face-out | the front cover | `w` | `h` | `t` |
   | Lying flat | the spine | `h` | `t` | `w` |

   A flat book lies with its **spine towards her**, the way a pile of books on a shelf is read;
   that is why its spine's length `h` runs along the shelf.

5. **Flat neighbours stack.** Books lying flat that are **next to each other in her
   arrangement and land on the same shelf** become one stack: the same place along the shelf,
   each lying on the one before it, in her arrangement's order from the bottom up. The stack is
   as wide as its widest book and takes one book's worth of room along the shelf. Each book
   after the first is shifted a couple of millimetres along the shelf, alternating, so the
   stack looks hand-made rather than machined. **A stack never grows taller than the shelf it
   stands on**: when the next flat book would not fit under the shelf above, it starts a new
   stack beside it, which may wrap to the next shelf like any book.

6. **A face-out book shows its cover** on the shelf: the front cover picture, or, for a book
   without one, the same painted fallback cover a taken-out book gets. Only face-out books load
   a cover while on the shelf; standing and flat books load none, exactly as today.

7. **A pose that cannot fit is drawn standing.** When a pose's footprint along the shelf is
   wider than the room an **empty** shelf of this bookcase has (its inner width less the space
   kept for that shelf's decoration), the book is drawn standing. The field is kept, so the pose
   comes back by itself on a wider case — turning the phone, a wider window, or a bookcase with
   fewer decorations. Nothing is said about it in the panel or on the shelf (D-0014).

8. **Everything else about a book follows its pose:** its spine picture, gold ridges, medal,
   page edges, the paperclip of a book she is reading, hover, drag, search glow and dimming,
   and taking it out and putting it back. Taken out, a book is shown as it is today, whatever
   its pose, and it returns to its pose when it lands.

9. **The pose is hers alone.** The app never sets, changes or clears a pose: not when a book is
   finished, not when the shelf is rearranged, not when a pose does not fit.

# Rationale

Leaving the field out for a standing book is what D-0042 already does for empty tropes, and it
means this feature costs nothing at all for the shelf she has now.

Spine-out for a flat book is how a real pile sits on a shelf, and it keeps the title readable;
cover-up would hide every title in a stack.

Drawing an impossible pose standing, rather than refusing to save it or shrinking the book, is
the only behaviour that is the same on every screen size: the shelf is reshaped by the screen
(`fitShelf`), so the same book can fit on the computer and not on the phone, and she should not
lose her choice by picking up her phone.

# Consequences

- `computeLayout` gains a footprint per book and a notion of a stack; it is no longer "one book,
  one place along the shelf". Its tests grow accordingly.
- Face-out books are the only books that load a cover picture on the shelf. Each costs one
  texture and one more draw; the budget of T-0034 / D-0035 is the yardstick and a measured
  before/after is part of the task that builds this.
- Nothing about saving, merging or the server changes; no code-owned path is touched.
- Another pose later (a book leaning, a book open on a stand) is a new value in the field and a
  new row in the table above.

# Guidance for agents

- Never write `pose: 'standing'`; clear the field instead, and treat anything unknown as
  standing.
- Keep the shelf hardcover at two draws per book or fewer (D-0035) for standing and flat books;
  only a face-out book may cost more, and only for its cover.
- Work the poses' footprints out in one place in `src/lib/shelfLayout.ts`, and test the drawn
  book's world-space bounding box, not its Euler angles: the rotation is an implementation
  detail, the footprint and the face that looks at her are the decision.
- Don't let a stack grow through the shelf above, and don't let a face-out or flat book overflow
  the case: prefer standing.
- Don't change a pose on her behalf.
