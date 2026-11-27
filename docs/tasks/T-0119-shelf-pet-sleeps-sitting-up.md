---
id: T-0119
title: "Let the shelf pet nod off sitting up instead of tipping into the shelf"
description: "At night (22:30–07:00) the shelf pet stays sitting on the plank with its head drooped, eyes shut and books beside it, instead of falling sideways half into the wood."
status: Done
size: small
depends_on: []
decisions: [D-0001, D-0077]
raised_on: 2026-11-27
done_on: 2026-11-27
result: []
---

# Goal

Hanna's fox on the top shelf looked broken at night. The sleep pose (T-0033 §8c) turned the
whole pet 90° around its feet, so half of it sank into the shelf plank, and the night book pile
was scaled with the pet and drawn inside it. Asleep, the pet now keeps sitting: head drooped
forward and tipped a little to one side with a slow nod, eyes shut, slower and deeper breaths,
and a small pile of books on the shelf beside it. Same for all 20 creatures.

Also fixed on the way: a raised arm (after a cheer or a point) never came back down, and the
pet no longer points at a reading book in its sleep.

# Done when

`pnpm exec vitest run src/components/creatures/ShelfPet.test.ts` passes, and on the live shelf
after 22:30 Hanna sees her pet sitting on top of the shelf, asleep, with books beside it.

# Notes

- `src/components/creatures/ShelfPet.tsx`: `shelfPetPose()` and `BOOK_PILE_AT`; the holder no
  longer rotates.
- Agreed with Hanna in a feature chat (option "Nodding off sitting").

# Design

Chosen by Hanna: nodding off sitting (over lying on the side or on the tummy), because it suits
every creature and cannot sink into the shelf. Rendered before/after for the red fox, the Adélie
penguin and the library owl with the real models on a shelf plank: before, half the fox was
under the plank (as in Hanna's screenshot); after, each sits on the plank with head drooped,
eyes shut and the books peeking out beside it.

# Test

See *Log*: the new unit tests, the full suite and the build ran locally.

# Log

- 2026-11-27 developer: built on `fix/sleeping-shelf-pet`, small task done in one session on Hanna's instance (feature chat instead of a separate architect/UX pass).
