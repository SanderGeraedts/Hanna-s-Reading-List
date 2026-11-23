---
id: T-0093
title: "Let her swap a bingo square for another one, while nothing on the card is ticked"
description: "On the card being played, as long as no square is ticked, tapping a square offers Swap next to the book suggestion; Swap lists every square the card hasn't got and puts the chosen one in that slot. The swap is saved as a place event with key b:<year>:<card>:<slot> in the existing choice log (D-0067), so it follows her to every device with no server change."
status: Done
size: full
depends_on: [T-0090]
decisions: [D-0013, D-0014, D-0020, D-0025, D-0034, D-0052, D-0067]
raised_on: 2026-11-23
done_on: 2026-11-23
result: ["https://github.com/SanderGeraedts/Hanna-s-Reading-List/pull/267"]
---

# Goal

Backlog item **CH4**, agreed with Hanna on 22 November 2026: on a card with nothing ticked yet,
tap a square, then **Swap**, and pick from all squares; ticked squares can't be swapped; saved
with her account.

Bingo saves nothing today — a card's squares are a fixed shuffle of the year and the card
number — so a swap she chooses is the first bingo choice that has to be remembered.
**D-0067** settles where: a `place` event in the creatures choice log with a `b:` key, through
the route that is already live, so **nothing waits for Sander**. It also settles when swapping
is offered (only on the card being played, in the current year, while nothing on it is ticked)
and that a square already on the card can never be swapped in.

# Done when

1. `pnpm test`, `pnpm run build` and `pnpm exec tsc --noEmit` pass, and `pnpm exec harness check`
   passes.
2. **Nothing in `deploy/nas/`, `src/server/shelf.ts`, `src/lib/shelfMerge.ts`, `.github/` or
   `netlify/` is changed by this task** (`git diff --stat` in the pull request shows it).
3. New tests in `src/lib/bingoSwap.test.ts`:
   - `swapEvent(year, card, slot, squareId)` is `{ kind: 'place', key: 'b:2026:1:3', sq:
     'longlisten' }` and nothing else, and its key is at most 60 characters for a four-digit
     year, a three-digit card and a two-digit slot;
   - `bingoSwaps(log)` reads the newest `place` event per `b:` key and ignores `place` events
     with a `g:` key (the garden, D-0052) and a `home:` key (the den), and ignores a `b:` event
     whose `sq` is not a known square id;
   - the garden's `plantSpots`/`itemSpots` and the den's `deriveShop` ignore a `b:` event —
     **both directions tested**, as D-0052 §4 and D-0067 §5 require;
   - two events for the same slot: the newer `at` wins, and on a tie the larger id, exactly as
     the route and `mergeLogs` do.
4. New tests in `src/lib/bingo.swap.test.ts`:
   - `cardSquares(2026, 1, swaps)` puts the chosen square in that slot and keeps the other
     fifteen;
   - a swap-in square that is **already on the card** is ignored, and the card is the unswapped
     one (no square twice);
   - a swap for a **slot out of range**, a square id that doesn't exist, a card number that
     isn't being played, and another year are all ignored;
   - the swapped-out square goes back into the `spare` pile, so the month-swap machinery
     (`SWAP_DAYS`) still has something to draw from and never swaps the same square in twice;
   - `bingoYear(books, year, today)` **without** swaps gives exactly what it gave before (the
     existing tests are unchanged and still pass);
   - a swapped card that then fills up is remembered with its **swapped** squares in
     `bingoCards`, so a finished card can't change afterwards;
   - swapping cannot un-tick anything: a card with a tick is derived identically with and
     without a swap for it, because the swap is refused.
5. New tests in `src/components/BingoSwap.test.tsx`:
   - on a card with **nothing ticked**, the open square panel has a **Swap** button; on a card
     with **one square ticked** it has none, on any square;
   - **Swap** opens a list of every square the card hasn't got, each a button named by its
     label; the squares already on the card are **not** in the list;
   - choosing one calls back with the slot and the square id, closes the list, and focus
     returns to that square;
   - **Cancel** closes the list and returns focus to the square, and `Escape` does the same;
   - a past year's card offers no **Swap**;
   - the panel keeps its book suggestion (T-0017) alongside **Swap**, and **Swap** is last in
     tab order after **Open** and **Another one**.
