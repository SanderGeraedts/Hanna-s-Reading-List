---
id: T-0033
title: "Let her favourite creature live on the 3D bookshelf: idle life, sleeping at night and reacting to her reading"
description: "CR4b of the book creatures (D-0033): one creature of her choice in a fixed spot on the 3D shelf that sits, yawns, stretches, sleeps on a pile of books at night, looks at her when tapped, cheers when she finishes a book, sits by the book she's reading and holds a tiny sign on streak days; light on the phone, paused when another page is over the shelf."
status: Open
size: full
depends_on: [T-0032]
decisions: [D-0002, D-0011, D-0013, D-0020, D-0022, D-0032, D-0033, D-0034]
raised_on: 2026-11-22
done_on: ""
result: []
---

# Goal

1. **Choose** "Put on the shelf" on a pet in the Creatures tab (one at a time; choosing another moves
   it; "Take off the shelf" leaves the shelf empty). Saved as the `shelf` choice (D-0034).
2. **A fixed spot** on the 3D shelf (the UX designer picks it: e.g. the top shelf's right end, so it
   never covers a book or a nook sign, D-0011), wearing its outfit.
3. **Little life**: sits, yawns, stretches now and then; at night (from 22:30 to 07:00) sleeps on a
   small pile of books; tapped, it looks at her (and a book tap still opens the book).
4. **Reacting to her reading**: cheers (a short jump) the first time the shelf shows after she
   finished a book that day; while a book is `reading`, it sits next to it (or points at it when it
   is on another shelf); on streak days it holds a tiny sign with the streak's number of days.
5. **Not doing**: walking along the shelf, several creatures at once.
6. **Light on the phone**: simple animations, no extra lights or shadows; stops when another page
   or the book panel is over the shelf; the shelf's fallback (`SafeBookshelf`) shows no creature
   rather than failing.

# Done when

1. `pnpm test` passes and includes: which creature is on the shelf from the choices (newest wins,
   none after Take off), night hours, the cheer only on a finish day and once, the streak sign only
   on streak days, the spot never overlapping a book or sign in `shelfLayout` for a full and a nearly
   empty shelf.
2. On `pnpm run dev` with demo data: the creature in its spot zoomed out and zoomed in (D-0032), at
   night asleep, the cheer after finishing a book, sitting by the book being read, the streak sign;
   390 × 844 and 1280 × 800, both wallpapers, two woods; screenshots in
   `docs/tasks/T-0033-screens/`.
3. Draw calls and frame time on 390 × 844 with 150+ books, with and without the creature, noted in
   *Test*; the creature adds at most the T-0027 budget (12 draw calls) and stops animating under
   another page.
4. `pnpm run build` and `pnpm exec harness check` pass. **Hanna** confirms on the live site.

# Notes

- The shelf: `src/components/BookshelfScene.tsx`, `src/lib/shelfLayout.ts`, `Decorations.tsx`;
  pan/zoom D-0032 (T-0025) and the open-book work of T-0026 must keep working.
- **Modelling:** idle, sleep, cheer, look-at and sign poses by normal agents from Fable's base
  models; **no Fable agent** (D-0033 §14).
- If S1 (hardcovers on phones, instancing) has landed by then, keep to its draw-call approach.

# Design

For the UX designer, before the build: the spot on the shelf, the poses and the sign, phone and
computer, both wallpapers.

# Test

# Log

- 2026-11-22 architect: wrote CR4b (creature on the shelf) from Hanna's brief, split from T-0032.
  Size: full.
