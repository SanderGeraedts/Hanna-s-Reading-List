---
id: T-0021
title: "Show how tall her want-to-read pile would stand, with a fun comparison, in the Want-to-read pile block"
description: "The Want-to-read pile block gets one line like “Stacked up, your pile would be 1.62 m tall: about as tall as an adult (1.75 m).”, from the shelf thickness of every want-to-read book except those she only listens to (D-0029), rounded to cm or m, with the closest of a fixed list of everyday heights."
status: Doing
depends_on: []
decisions: [D-0008, D-0010, D-0014, D-0020, D-0022, D-0029]
raised_on: 2026-11-22
done_on: ""
result: ["https://github.com/SanderGeraedts/Hanna-s-Reading-List/pull/230"]
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
10. **The words stay the architect's** (UX designer): `Stacked up, your pile would be <height>:
    <comparison>.`, with no "tall" after the height, so "tall" isn't said twice.
11. **Plain body text, not grey small text** (UX designer): the line is a fact, like the pace line
    under it, so it gets the same style. The grey small line above stays the only "details" line.
12. **A small emoji in front, hidden from screen readers** (UX designer): 📚 for a pile, 🎧 for an
    all-audiobook pile.
13. **Units spoken in full** (UX designer): a screen reader hears "1.62 metres" and "48
    centimetres", not "m" and "cm".
14. **A height never breaks away from its unit** (UX designer): a non-breaking space between the
    number and the unit, and between the emoji and the first word.

# Design

One new line of text in the **Want-to-read pile** block. No new class, colour, text size, spacing
or corner (D-0020), no hint text (D-0014), and nothing else in the block changes.

## Where and how it looks

- **Place:** a new `<p>` right after the grey "1,234 pages · 10 h 25 min to listen" line and before
  the pace line ("At your pace of …" or the "Finished on" note). So the block reads: **N** books
  waiting / pages · listening / **height line** / pace line / motivation part.
- **Style:** a plain `<p>` with no class: `--text` (cream), `--fs-body`, regular weight, the body
  font, the same as the pace line. No bold, no gold, no serif. The space above and below it is the
  card's own grid gap (`--space-3`). It gets no margin of its own (`.dash-card p` already sets
  `margin: 0`).
- **Emoji:** the line starts with a small emoji at the same text size, then a non-breaking space:
  - 📚 before the height line;
  - 🎧 before the all-audiobooks line.

  The emoji goes in `<span aria-hidden="true">`, so a screen reader skips it. It is only
  decoration: the line must read fully without it.

## The words, case by case

`<height>` and the thing's height use the rounding from section 2 (`"48 cm"`, `"1.62 m"`,
`"12.4 m"`, `"123 m"`), with a **non-breaking space** (U+00A0) between the number and the unit.

| Case | What she sees |
|---|---|
| Normal (about as tall) | 📚 Stacked up, your pile would be 1.62 m: about as tall as an adult (1.75 m). |
| Big (taller than) | 📚 Stacked up, your pile would be 12.4 m: taller than a house (8 m). |
| Tiny (shorter than a mug) | 📚 Stacked up, your pile would be 4 cm: not as tall as a mug (10 cm) yet. |
| Only audiobooks | 🎧 Your pile is all audiobooks, so it takes up no room at all. |
| Some audiobooks, some others | the normal, big or tiny line for the other books; no extra note |
| Empty pile (no want-to-read books) | no line at all; the block shows "0 books waiting" as it does now |

The text is exactly as above: sentence case, a colon after the height, a full stop at the end, and
the thing's height in round brackets.

## What a screen reader hears

Every height (the pile's and the thing's) is written twice in the markup:

```html
<span aria-hidden="true">1.62&nbsp;m</span><span class="visually-hidden">1.62 metres</span>
```

This uses the existing `.visually-hidden` class. The spoken units are `metres` and `centimetres`,
with the singular for exactly 1 (`1 metre`, `1 centimetre`), in British spelling. The number is
spoken as shown (`1.62`, `12.4`, `48`). So the whole line is heard as:

- "Stacked up, your pile would be 1.62 metres: about as tall as an adult (1.75 metres)."
- "Stacked up, your pile would be 4 centimetres: not as tall as a mug (10 centimetres) yet."
- "Your pile is all audiobooks, so it takes up no room at all." (the emoji isn't read)

The line is an ordinary paragraph in reading order, between the pages line and the pace line. It
has no `role` and no live region (it only changes when the shelf changes), and nothing in it takes
focus.

## Phone (390) and computer (1280)

- **390:** the card fills the content width with 1 rem padding, so the line wraps onto two or
  three lines. It wraps like normal text: no `nowrap` on the line, no ellipsis, no smaller text.
  Because of the non-breaking spaces, "1.62 m" and "(1.75 m)" never split across two lines, and
  the emoji never ends up alone at the end of a line. The longest thing, "the Leaning Tower of
  Pisa", simply wraps.
- **1280:** the block is one dashboard column wide, and the line fits on one or two lines. The same
  rules apply.
- Nothing in the block pushes sideways, and there is no horizontal scroll at either width.

## Both wallpapers

The block is a walnut card (`--surface`, `--border`) on both **lavender and midnight**. The line is
`--text` on `--surface`, a pair `colours.test.ts` already checks, so it looks the same on both
wallpapers and no colour pair needs adding. The emoji are the device's own colour emoji.

## Tokens reused

`--text`, `--fs-body`, the `.dash-card` grid gap (`--space-3`), the 1 rem card padding on narrow
screens, and `.visually-hidden`. Nothing new goes in `src/styles.css`.

## Design checks (on the screenshots and in the dev server)

- The height line sits between the grey pages line and the pace line, in cream body text the same
  size as the pace line, and starts with 📚 (or 🎧 for an all-audiobook pile).
- The wording matches the table exactly for the 40–50 book pile, the big pile and the
  audiobook-only pile. The empty pile shows no line and still says "0 books waiting".
- At 390 the line wraps without being cut off, and no height is split from its unit. At 1280 it
  fits in the block. Lavender and midnight look the same.
- In the accessibility tree (or with a screen reader) the line says "metres" and "centimetres" in
  full, and the emoji isn't read.
- The rest of the block (books waiting, the pages line, the pace line, the motivation part) is
  unchanged.

## Review after building (2026-11-22)

**Verdict: matches the design. No must-fix items.** Handed to the tester.

Looked at: `git diff main...HEAD -- src` (`src/lib/pileHeight.ts`, `PileHeightLine` and `Height`
in `src/components/DashboardExtras.tsx`, the two test files) and all 20 screenshots in
`docs/tasks/T-0021-screens/` (5 cases × 390/1280 × lavender/midnight).

The design checks, one by one:

- [x] **Place and style.** On every screen with books the line sits between the grey pages line and
  the pace line, in cream body text the same size and weight as the pace line, with no class of its
  own (the developer measured `rgb(244, 234, 217)`, 16px, 400 for both). It starts with 📚, or 🎧 for
  the all-audiobooks pile. Nothing was added to `src/styles.css`.
- [x] **Wording.** Matches the table exactly:
  - normal: "📚 Stacked up, your pile would be 1.62 m: about as tall as an adult (1.75 m)."
  - big: "… 12.4 m: taller than a house (8 m)."
  - tiny: "… 4 cm: not as tall as a mug (10 cm) yet."
  - audiobooks: "🎧 Your pile is all audiobooks, so it takes up no room at all."
  - empty: no line, and "0 books waiting" is still there.
  
  The normal pile has 3 Storytel-only books mixed in and shows no extra note, as designed.
- [x] **Wrapping.** At 390 every line wraps over two lines with nothing cut off. At 1280 the big and
  tiny lines move "(8 m)" and "(10 cm)" to the second line as a whole, which shows the non-breaking
  space doing its job. The source has U+00A0 in `Height` and after both emoji. No horizontal
  scroll at either width. Lavender and midnight look the same, because the card is walnut on both.
- [x] **Screen reader.** Each height is an `aria-hidden` "1.62 m" plus a `.visually-hidden` "1.62
  metres". The emoji is `aria-hidden`. The card test checks the heard text ("… 1.62 metres: about as
  tall as an adult (1.75 metres).") and the singular forms ("1 metre", "1 centimetre"). The line
  is a plain `<p>`, with no role, no live region and nothing that takes focus.
- [x] **Rest of the block.** Books waiting, the pages · listening line, the pace line, the divider,
  the in/out sentence, "Last 6 months" and the two jars are unchanged and in the same order on
  every screen.

**Developer choice 15 (closest by log distance): accepted.** "Closest by ratio" should treat
"10% shorter" and "10% taller" as the same distance, and `|ln(pile ÷ thing)|` does that. It
picks the same thing as comparing `max(r, 1/r)`. It also gives the answer the *Done when*
requires (0.97 m → the kitchen counter, not the door handle), and she only ever sees the result,
so nothing about it is visible as a design choice. Keep it.

**Thousands comma: accepted, keep it.** Every number in the app uses `en-GB`, with a decimal point
and a thousands comma, like "14,100 pages" two lines above. A height written as "1234 m" would be
the odd one out. Screen readers say "1,234 metres" correctly. In practice the pile would need
roughly 29,000 books before it shows a comma, so this only keeps the app consistent and doesn't
change anything she will see.

**Differences, none of them to fix:**

- The screenshots are cropped to the card, so the wallpaper itself isn't visible. The card is the
  same walnut surface on both, so this proves the "looks the same" check well enough. The tester may
  take a wider shot if they want to.
- The empty pile also has no pace line or "Finished on" note. That was already so on `main` and
  this task doesn't touch it.

# Build notes

- **Code:** `src/lib/pileHeight.ts` (pure): `pileHeight(books)` → `{ metres, counted, listenOnly }`
  (sum of `bookDims(b).t` over `status === 'want'` books that aren't `listenOnly`);
  `heightParts` / `heightText(metres, space)` for the rounding; `heightSpoken` for "metres" /
  "centimetres" (singular for 1); `HEIGHT_THINGS`, one constant in order of height;
  `compareHeight`, `comparisonWords`, `comparisonText`, `pileHeightLine`; `ALL_AUDIOBOOKS_LINE`.
- **Block:** `PileHeightLine` in `src/components/DashboardExtras.tsx`, a plain `<p>` with no class
  between the pages line and the pace line. Emoji in `<span aria-hidden="true">` with a
  non-breaking space; each height written as `<span aria-hidden>1.62&nbsp;m</span>` plus
  `<span class="visually-hidden">1.62 metres</span>`. Nothing added to `src/styles.css`.
- **Developer choice 15, "closest by ratio":** within 10%, the closest thing is the one with the
  smallest `|ln(pile ÷ thing)|`, so 0.9× and 1/0.9× are equally far. Plain `|ratio − 1|` would pick
  the door handle for `0.97` (0.924 vs 1.078), which the *Done when* says is the kitchen counter;
  the log distance gives the kitchen counter. Recommended option taken without asking Hanna.
- Numbers use `toLocaleString('en-GB')`, so a pile over 1,000 m would read "1,234 m" (decimal point,
  thousands comma, like the pages line).
- **Tests:** `src/lib/pileHeight.test.ts` (23) and `src/components/PileCard.test.tsx` (3): the
  card test checks the seen text (with non-breaking spaces), the heard text (without aria-hidden
  parts), the paragraph order pages → height → pace, the empty and all-audiobooks cases, and that
  "books waiting", the pages line, the pace line / "Finished on" note and "Last 6 months" are still
  there.
- **Screenshots** (`docs/tasks/T-0021-screens/pile-<case>-<width>-<wallpaper>.jpg`, 20 files): no-backend
  dev server on port 3132, shelf seeded in localStorage `hannas-reading-list:v1`, 12 finished books
  for the pace line, plus:
  - normal: 47 paperbacks of 300 pages + 3 Storytel-only → "1.62 m: about as tall as an adult (1.75 m)";
  - big: 250 books of 500 pages → "12.4 m: taller than a house (8 m)";
  - tiny: 1 book of 400 pages → "4 cm: not as tall as a mug (10 cm) yet";
  - audiobooks: 4 Storytel-only → the 🎧 line; empty: no line, "0 books waiting".

  Measured in the page: line colour `rgb(244, 234, 217)` 16px weight 400, the same as the pace line;
  no horizontal scroll at 390 or 1280; heard text "Stacked up, your pile would be 1.62 metres: about
  as tall as an adult (1.75 metres)."; console errors: none.

# Test

To be written by the tester.

# Log

- 2026-11-22 architect: task written from Hanna's issue #224 (the PR closes it); D-0029 records
  that the height is the shelf thickness added up, without books she only listens to; wording,
  rounding, comparison list and the empty and audiobook-only cases under *Choices made by the team*;
  group 1, no new stored fields; handed to the UX designer.
- 2026-11-22 ux-designer: designed: one body-text line under the pages line, with a 📚 or 🎧 that
  screen readers skip, units spoken in full through `.visually-hidden`, non-breaking spaces, no new
  tokens; choices 10–14 added; handed to the developer.
- 2026-11-22 developer: built `src/lib/pileHeight.ts` and the height line in `PileCard`, as
  designed; choice 15 ("closest by ratio" as log distance) under *Build notes*. Checks:
  `pnpm test` → 87 files (86 passed, 1 skipped), 728 tests (719 passed, 9 skipped), 26 of them
  new; `pnpm exec tsc --noEmit` → no errors; `pnpm run build` → built; `pnpm exec harness check`
  → tasks, decisions, engineers, generated files all ✓. 20 screenshots (5 cases × 390/1280 ×
  lavender/midnight), no console errors. Handed to the UX designer for review.
- 2026-11-22 ux-designer: reviewed: matches the design, no must-fix items. All 20 screenshots and
  the `src` diff checked against the design checks. Choice 15 (closest by log distance) and the
  `en-GB` thousands comma accepted. Handed to the tester.