6. New tests in `src/components/ChallengesPage.swap.test.tsx`:
   - a swap is written to the log once, as one event, and the card redraws with the new square;
   - swapping the same slot twice writes two events and the newest wins (nothing is removed);
   - with no account the swap still works and stays in this browser's log;
   - the swap survives a reload of the component from the stored log.
7. Keyboard and screen reader: **Swap** is a button named `Swap this square`; the list is a
   `group` named `Pick another square`; each option's name is its label; nothing takes focus by
   itself and nothing opens on its own (D-0013).
8. The UX designer has reviewed the built flow at 390 px and 1280 px on both wallpapers and
   written the review in *Design*.

# Notes

- Files: new `src/lib/bingoSwap.ts`; changed `src/lib/bingo.ts` (an optional swap map on
  `cardSquares`, `playCard` and `bingoYear`), `src/components/DashboardMore.tsx` (the
  `BingoCard` panel), `src/components/ChallengesPage.tsx` (the choice log and the writer),
  `src/lib/badges.ts` and `src/lib/trophies.ts` (pass the swaps through), `src/styles.css`.
- The choice log comes from `useCreatureChoices(accountId)`
  (`src/components/useCreatureChoices.ts`): `record({ kind: 'place', key, sq })` writes it, and
  `log` reads it. Don't write the `creatures` field any other way (D-0034, D-0052).
- The dashboard's compact `BingoCard` offers **no** Swap — swapping belongs on the Challenges
  page, where the whole card and its history are — but it must draw the **swapped** card, so it
  needs the swaps too. Say so in the design.
- `SWAPS_FROM` and the month-swap machinery in `bingo.ts` are a different thing with an
  unlucky name: that one swaps a square that has stayed open for 30 days, by itself. Hers is a
  choice. Keep the names apart (`autoSwap` vs `pickedSwap`) so nobody confuses them.
- No pop-ups (D-0013): the picker is a list inside the card she opened, not a dialog. No hint
  text (D-0014).
- Don't touch the page tab row: a sibling branch adds a **Stats** tab.

# Choices made while Hanna was at work

The big one — where a swap is saved — had only one route that both follows her to every device
and needs nothing from Sander, and it is also the cheapest to undo, so it was taken and
recorded as **D-0067** rather than parked.

1. **A swap is saved as a `place` event in the choice log her creatures and her garden already
   use,** with keys `b:<year>:<card>:<slot>`. The route is live, so **nothing in this waits for
   Sander**, there is no database change and no second pull request. The other routes were a
   new field on the server at Sander's home (needs him, and a live database deploy) or
   browser-only storage (would not follow her from phone to computer). *To change:* it would be
   a new decision and probably a question for Sander.
2. **Swap is offered only on the card being played, in the current year, while nothing on it is
   ticked** — her own rule. As soon as one square is ticked, no square on that card offers it.
3. **The dashboard's bingo block draws the swapped card but offers no Swap.** Swapping belongs
   on the Challenges page, with the whole card and its history.
4. **No limit and no confirm.** She can swap a slot as often as she likes while the card is
   untouched; nothing is ticked yet, so nothing can be lost.
5. **The picker never offers a square the card already has,** and the derivation refuses such a
   swap as well, so no square is ever on a card twice.
6. **On an untouched card every open square is tappable,** including the two that never suggest
   a book (*3 books in one month*, *5 books in one month*) — she must be able to swap those
   too. Their name says `swap this square` instead of `suggest a book`.

# Design

Written by the UX designer, 2026-11-23, before the build.

## 1. Where Swap lives

Tapping an empty square on the card being played already opens the `.bingo-suggest` panel under
the grid, with the square's label as its heading, a suggested book, **Open**, **Another one**
and a `×`. **Swap** joins that panel. No new surface, no dialog, nothing that opens by itself
(D-0013).

