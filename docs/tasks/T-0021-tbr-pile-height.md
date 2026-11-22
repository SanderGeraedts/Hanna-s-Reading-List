---
id: T-0021
title: "Show how tall her want-to-read pile would stand, with a fun comparison, in the Want-to-read pile block"
description: "The Want-to-read pile block gets one line like “Stacked up, your pile would be 1.62 m tall: about as tall as an adult (1.75 m).”, from the shelf thickness of every want-to-read book except those she only listens to (D-0029), rounded to cm or m, with the closest of a fixed list of everyday heights."
status: Open
depends_on: []
decisions: [D-0008, D-0010, D-0014, D-0020, D-0022, D-0029]
raised_on: 2026-11-22
done_on: ""
result: []
---

# Goal

From Hanna's GitHub issue #224 ("TBR Pile Hight"; the pull request closes it): take the thickness
of each book into account, estimate how tall all her want-to-read books would be stacked on top of
each other, show that in cm or m on the dashboard, and add a fun fact, like "your pile is as tall as
an average adult".

Today the **Want-to-read pile** block (`PileCard` in `src/components/DashboardExtras.tsx`, block id
`pile` in `src/lib/dashboardLayout.ts`) shows, from top to bottom: "**N** books waiting", a small
line "1,234 pages · 10 h 25 min to listen", the pace line ("At your pace of 1.5 a month, that's …
of reading." or the hint to add "Finished on" dates), and then the motivation part from T-0014 (the
in/out sentence, the 6-month line and the two coin jars). The pile is `wantPile(books)` in
`src/lib/insights.ts`: every book with `status === 'want'`.

## 1. The height (D-0029)

- The height in metres is the sum of `bookDims(book).t` (`src/lib/shelfLayout.ts`, 1 unit ≈ 1
  metre) over the **want-to-read books** (the same set as `wantPile`).
- Books she **only listens to** (`listenOnly` in `src/lib/listening.ts`) are **left out**: no
  paper to stack.
