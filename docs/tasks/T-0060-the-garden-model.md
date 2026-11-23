---
id: T-0060
title: "Work the reading garden out from her shelf: plants, kinds, growth, year gardens and beds"
description: "The garden's model: one plant per finished book with its kind from genre and length, growth from her reading days, re-reads, sleep reads, did-not-finish, year gardens and beds that grow with the plants, all derived and only her spots saved."
status: Done
size: full
depends_on: []
decisions: [D-0002, D-0013, D-0014, D-0050, D-0052, G-0012, G-0031]
raised_on: 2026-11-23
done_on: 2026-11-23
result: ["https://github.com/SanderGeraedts/Hanna-s-Reading-List/pull/263"]
---

# Goal

The part of the reading garden that has no pixels: everything the two views (T-0061, T-0062) and
the dashboard block (T-0065) read. From her books and her reading log, work out

- **the plants**: one per book with a finish, never for a book she only put aside;
- **the kind** of each plant from the book's first matching genre and its length (D-0050 §3), with
  a catalogue in one file;
- **growth**: a sprout on the finish day, growing on each day she reads, paused on skipped days,
  never shrinking (D-0050 §4); a plant finished before her reading log was kept starts grown;
- **re-reads**: one plant, bigger and flowering again (D-0050 §5);
- **sleep reads**: marked night-blooming (D-0050 §6);
- **year gardens and beds**: a garden per reading year (and one for finishes with no day), with
  beds that hold a fixed number of spots and grow with the plants (D-0050 §7);
- **where everything stands**: her saved spots (D-0052) over a stable automatic placement, so a
  garden she has never touched is already tidy.

Nothing of the creatures is read or written (D-0050 §10).

# Done when

`pnpm test` passes with the new tests in `src/lib/garden/`, among them:

- a finished fantasy book of 700 pages is a tree, a romance a rose, a thriller thorny, a 90-page
  book a small flower, a book with no genre follows its length, a book with no length counts as
  280 pages;
- a book with `status: 'dnf'` and no finish has no plant; a book finished and then put aside keeps
  one; removing the book removes the plant;
- a book finished twice is one plant, bigger, with `reads: 2`;
- a sleep read's plant has `night: true`;
- growth: 0 reading days after the finish is a sprout, enough reading days is full size, a gap of
  days changes nothing but the time it takes;
- 114 plants in one year fill ten beds with no plant left without a spot, and a garden with 0
  finished books has one empty bed;
- `pnpm exec harness check` passes.

# Notes

- Follows the creatures' shape: `src/lib/creatures/cookies.ts` (reading days), `creature.ts`
  (deriving from a log), `numbers.ts` (every number in one file).
- Reads `allFinishes` (`src/lib/stats.ts`), `sleepReadIds` (`src/lib/sleepSeries.ts`),
  `listenOnly` (`src/lib/listening.ts`), `readingLog` on `Book`.
- Writes nothing on `Book`: the garden needs no new field (D-0002).
- Her spots are `place` events in the existing choice log (D-0052); the reader must ignore the
  den's `home:<slot>` keys and the den's reader must ignore `g:` keys.

# Design

Nothing a user sees on its own; the views in T-0061 and T-0062 show it.

# Test

See *Test* in T-0065, which carries the whole garden's test run.

# Log

- 2026-11-23 architect: split the garden brief of 2026-11-23 into T-0060 … T-0065, recorded
  D-0050, D-0051 and D-0052; size full. The garden needs no server change: its spots ride in the
  choice log that T-0028 already put live (D-0052).
- 2026-11-23 developer: built `src/lib/garden/` (numbers, plants, seasons, spots, garden) with
  tests; `pnpm test` green.
- 2026-11-23 tester: passed; see T-0065.