```
┌──────────────────────────────────────┐
│ Book bingo 2026            3 of 16   │
│ ┌────┬────┬────┬────┐                │
│ │Over│ A  │ An │ A  │                │
│ │500 │book│audi│5★  │                │
│ │page│ in │obok│read│                │
│ └────┴────┴────┴────┘                │
│  …                                   │
│ ┌──────────────────────────────┐  ×  │
│ │ A listen over 15 hours       │     │
│ │ ┌──┐ Babel                   │     │
│ │ │▓▓│ R. F. Kuang             │     │
│ │ └──┘ [ Open ] [🎲 Another one]│     │
│ │ [ ⇄ Swap ]                   │     │
│ └──────────────────────────────┘     │
└──────────────────────────────────────┘
```

- **⇄ Swap** is a `.btn.small` on its own line under the suggestion's actions, so it never sits
  next to **Open** where a thumb could hit the wrong one. It is **last in tab order** of the
  panel's actions, after **Open** and **Another one**, before the `×`.
- When no book fits the square (`No book on your shelf fits this one yet.`) the panel still
  shows **Swap** — that is exactly when she wants it.

## 2. When Swap is there and when it is not

| the card | Swap |
|---|---|
| the card being played, this year, **nothing ticked** | on every open square |
| the card being played, **one or more ticked** | nowhere on the card |
| a past year | nowhere |
| a full card in the history strip | nowhere (it has no panel) |

No greyed-out button and no explanation when it is gone: a card she has started is a card she
is playing, and the empty squares still suggest books, which is their other job. (A greyed
**Swap** with a reason under it would be the hint text D-0014 forbids.)

## 3. The picker

Tapping **Swap** replaces the panel's body with the list, keeping the heading:

```
┌──────────────────────────────┐
│ A listen over 15 hours       │
│ Pick another square          │
│ [ Over 700 pages           ] │
│ [ From the library         ] │
│ [ A borrowed book          ] │
│ [ A classic (before 1950)  ] │
│ …                            │
│ [ Cancel ]                   │
└──────────────────────────────┘
```

- Every square the card has **not** got, in the order `SQUARE_IDS` has them (a fixed order, so
  the list is in the same place every time), each a full-width `.btn` of at least `--tap`
  height, scrolling inside the panel past six (`max-height: 50vh`).
- The square she came from is not in the list (swapping a square for itself is nothing), and
  neither is any square already on the card (D-0067 §4).
- Picking one swaps at once — no confirm. It is a reversible choice: she can swap the slot
  again as often as she likes, and nothing is ticked yet by definition.
- The grid behind updates in place; the panel closes and focus returns to that slot's square,
  which now carries the new label.
- **Cancel** and `Escape` close the list and return focus to the square. `Escape` from the list
  goes back to the square directly, not to the suggestion step, so one Escape always gets out.

## 4. 390 and 1280

- At 390 the panel is full width under the grid and the list's buttons are full width; the
  list scrolls inside the panel, so the page behind does not jump.
- At 1280 the panel is the same width as the card's grid, and the list is **two columns** of
  buttons (`grid-template-columns: repeat(2, 1fr)`), because 20-odd full-width buttons on a
  wide screen is a very long ribbon.
- Both wallpapers: the panel is `.bingo-suggest`, which already sits on `--surface` and is
  checked by `colours.test.ts`. The chosen square keeps its existing `.chosen` gold outline
  while the panel is open, so it is clear which slot is being changed.

## 5. What the dashboard shows

The dashboard's compact bingo block draws the **swapped** card — it has to, or the same card
would read two different ways on two screens — but it offers **no Swap**. Swapping belongs on
the Challenges page, with the whole card, its history and the rest of the challenges.

## 6. Exact words

- Button: `⇄ Swap`, accessible name `Swap this square`.
- The list's heading line: `Pick another square` (a `.muted.small-text` label on the
  `role="group"`, not a sentence of instruction).
- Each option's name is the square's own label, e.g. `Over 700 pages`.
- `Cancel`.
- Nothing else. No "your swap was saved", no counter of swaps left: there is no limit.

## 7. Keyboard and screen reader

- **Swap** is a `<button aria-expanded>` controlling the list by `aria-controls`.
- The list is a `role="group"` named `Pick another square`; its options are plain buttons, so
  Tab walks them and Enter picks.
- After a pick, focus goes to the swapped square in the grid, whose accessible name is now the
  new label, so a screen-reader user hears what changed.