- Every other want-to-read book counts with its shelf thickness: e-books, books she has on paper
  and as an audiobook, and books without a page count (the shelf's 280 pages). No second
  thickness formula.

## 2. How it is written

- **Rounding**, worked out on the rounded value:
  - under 1 m: whole centimetres, `"48 cm"` (at least `"1 cm"`);
  - 1 m up to 10 m: metres with two decimals, `"1.62 m"`;
  - 10 m up to 100 m: one decimal, `"12.4 m"`;
  - 100 m and more: whole metres, `"123 m"`;
  - trailing zeros dropped (`"1.6 m"`, `"2 m"`), a decimal point (the app's `en-GB`), and a value
    that rounds up to 100 cm is written in metres (`0.996` → `"1 m"`).
- **The comparison**, from this fixed list (texts exactly as here, heights in the same writing):

  | Thing | Height |
  |---|---|
  | a mug | 10 cm |
  | a cat | 25 cm |
  | a kitchen counter | 90 cm |
  | a door handle | 1.05 m |
  | an adult | 1.75 m |
  | a door | 2 m |
  | a double-decker bus | 4.4 m |
  | a giraffe | 5 m |
  | a house | 8 m |
  | an oak tree | 20 m |
  | the Leaning Tower of Pisa | 56 m |
  | Big Ben | 96 m |
  | the Eiffel Tower | 330 m |

  - When one or more things are **within 10%** of the pile (pile ÷ thing between 0.9 and 1.1, on
    the unrounded height), take the closest by ratio: **"about as tall as <thing> (<height>)"**.
  - Otherwise, when the pile is taller than at least one thing: **"taller than <thing>
    (<height>)"**, with the tallest thing it beats.
  - Otherwise (shorter than a mug, and not within 10%): **"not as tall as a mug (10 cm) yet"**.
- **The line**: `Stacked up, your pile would be <height>: <comparison>.`, e.g.
  "Stacked up, your pile would be 1.62 m: about as tall as an adult (1.75 m)." The UX designer may
  refine the words, keeping the height, the comparison and plain language.

## 3. When there is nothing to stack

- **No want-to-read books:** no height line (the block already says "0 books waiting").
- **Only books she listens to:** `Your pile is all audiobooks, so it takes up no room at all.`
- **Some books she only listens to, and some others:** only the others count; no extra note (the
  pages · listening line already shows the listening part).

## 4. Where

In the Want-to-read pile block, right under the pages · listening line and before the pace line.
The block keeps everything it shows now, in the same order otherwise; no new block, no change to the
dashboard's sections, Favourites or Arrange. The UX designer places and styles it.

# Done when

- Unit tests next to the new pure functions (in `src/lib/`, e.g. `src/lib/pileHeight.ts` with
  `src/lib/pileHeight.test.ts`; names are the developer's):
  - the height of a mixed shelf equals the sum of `bookDims(b).t` over its want-to-read books that
    aren't listen-only (computed in the test from `bookDims`), so it follows the shelf;
  - read, reading, paused and did-not-finish books don't count; a listen-only want-to-read book
    doesn't count; a paperback + Storytel book counts with its pages; an e-book counts; a book
    without pages counts as `bookDims` gives it (280 pages);
  - no want-to-read books and only listen-only ones are told apart (e.g. `{ metres: 0, counted: 0,
    listenOnly: 2 }`), so the block can pick the right line;
  - the writing: `0.004` → `"1 cm"`, `0.483` → `"48 cm"`, `0.996` → `"1 m"`, `1.624` → `"1.62 m"`,
    `1.6` → `"1.6 m"`, `2` → `"2 m"`, `12.44` → `"12.4 m"`, `123.4` → `"123 m"`;
  - the comparison: `1.62` → about as tall as an adult (1.75 m); `2` → about as tall as a door
    (2 m); `0.97` → about as tall as a kitchen counter (closest by ratio of the two within 10%);
    `3.05` → taller than a door (2 m); `400` → taller than the Eiffel Tower (330 m); `0.05` → not
    as tall as a mug (10 cm) yet; every list height written with the same rounding as the pile.
- A component test for `PileCard` (new, e.g. `src/components/PileCard.test.tsx`, rendering it with
  a shelf like the other card tests): with want-to-read books it shows the line with the height and
  comparison from the functions above; with no want-to-read books there is no height line; with only
  listen-only ones it shows the audiobooks line; "books waiting", the pages · listening line, the
  pace line and the motivation part are still there.
- The existing tests still pass, including `src/lib/insights.test.ts` (`wantPile` unchanged),
  `src/lib/dashboardLayout.test.ts` and `src/components/Dashboard.favourites.test.tsx` (the block id
  and sections don't change).
- Clicked through on a local dev server with no backend (`pnpm run dev`, never a production
  `POCKETBASE_URL`; shelf seeded in localStorage), screenshots at 390×844 and 1280×800 on
  **lavender and midnight** in `docs/tasks/T-0021-screens/`: a pile of about 40–50 books (around
  1.5–1.8 m), a big pile (over 10 m), a pile of only audiobooks, and an empty pile. No console
  errors.
- Design checks (UX designer) added under *Design* and checked on the screenshots.
- `pnpm test`, `pnpm run build` and `pnpm exec harness check` pass.

# Notes

- **Group 1** (app code only), nothing for Sander: no new stored field, no change to `Book`, the
  shelf or its sync (`shelfMerge.ts`, `src/server/shelf.ts`, `library.ts`), `src/server/` or
  `deploy/nas/`. No outside service, no new package.
- **Files:** a new pure module in `src/lib/` (or next to `wantPile` in `insights.ts`) using
  `bookDims` from `shelfLayout.ts` and `listenOnly` from `listening.ts`; `PileCard` in
  `src/components/DashboardExtras.tsx`; `src/styles.css` only if a class is needed (reuse
  `muted small-text` or the existing paragraph style first).
- `bookDims(book, seriesKey)`: the series key only changes the height of the book, not `t`, so call
  it without one.
- The comparison list is one constant, in order of height, so it is easy to extend later.
- **D-0008** says treating audiobooks differently in one feature is Hanna's choice. The request's
  scope leaves listen-only books out, and Hanna asked to take the recommended option without being
  asked; D-0029 records it and choice 2 below shows it to her, so she can reverse it.
- D-0014: no hint text added; the empty and audiobook-only cases are a line of content or nothing.
  D-0020 / D-0022: tokens only, readable on lavender and midnight.

## Choices made by the team

Hanna asked the team not to ask her anything and to take the recommended option for open choices.
These were taken by the architect; the UX designer may refine the wording and placing under
*Design*.

1. **The thickness is the shelf's** (`bookDims`), so the pile matches the books she sees standing
   there; no separate real-world formula (D-0029). It is a bit generous for paperbacks (about
   3.5 cm for 300 pages), so the line says "would be" and "about".
2. **Books she only listens to are left out**, also when the whole pile is audiobooks; that case
   gets its own fun line instead of "0 cm" (D-0029).
3. **E-books count**, with the thickness they have on her shelf; so do books without a page count
   (280 pages, as on the shelf).
4. **Rounding:** whole cm under 1 m, two decimals up to 10 m, one up to 100 m, whole metres beyond;
   trailing zeros dropped.
5. **The comparison** comes from a fixed list of 13 everyday things, from a mug (10 cm) to the
   Eiffel Tower (330 m); "about as tall as" within 10%, otherwise "taller than" the tallest thing it
   beats, and "not as tall as a mug yet" for a tiny pile. The thing's height is shown in brackets.
6. **"An adult" is 1.75 m**, one plain figure rather than men and women apart.
7. **An empty pile shows no height line**; a mixed pile gets no "audiobooks not counted" note.
8. **Placed in the existing block**, under the pages line, not as a new block.
9. **A decision record (D-0029)**, because leaving listen-only books out is an exception to D-0008
   and a later change shouldn't quietly add a second thickness formula.

# Design

To be written by the UX designer.

# Test

To be written by the tester.

# Log

- 2026-11-22 architect: task written from Hanna's issue #224 (the PR closes it); D-0029 records
  that the height is the shelf thickness added up, without books she only listens to; wording,
  rounding, comparison list and the empty and audiobook-only cases under *Choices made by the team*;
  group 1, no new stored fields; handed to the UX designer.
