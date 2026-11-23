---
id: D-0050
title: "The reading garden grows from reading alone: every finished book is a plant the book decides, she decides where it goes, and nothing ever dies"
description: "A garden of plants worked out from her shelf and her reading log, with no cookies and nothing shared with the creatures: every finished book becomes one plant whose kind follows its genre and length, a plant starts as a sprout on its finish day and grows on the days she reads (skipped days pause it, nothing ever dies), a re-read makes the plant bigger and flower again instead of adding a second one, a book she did not finish gets no plant, a sleep read gets a night-blooming plant, removing a book removes its plant, and each reading year has its own garden whose beds grow with the plants in it."
status: Accepted
date: 2026-11-23
decided_by: architect
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [garden, game, dashboard, sync]
---

# Context

Hanna asked for a reading garden and agreed the brief on 2026-11-23, after a long feature chat
in which she settled every open point herself: her own 🌱 Garden tab, the book decides the kind
of plant and she decides where it goes, daily reading grows it, nothing ever dies, year gardens
with beds that unlock, tending (moving plants, garden items, visitors), garden items unlocked by
reading milestones and **not** a shop, real seasons, and — her explicit choice — a flat drawn
top-down garden on the phone with the cosy 3D style on the computer (D-0051).

The creatures (D-0033) already work this way: what she earns is worked out from the reading log
and only her choices are saved (D-0034). The garden follows the same pattern, but is **completely
separate from the creatures and their 🍪 cookies**: no shared currency, no shop, no second
balance. It grows straight from reading. Several points in the brief would need a discussion to
reverse once she has a garden full of plants (what a book turns into, what growth is, what a
re-read does), so they are recorded here.

# Decision

1. **Worked out, never stored.** Every plant, its kind, its size, its growth, which beds exist
   and which garden items are unlocked are computed from her books (`finished`, `readCount`,
   `readingLog`, `genres`, `pages`, `minutes`, sleep reads) on every device. Only her **choices**
   are saved (D-0052): where a plant stands and where a garden item stands. Fixing a past day
   changes the garden, as it changes the creatures.
2. **One plant per finished book.** Every book with a finish is one plant, whatever year it was
   finished in — the garden is not limited to a start day, because her shelf already holds years
   of reading. A book she **did not finish** (`status: 'dnf'`), or has never finished, gets no
   plant. **Removing a book removes its plant** and leaves its spot empty.
3. **The book decides the kind, she decides the spot.** The kind of plant follows the book's
   **first matching genre** and its **length** (pages, or listening minutes for a book she only
   listens to, with the same fallback as the creatures: a book with no length counts as 280
   pages). Long + fantasy is a tree, romance is a rose, a thriller is dark and thorny, a short
   book is a small flower, a book with no genre follows its length alone. The mapping lives in one
   file and may be tuned without a new decision; that the **book** decides it, and that she
   decides **where it goes**, may not.
4. **Growth comes from reading days.** A plant appears as a **sprout** on the day the book was
   finished and grows on each day she reads anything (a day with reading in `readingLog`) from
   that day on: sprout → young → grown, full size after a fixed number of reading days. **Skipped
   days pause growth; nothing ever shrinks, wilts or dies.** A plant whose book was finished
   before her reading log was kept starts fully grown rather than as a sprout, so old years do not
   look empty.
5. **A re-read grows the plant it already has.** Finishing a book again never adds a second
   plant: the plant gets bigger (a size step per re-read, up to a cap) and flowers again (an extra
   bloom that shows in every season). The plant belongs to the year of its **first** finish.
6. **Sleep reads are marked, not hidden.** A sleep read (D-0033's `sleepReadIds`) gets a plant
   like any other, marked **night-blooming**: pale moon-coloured blossom and a 🌙 in its label.
   The kind still follows genre and length, so the mark is a marker, not a separate catalogue.
7. **Year gardens, beds that grow with the plants.** Each reading year has its own garden area.
   Within a year, beds unlock as she reads more: a bed holds a fixed number of spots and the next
   bed is there as soon as the plants need it, so a plant can never be homeless and a bed is never
   half a surprise. Finishes with no day at all (books finished before the app noted dates) go in
   one garden of their own, before the years.
8. **Garden items are unlocked by reading, never bought.** Path, bench, birdbath, pond, lanterns
   and greenhouse unlock at a number of **finished books all time** (e.g. bench 10, pond 25,
   greenhouse 50). There is no shop, no price and no second currency, and an unlocked item is
   never lost. The numbers live in one file and may be tuned; that they are unlocked by reading
   may not.
9. **Visitors come as it fills and blooms.** Bees, butterflies and birds appear by themselves as
   the garden has more plants in bloom and more items; they are decoration, never a score, they
   are capped, and they hold still with reduce motion.
10. **Nothing in the garden costs or earns cookies,** and nothing in the creatures changes what
    the garden does. The two games never share a number.
11. **No pop-ups** (D-0013) and **no hint texts** (D-0014): what the garden has to say shows in
    its own tab, its dashboard block and *Waiting for you*.

# Rationale

Working the garden out from the reading log means it can never get out of step with her shelf, a
fixed past day simply counts, and a new device shows the same garden at once. One plant per book
with the kind fixed by the book keeps the garden a picture of what she has read, while leaving her
the part she asked for: where everything goes. Beds that grow with the plants remove the only way
a garden could break (more plants than spots) without taking the unlocking feeling away.

# Consequences

- Every count the garden uses needs a test, because a change to it changes her garden.
- A change to how finishes or the reading log are stored must keep the garden the same.
- The catalogue, the growth numbers and the item milestones can be tuned in one file; the rules
  above need a new decision.
- Books with no genre, no length or no finish day all have to be handled; tests cover each.

# Guidance for agents

- Never store a plant, its stage or its size: derive them. Store only her choices (D-0052).
- Never let the garden read or write cookies, eggs, pets or anything else of the creatures, and
  never give a plant a price.
- Nothing in the garden may remove or shrink a plant; only removing the book does that.
- A book with `status: 'dnf'` and no finish gets no plant; a book finished and then put aside
  keeps its plant.