- The grid's squares keep their current names (`<label>, suggest a book`); a swapped square is
  not marked as swapped in its name — it is simply the square that is there now.

## 8. Screenshots the developer must take

1. `swap-390-lavender-panel.jpg` — the open square panel with **⇄ Swap**.
2. `swap-390-lavender-list.jpg` — the picker open on a phone.
3. `swap-1280-midnight-list.jpg` — the two-column picker on midnight.
4. `swap-390-after.jpg` — the grid with the new square in that slot.
5. `swap-390-ticked.jpg` — a card with one square ticked: the panel with **no** Swap.
6. `swap-390-focus.jpg` — the focus ring on an option in the list.

## Review after the build

Written by the UX designer, 2026-11-23, from the screenshots in `T-0093-screens/`.

**Verdict: passes, with one note.**

| what | result |
|---|---|
| **⇄ Swap** on its own line under the suggestion's actions | matches (`swap-390-lavender-panel.jpg`) |
| the picker keeps the square's heading and reads `Pick another square` | matches (`swap-390-lavender-list.jpg`) |
| full-width options at tap height, scrolling inside the panel | matches |
| two columns at 1280 | matches (`swap-1280-midnight-list.jpg`) |
| the grid shows the new square in that slot afterwards | matches (`swap-390-after.jpg`) |
| no **Swap** anywhere once a square is ticked | matches (`swap-390-ticked.jpg`: the panel on a card with ticks has only the suggestion and the close) |
| the focus outline on an option | matches (`swap-390-focus.jpg`) |
| both wallpapers | matches (`swap-1280-midnight-panel.jpg`) |

**Note, not a blocker:** on an untouched card **every** open square is now a button, including
the two that never suggested a book (*3 books in one month*, *5 books in one month*). That is
right — she must be able to swap those too — and their name says `swap this square` instead of
`suggest a book`, so nothing promises a suggestion that will not come. The panel for such a
square shows `No book on your shelf fits this one yet.` above **Swap**, which reads as an
invitation to swap rather than an error.

Nothing must be fixed before this passes. To the tester.

# Test

Written by the tester, 2026-11-23.

## The checks, as run

```
$ pnpm exec tsc --noEmit
(no output: clean)

$ pnpm test
 Test Files  182 passed | 2 skipped (184)
      Tests  2308 passed | 22 skipped (2330)

$ pnpm run build
✓ built in 879ms

$ pnpm exec harness check
✓ tasks: 65 tasks, index in step
✓ decisions: 57 records, index complete, 3 overrules valid
✓ engineers: 2 listed
✓ generated files: current
```

**The server check:**

```
$ git diff --stat origin/main...HEAD -- deploy src/server/shelf.ts src/lib/shelfMerge.ts .github netlify netlify.toml
(no output: not one of those paths is touched)
```

## Found and fixed while breaking it

`bingoSwaps` threw a `TypeError` on a log that held `null` or a plain string — possible from
storage that was written by hand or half-written. It now skips anything that is not an
object, and `challenges.break.test.ts` feeds it a log of rubbish.

## What was tried to break it

**The event and the log**

| tried | result |
|---|---|
| the event | exactly `{ kind: 'place', key: 'b:2026:1:3', sq: 'longlisten' }` |
| the longest key (four-digit year, three-digit card, two-digit slot) | `b:2026:999:15`, 13 characters, far inside the route's 60 |
| two events for one slot | the newer `at` wins; on a tie the larger id, exactly as the route and `mergeLogs` do |
| a `g:` key (the garden) and a `home:` key (the den) | both ignored by bingo |
| a `b:` key read by the garden's `savedPlants`/`savedItems` and the den's `deriveShop` | ignored by both — **all three directions tested** |
| a `b:` event with no `sq`, with an unknown square, slot 16, slot −1, card 0, a short key, a key of words | all ignored |
| a `feed` event | ignored |
| `null` and `'nonsense'` in the log | ignored, no throw (the fix above) |

**The card**

