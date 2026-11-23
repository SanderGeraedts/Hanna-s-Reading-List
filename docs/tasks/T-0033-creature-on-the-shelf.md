---
id: T-0033
title: "Let her favourite creature live on the 3D bookshelf: idle life, sleeping at night and reacting to her reading"
description: "CR4b of the book creatures (D-0033): one creature of her choice in a fixed spot on the 3D shelf that sits, yawns, stretches, sleeps on a pile of books at night, looks at her when tapped, cheers when she finishes a book, sits by the book she's reading and holds a tiny sign on streak days; light on the phone, paused when another page is over the shelf."
status: Doing
size: full
depends_on: [T-0032]
decisions: [D-0002, D-0011, D-0013, D-0020, D-0022, D-0032, D-0033, D-0034]
raised_on: 2026-11-22
done_on: ""
result: []
---

# Note (combined with T-0032)

T-0033 ships together with T-0032 on **one branch and one pull request**
(`creatures-alive-and-shelf`), to save Netlify build minutes (Hanna, 2026-11-23). The combined
Design for both tasks lives in `docs/tasks/T-0032-creatures-come-alive.md`; this file points
to it. Both *Done when* sections still stand.

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
   none after Take off, her first remaining pet when the one on the shelf is released, D-0033 §9), night hours, the cheer only on a finish day and once, the streak sign only
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

See **`docs/tasks/T-0032-creatures-come-alive.md` *Design*** for the combined T-0032 + T-0033
design (Hanna, 2026-11-23: one branch and one PR to save Netlify build minutes). The shelf
spot, the little life (sit/yawn/stretch/sleep), the reading reactions (look-at, cheer, sit by
the reading book, streak sign) and the Put/Take off the shelf button are in §8 there; §10
covers keyboard and screen-reader; §12 lists the 6 T-0033 screenshots; §13 adds the extra
visible promise for the tester.

# Build notes

- **Choice** `src/lib/creatures/shelfPet.ts` + tests: `shelfPetId(log, living, firstPet)` reads
  the newest `shelf` setting event; empty value = take off → null; a released shelf pet falls
  back to her first remaining pet (Done when 1 / D-0033 §9). `finishedToday` and `shouldCheer`
  drive the once-a-day cheer (keyed in localStorage by `hrl:shelf-cheer:<day>`).
- **Layout** `shelf-pet` added to `DecorKind` and FIRST in `DECOR` (width 0.17) so the pet's
  reserved footprint always sits at the right-end of the top row (§8a, §13). `DEFAULT_ROOM`
  excludes it (Make-the-room-yours ignores it). `computeLayout`'s default also excludes it.
  New test verifies: top row, right half, never overlaps a top-row book for empty / mid / full.
- **BookshelfScene** takes a `shelfPet` prop; when set, it prepends `'shelf-pet'` to
  `decorKinds` and wraps `<Decorations>` in `ShelfPetContext.Provider`. SafeBookshelf fallback
  shows nothing (§8a).
- **Component** `src/components/creatures/ShelfPet.tsx`: own breath/blink, cheer hop + arms up,
  night (eyes almost shut + lie-down), book pile under it at night, streak sign at the paw.
  Phone (via StillDecorations ctx): single-box pile, no yawn/stretch, no sparkles twinkle.
- **Threading** `src/components/creatures/useShelfPet.ts` composes the one ShelfPetShows from
  derived creatures + books; wired in `src/routes/index.tsx` and passed to SafeBookshelf.
- **PetsCard** gets "Put on the shelf ✨" / "Take off the shelf" buttons + chip; records
  `{ kind: 'shelf', key: 'shelf', pet }`. `useCreatureChoices.record` accepts `'shelf'`.
- **Words** `shelfOnSay`/`shelfOffSay`, species-verb `petSay` (purrs/chirps/rumbles/hoots/…).

# Test

- `pnpm test --run`: 1582 passed. New tests: `shelfPet.test.ts` (newest wins, take off, release
  fallback, finish-today only once), `shelfLayout.test.ts` ("the shelf-pet's spot" group — top
  row right end, never overlaps a top-row book across empty / mid-full / nearly-full shelves).
- `pnpm exec tsc --noEmit`: clean; `pnpm run build`: ok; `pnpm exec harness check`: green.
- Screenshots: `docs/tasks/T-0033-screens/` 6 shots (1280 lavender grown, cheer, sits-by-reading,
  night sleep; 390 phone lavender and phone midnight streak).

# Log

- 2026-11-22 architect: wrote CR4b (creature on the shelf) from Hanna's brief, split from T-0032.
  Size: full.
- 2026-11-23 ux-designer: combined with T-0032 for one PR (`creatures-alive-and-shelf`); the
  full design (both tasks) lives in T-0032's *Design*. Over to the developer: build both on
  that branch; one commit is fine if the diff stays readable, otherwise T-0032 then T-0033.
- 2026-11-23 developer: built the shelf pet (fixed top-right spot, idle life, cheer, streak
  sign, night book-pile), the Put/Take off buttons, the `shelf` log kind, in one branch
  `creatures-alive-and-shelf` with T-0032. tests 1582 pass, tsc + build + harness check green.
