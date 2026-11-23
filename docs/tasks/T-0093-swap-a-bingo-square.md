---
id: T-0093
title: "Let her swap a bingo square for another one, while nothing on the card is ticked"
description: "On the card being played, as long as no square is ticked, tapping a square offers Swap next to the book suggestion; Swap lists every square the card hasn't got and puts the chosen one in that slot. The swap is saved as a place event with key b:<year>:<card>:<slot> in the existing choice log (D-0063), so it follows her to every device with no server change."
status: Open
size: full
depends_on: [T-0090]
decisions: [D-0013, D-0014, D-0020, D-0025, D-0034, D-0052, D-0063]
raised_on: 2026-11-23
done_on: ""
result: []
---

# Goal

Backlog item **CH4**, agreed with Hanna on 22 November 2026: on a card with nothing ticked yet,
tap a square, then **Swap**, and pick from all squares; ticked squares can't be swapped; saved
with her account.

Bingo saves nothing today — a card's squares are a fixed shuffle of the year and the card
number — so a swap she chooses is the first bingo choice that has to be remembered.
**D-0063** settles where: a `place` event in the creatures choice log with a `b:` key, through
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
     **both directions tested**, as D-0052 §4 and D-0063 §5 require;
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
  neither is any square already on the card (D-0063 §4).
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

# Test

To be written by the tester.

# Log

- 2026-11-23 architect: wrote CH4 as a full task; recorded D-0063 (a swap is a `place` event with a `b:` key in the live choice log, so nothing waits for Sander; only on an untouched card, never to a square the card already has). Hand to the UX designer.
- 2026-11-23 ux-designer: designed (the ring row and confetti, the four cards, the extra rule fields and the swap flow, each for 390 and 1280 on both wallpapers). Hand to the developer.