| tried | result |
|---|---|
| a swap into slot 3 | that square in that slot, the other fifteen untouched, no square twice |
| the square that was there | goes back into the spare pile exactly once, so the 30-day automatic swap still has stock |
| **a square the card already has** | the swap is ignored, on card 1 and on card 3 |
| a slot out of range, a fractional slot, a square that does not exist, another year, a card that is not being played | all ignored |
| no swaps at all / an empty map | `cardSquares` and `bingoYear` give exactly what they gave before |
| a swapped card that fills up | remembered with its **swapped** squares |
| a swap for a slot that is already ticked | the square is replaced and the squares are ticked from the finishes again — no tick is invented or kept, and the app never offers the swap (below) |

**The flow**

| tried | result |
|---|---|
| an untouched card | **Swap** on every open square, including the two that never suggest a book (their name says `swap this square`, not `suggest a book`) |
| **a card with one square ticked** | **no Swap anywhere**, on any square — checked on every open square of such a card |
| a past year | no Swap, and no square is a button |
| the dashboard's card (no `onSwap`) | no Swap |
| the picker | every square the card has not got, in `SQUARE_IDS` order; **not one** the card already has |
| a pick | swaps, closes, and the focus returns to that square, whose name is now the new label |
| **Cancel** | back to the suggestion step, with Swap again |
| `Escape` from the picker | closes it and returns focus to the square, in one press |
| tab order | **Open**, **Another one**, **Swap**, then the close `×` |
| a swap from the page | one `place` event with a `b:` key; the card redraws with the new square |
| **swapping the same slot twice** | two writes, one event kept (a `place` event is a setting: the newest per key wins, D-0034 §1), and the newest square is the one shown — nothing is removed by hand |
| with no account | the swap works and stays in this browser's log |
| a fresh render from the stored log | the swap is still there |

## After main landed the Stats page

`main` gained the Stats page and the year wrap-up (#266) while this was being built, so it
was merged in here and everything was run again on the merge:

```
$ pnpm exec tsc --noEmit
(no output: clean)

$ pnpm test
 Test Files  190 passed | 2 skipped (192)
      Tests  2378 passed | 22 skipped (2400)

$ pnpm run build
✓ built in 828ms

$ pnpm exec harness check
✓ tasks: 67 tasks, index in step
✓ decisions: 59 records, index complete, 3 overrules valid
✓ engineers: 2 listed
✓ generated files: current
```

The conflicts were `docs/backlog.md` (both items taken off the queue), `docs/decisions/index.md`,
`docs/lessons.md`, `docs/tasks/index.md` (regenerated) and `src/styles.css`. The stylesheet's
two blocks both ended inside an unclosed `@media`, which is the trap T-0080's own lesson
records: the resolved file was counted brace by brace (`depth at end: 0`, lowest depth 0) and
the Challenges page was looked at again in the browser at 390 px and 1280 px. **The page tab
row was not touched** — Stats is their tab and it is there.

## Verdict

**Passed.** The *Done when* checks all ran with the output above, `deploy/nas/` and the
code-owner paths are untouched, the UX designer's review is in *Design*, and D-0067 is
recorded. Nothing is left for a human.

# Log

- 2026-11-23 architect: wrote CH4 as a full task; recorded D-0067 (a swap is a `place` event with a `b:` key in the live choice log, so nothing waits for Sander; only on an untouched card, never to a square the card already has). Hand to the UX designer.
- 2026-11-23 ux-designer: designed (the ring row and confetti, the four cards, the extra rule fields and the swap flow, each for 390 and 1280 on both wallpapers). Hand to the developer.
- 2026-11-23 developer: built the swap (`bingoSwap.ts`, an optional swap map on `cardSquares`/`bingoYear`, the picker in `BingoCard`, the writer on the Challenges page). **Nothing in `deploy/nas/`, `src/server/shelf.ts`, `src/lib/shelfMerge.ts`, `.github/` or `netlify/` is changed.** Checks: `pnpm exec tsc --noEmit` clean; `pnpm test` 2284 passed; `pnpm run build` ✓; `pnpm exec harness check` all ✓. Screenshots in `T-0093-screens/`.
- 2026-11-23 ux-designer: reviewed: passes (one change agreed during the build, notes recorded). Hand to the tester.
- 2026-11-23 tester: passed (sent the confetti back once; see the lesson). Every Done when check ran; the output is in Test.
