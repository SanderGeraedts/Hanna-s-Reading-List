---
id: T-0095
title: "Make lying flat work on the phone, say when it cannot, and let a book be dragged onto a pile"
description: "computeLayout judges a pose against the roomiest shelf of the case and lets a wide item skip a shelf too cramped for it, the Looks tab says when no shelf has room, and dropping a dragged book on a lying book or pile puts it on top and lays it down."
status: Doing
size: full
depends_on: []
decisions: [D-0014, D-0044, D-0046, D-0073]
raised_on: 2026-11-24
done_on: ""
result: []
---

# Goal

#271. Piles of flat books already exist (D-0044 §5), but on Hanna's phone the fitting rule of
D-0044 §7 measures a flat book against the most cramped shelf of the case (about 0.30 wide once
the cat's room is kept) while her books are 0.27–0.35 tall, so the pose was dropped and the book
drawn standing, silently. She reported it as "it didn't work on my phone". She also asked to
build a pile by dragging books onto each other.

# Done when

- `pnpm test` passes, with new cases in `src/lib/shelfLayout.poses.test.ts`: on a narrow case a
  flat book is drawn flat on a shelf without a decoration, a flat pile skips a shelf too cramped
  for it, and a pose no shelf can hold is still drawn standing with the field kept.
- A new test that a drop on a flat book returns an order with the dragged book straight after
  that pile and asks for the flat pose.
- On the preview, on her phone: three books of one series set to Lying flat form a pile; press
  and hold a fourth and drop it on the pile, and it lands on top lying down.

# Notes

- `src/lib/shelfLayout.ts`: `computeLayout`'s `tightest`/`poseFor` and `fit`.
- `src/components/BookshelfScene.tsx`: `insertionOrder`, `onPointerMove`, `onPointerUp`.
- `src/components/BookPanel.tsx`: the pose picker on Looks.
- The rows are counted with everything standing, so the pose decision never depends on the poses
  (D-0073 §1).

# Design

Nothing new to see on the shelf: the same piles, on more shelves. On Looks, when the picked pose
cannot be drawn anywhere in this bookcase, one muted line under the picker: "Lying flat doesn't
fit this bookcase on this screen — it stands here and comes back on a wider screen." While a
book is dragged over a lying book or its pile, the dragged book is previewed lying on top of the
pile.

# Test

`pnpm test`: 197 files, 2456 tests passed (22 skipped). The new cases:

- `src/lib/shelfLayout.poses.test.ts` — "a pose on a narrow case": on a phone-sized case
  (0.55 wide) a flat book lies flat, a series stays one pile on the shelf it lands on, a pile
  gets the end of a cramped shelf and that shelf's decoration moves down instead, no book and
  decoration are ever drawn on top of each other, no shelf is skipped (checked with one, three
  and no decorations), and a case too narrow for the pose still stands the book with her field
  kept.
- `src/lib/shelfDrop.test.ts` — a drop anywhere on a pile goes on top of it and asks for the
  flat pose; the whole width of the pile counts; a drop beside it stands; a pile on another
  shelf straight above the pointer is not mistaken for it; and every drop that is not on a pile
  lands exactly where it always did.
- `src/components/BookPanel.pose.test.tsx` — the Looks tab says which pose does not fit, and
  says nothing when the pose is drawn, when the shelf has not reported, or for a standing book.

Tried to break it, and it did break: the first version let a wide pile walk past a cramped
shelf until it found room, which drew **whole empty shelves** between her books. Seen on a
screenshot of the running app, not by a test. The rule is now that a pose may use the whole
width of the shelf it lands on and the decoration moves instead, which is gap-free; the test
"never skips a shelf" is there so it cannot come back.

Remaining: Hanna confirms on her own phone that a series set to Lying flat makes a pile, and
that dragging a book onto it puts it on top.

# Log

- 2026-11-24 architect: raised from #271, sized full, D-0073 recorded.
- 2026-11-24 ux-designer: nothing new on the shelf; one line on Looks when no shelf has room; the pile previewed under the drag.
- 2026-11-24 developer: poseRoom in computeLayout, dropOrder in src/lib/shelfDrop.ts, onLayFlat and onPoseDrawn on the scene.
- 2026-11-24 developer: first version drew empty shelves; seen on a screenshot of the running app and replaced, D-0073 §1 rewritten.
- 2026-11-24 tester: ran pnpm test and pnpm run build, both pass; piles and a face-out book checked on a phone-sized screenshot.
- 2026-11-24 tester: Remaining: Hanna checks on her own phone that a series piles up and that a book can be dragged onto it.
