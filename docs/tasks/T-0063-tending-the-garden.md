---
id: T-0063
title: "Let her tend the garden: move plants, place garden items unlocked by reading, and let visitors come"
description: "Moving a plant between spots and beds with a finger, a mouse and a keyboard (an occupied spot swaps), the six garden items unlocked at reading milestones and placed in the item strip, and bees, butterflies and birds that come as the garden fills and blooms."
status: Done
size: full
depends_on: [T-0060, T-0061, T-0062]
decisions: [D-0013, D-0014, D-0050, D-0051, D-0052]
raised_on: 2026-11-23
done_on: 2026-11-23
result: ["https://github.com/SanderGeraedts/Hanna-s-Reading-List/pull/263"]
---

# Goal

The part Hanna does herself: **she chooses where everything goes**.

- Move a plant to another spot, in the same bed or another bed of the same year garden; dropping it
  on a spot that is taken swaps the two plants.
- Place the garden items she has unlocked — path, bench, birdbath, pond, lanterns, greenhouse — and
  take one away again. They unlock at a number of finished books all time (D-0050 §8); there is no
  shop and no price.
- Visitors — bees, butterflies, birds — come by themselves as the garden fills and blooms.

Every choice is saved as a `place` event in the existing choice log (D-0052), so the garden looks
the same on her phone and her computer, and nothing is ever lost.

# Done when

`pnpm test` passes with the new tests:

- moving a plant to an empty spot writes one `place` event with the key `g:p:<book id>` and the new
  bed and spot, and the plant is there after a reload of the log;
- dropping on an occupied spot writes **two** events and swaps the plants;
- a plant can only be moved inside its own year garden;
- an item placed writes `g:i:<year>:<item>`, taking it away writes the same key with `off: 1`, and
  the newest event per key wins when two devices disagree;
- an item that is not unlocked yet cannot be placed, by button or by key;
- the den's `deriveShop` ignores every `g:` key, and the garden ignores every `home:` key;
- visitors: none in an empty garden, bees once enough plants bloom, and never more than the cap.

# Notes

- Writes through `useCreaturesApi().choices.record({ kind: 'place', key, … })`; the route and the
  field are already live (T-0028), so nothing in `deploy/nas/` changes.
- The keyboard pattern is the one the dashboard's block arranging already uses: pick up, move,
  drop, Escape.

# Design

## 1. Moving a plant

**With a finger or a mouse:** press and hold a plant for a moment (or just drag it on a computer)
and it lifts with a small shadow; the spots light up; let go over a spot and it settles there. Let
go anywhere else and it goes back where it was.

**With one tap:** tapping a plant opens its small panel (name, kind, stage, when she finished it,
how often she has read it) with one button, `Move`. Tapping `Move` picks it up; the spots become
buttons and the status line says what to do next without a hint text: the picked-up plant is
labelled `Put the oak of The Name of the Wind here` on every spot.

**With a keyboard:** Tab to a plant, Enter or Space picks it up, the arrow keys step through the
spots (left/right within a row, up/down between rows, past the end of a bed into the next bed),
Enter drops it, Escape puts it back.

**Wording** (status line, `role="status"`):

- picked up: `Picked up the oak of The Name of the Wind. Choose a spot.`
- dropped on an empty spot: `Moved to bed 2, spot 5.`
- dropped on a taken spot: `Swapped with the rose of Beach Read.`
- cancelled: `Left where it was.`

## 2. Garden items

Under the garden, a strip headed `Garden items`, with the six items in unlock order. An unlocked
item she has not placed is a button with its name; one she has placed shows `Placed` and the button
becomes `Take away`. A locked one is shown as `Pond · at 25 books` and is `aria-disabled`, so she
can see what is coming without a hint text.

- `path` at 5 finished books, `bench` at 10, `birdbath` at 15, `pond` at 25, `lanterns` at 35,
  `greenhouse` at 50 — all time, so a new year never takes an item away.
- Placing works like moving a plant: pick the item, then a slot in the item strip at the bottom of
  the garden (six slots). An item can stand in one slot per year garden.
- Wording: `Bench placed.` / `Bench taken away.` / `Next: a pond at 25 books (6 to go)`.

## 3. Visitors

They are not a score and she cannot place them: they come.

- **Bees** from 4 plants in bloom, one more per 4, at most 3.
- **Butterflies** from 8 plants in bloom, one more per 8, at most 3.
- **Birds** from 15 plants, and one extra as soon as a birdbath or a pond stands in the garden, at
  most 2.
- At most 6 visitors in all; on a phone at most 3.
- They drift slowly over the garden, each on its own path; with reduce motion they sit still on a
  plant or on the birdbath. They are `aria-hidden`; the garden's hidden sentence names them
  (`… with two bees and a butterfly.`).

## 4. Review (after the build)

Reviewed on 2026-11-23 against this design:

- Dragging, the keyboard pattern, the swap, the item strip with its locked lines, the next-unlock
  line and the visitors are all as designed, in both views. **Matches.**
- Differences, all accepted:
  1. On a phone a plant lifts after a short press (250 ms) rather than at once, so the garden can
     still be scrolled with a finger.
  2. **One press picks the plant up and shows its details** at the same time, instead of opening a
     panel with a `Move` button in it: the panel is there (kind, title, stage, re-reads) with
     `Put back` to change her mind, and the spots light up straight away. It is one step fewer for
     the thing she will do most, and the keyboard and the pointer then behave the same.
  3. A garden item goes into the **first free slot** of the strip rather than one she points at.
     Placing and taking away are both one press; choosing the slot would be a second
     pick-then-place for a decoration that has six places along one strip. If she asks to arrange
     the items themselves, the slots are already in the saved choice (`slot`), so it is a small
     change — written down for her under *Choices made while Hanna was at work*.
- Verdict: **passes**. Screenshots: `T-0063-screens/picked-390.jpg`, `picked-360.jpg`,
  `items-card-1280.jpg`, `items-1280.jpg`.

# Test

See *Test* in T-0065.

# Log

- 2026-11-23 architect: written with T-0060; size full.
- 2026-11-23 ux-designer: designed moving, items and visitors.
- 2026-11-23 developer: built moving (pointer, tap, keyboard), the item strip and the visitors;
  tests green.
- 2026-11-23 ux-designer: reviewed: passes.
- 2026-11-23 tester: passed; see T-0065.
