---
id: D-0073
title: "A pose is judged by the shelf it lands on, not the narrowest one, and a book dropped on a lying book joins its pile"
description: "D-0044 §7's fitting rule is widened: a flat or face-out book is drawn in its pose when it fits the roomiest shelf of the case and it skips shelves too cramped to hold it, so lying flat works on a phone; the Looks tab says so when no shelf has room; and dropping a dragged book on a lying book or a pile puts it on top and lays it down, the one time the app sets a pose itself."
status: Accepted
date: 2026-11-24
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [bookshelf, book-panel, pose]
---

# Context

Hanna asked in #271 to be able to stack books that lie down, for instance a whole series. That
is what D-0044 §5 already builds: neighbouring flat books that land on the same shelf form one
pile. She tried it and reported: "it didn't work on my phone."

It did not, and D-0044 §7 is why. A flat book takes its **height** along the shelf (0.27–0.35),
and on a portrait phone `shelfFitFor` makes the case 0.50–0.60 wide. §7 then measures the pose
against the **most cramped** shelf of the case — the inner width less the room kept for the
widest decoration, 0.18 for the cat plus 0.07 of margin — which on a phone leaves about 0.30.
Most of her books are taller than that, so the pose was quietly dropped and the book drawn
standing, with nothing said anywhere (§7's last line). From where she sits the button does
nothing.

§7 chose the most cramped shelf so that "a book's pose never depends on its neighbours". That is
a real property, and it costs her the feature on the device she reads on.

# Decision

1. **A pose is judged twice: by the roomiest shelf of the case, and then by the shelf the book
   lands on.**

   First, `computeLayout` measures a wanted pose against the most room any shelf of this bookcase
   has (`widest`: the inner width, less a decoration's room only while every shelf has a
   decoration), instead of the least, as §7 did. A pose that **no** shelf of the case could hold
   is drawn standing with the field kept, exactly as before. How many shelves the case has is
   counted with every book standing — the fewest it can ever be — so this never depends on the
   poses it is deciding and can never argue with itself.

   Then, where the book actually lands:
   - it does not fit the room left on that shelf → it moves down a shelf, as any book does;
   - it does not fit that shelf's room at all (the decoration keeps the end of it) **and** the
     shelf already has books → it moves down one more, which leaves no shelf empty;
   - it does not fit an **empty** shelf's room → those books are drawn standing there. Standing
     is always narrower, so the shelf fills up as usual.

   **No shelf is ever left empty by a pose.** An earlier version of this decision let a wide item
   walk past a cramped shelf until it found room; that drew whole empty shelves between her
   books, which looked broken. Standing on a cramped shelf is the price of never doing that.

2. **What she gives up for it, said plainly:** which shelf a book lands on now decides whether a
   roomy pose is drawn, so rearranging the shelf can change it, and a pile that lands on a
   decorated shelf of a narrow case stands. In exchange, lying flat works on her phone on every
   shelf a decoration does not cram, which is most of them on a shelf of her size (one decoration
   per shelf, in `DECOR` order, so only the first handful of shelves are affected at all).

3. **When no shelf has room, the Looks tab says so**, under the pose picker: one muted line
   naming the pose, e.g. "Lying flat doesn't fit this bookcase on this screen — it stands here
   and comes back on a wider screen." This narrows D-0044 §7's "nothing is said about it" and
   D-0014: it is not a pop-up and not a warning, it is the answer to "why did nothing happen",
   which she had to ask us.

4. **A book dropped on a lying book joins its pile.** While a book is dragged on the shelf, a
   drop whose pointer is over a book lying flat — or over the pile it is part of — puts the
   dragged book **on top of that pile**: it is placed straight after the pile's topmost book in
   her arrangement and is set to lying flat. The drag preview shows it lying on the pile before
   she lets go.

5. **This is the one time the app sets a pose**, which D-0044 §9 reserved for her alone. It is
   allowed here because the drop *is* her saying it: she aimed a book at a pile. Nothing else
   changed: finishing a book, rearranging, sorting and a pose that does not fit still never
   touch the field.

6. **A book dragged out of a pile keeps lying down** (her choice, feature chat of 24 November
   2026). It lands where she dropped it, still flat — on its own or on the pile she dropped it
   on. Standing it up again is the Looks tab's job, so the app never quietly undoes her choice.

# Rationale

Measuring against the roomiest shelf is the smallest change that makes the feature real on a
phone, and it keeps every promise §7 cared about except one: her choice is never lost, an
impossible pose is still drawn standing, and the field is never rewritten.

Dragging books onto each other is how a pile is made on a real shelf, and the shelf already has
press-and-hold dragging, so the gesture costs no new idea. Setting the pose on the drop is the
difference between "my series is a pile" and "open four panels first".

# Consequences

- `computeLayout` gains a pre-count of the rows with everything standing, and its `fit` can skip
  a cramped shelf. Its tests grow with a narrow-case case.
- `BookshelfScene`'s drag reports an optional "lay it down" alongside the new order, and the
  page turns that into one `posePatch('flat')` next to the reorder.
- A shelf arranged differently can draw a roomy pose differently. Nothing is saved differently.
