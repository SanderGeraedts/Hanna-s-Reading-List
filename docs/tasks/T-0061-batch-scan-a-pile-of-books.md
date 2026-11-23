---
id: T-0061
title: "Scan a pile of books in one go and add them together"
description: "The barcode scanner stays open and drops each book it reads into a list with its cover; at the end one How I have it covers the whole pile (changeable per book), each book has its own price field under D-0024's rules, and Add all puts them on the shelf, with the same ISBN counted once and a book already on the shelf or the wishlist marked."
status: Open
size: full
depends_on: [T-0060]
decisions: [D-0002, D-0013, D-0014, D-0017, D-0018, D-0020, D-0024, D-0044]
raised_on: 2026-11-23
done_on: ""
result: []
---

# Goal

Today the **Scan** tab reads one barcode, stops, shows one card, and waits for *Add as
paperback* before it will look at the next book. Adding a shopping bag of six books means six
stop-start rounds, and each one opens the after-adding follow-up, so she answers "How I have
it" six times for six identical paperbacks.

Backlog item AD2, agreed 22 November 2026:

- **The scanner stays open.** Each book it reads goes straight into a list under the camera,
  with its cover, title and author. No stopping, no card to dismiss.
- **At the end, one summary.** One **How I have it** for the whole pile, changeable per book;
  a **price** field per book (empty = no price); **Add all**.
- **The same book scanned twice counts once**, and a book **already on her shelf** (or on her
  wishlist) is marked in the list and not added again.

# Done when

1. `pnpm test` and `pnpm run build` pass, and `pnpm exec tsc --noEmit` is clean.
2. `pnpm exec harness check` passes.
3. New tests in `src/lib/batchScan.test.ts` show the list's rules, with no camera and no
   network (the lookup is injected):
   - a scanned ISBN that Open Library knows becomes a row with the title, author and cover;
   - **the same ISBN scanned twice makes one row**, also when the two scans use different
     ISBN spellings of the same book (ISBN-10 and ISBN-13, via `sameIsbn`);
   - an ISBN already on her shelf becomes a row marked `on-shelf`, with the shelf book's
     title, which **Add all** skips;
   - an ISBN on her **wishlist** becomes a row marked `on-wishlist`, which **Add all** skips;
   - an ISBN Open Library does not know becomes a row marked `unknown` that carries only the
     number, which **Add all** skips, and which has its own **Add it by hand** action;
   - a lookup that throws becomes a row marked `failed` with a **Try again** action, and the
     rest of the list is untouched;
   - removing a row removes it, and scanning the same book again after removing it adds it
     back;
   - **20 rows** are held in order, newest first, and the list is capped at 40: at the cap a
     further scan is **not** added and says so, rather than silently pushing the oldest book
     off the list (a test asserts that nothing is ever dropped).
4. New tests in `src/components/BatchScan.test.tsx`, with `BarcodeDetector` and
   `getUserMedia` **faked** (never real hardware), show:
   - scanning three books leaves the camera running and shows three rows;
   - **How I have it** at the top sets the format of every row that she has not changed
     herself, and a row she changed keeps its own formats when she changes the top one again;
   - a **price** field shows only on a row whose formats include paperback, hardcover or
     e-book, and disappears (clearing what was in it) when she takes the last of those off —
     exactly D-0024's rule, asserted per row;
   - a price that is not a price blocks **Add all**, with the error under that row's field and
     focus moved to it;
   - **Add all** adds one book per addable row, each with its cover, its formats and its
     price, and reports `Added 4 books.`;
   - **Add all** with every row already on the shelf adds nothing and says so;
   - **Add all** is disabled while the list has no addable row;
   - closing the dialog mid-pile adds nothing, and nothing is left behind on the shelf.
5. Running what the change touches: the existing `src/components/AddFollowUp.test.tsx` and
   `src/lib/price.test.ts` still pass unchanged, and the Scan tab's old one-at-a-time path is
   gone without taking the ISBN tab's or the Manual tab's behaviour with it.
6. Keyboard and screen reader: each new row is announced once through one `aria-live="polite"`
   region (`Added to the list: <title>`), never one live region per row; the list is a
   `<ul>`; every row's **Remove** button is named by its book. A test asserts there is exactly
   one live region and that it carries the newest row's text.
7. The UX designer has reviewed the built flow at 390 px and 1280 px on both wallpapers and
   written the review in *Design*.

# Notes

- Files: `src/components/BarcodeScanner.tsx` (unchanged except that it is no longer paused
  per book), `src/components/AddBookDialog.tsx` (the Scan tab becomes the batch list), a new
  `src/components/BatchScan.tsx`, a new `src/lib/batchScan.ts`.
- **Never ask for real hardware.** `canScanBarcodes()` reads `navigator.mediaDevices` and
  `globalThis.BarcodeDetector`; tests and screenshots set both to fakes and drive the scan by
  calling the detector's `detect` with a queued barcode. Write the fake once, in the test
  file, and reuse it for the screenshot script.
- The duplicate rules all exist: `sameIsbn` in `src/lib/isbn.ts` and
  `isbnFromBarcode` in the same file. Use them; don't compare strings.
- "Already on her shelf" is checked against the **whole** library (shelf books *and* wishes,
  D-0044), so she is never told a book is new when it is sitting on her wishlist. The add
  dialog already receives the whole library as `existing`.
- The price rules are D-0024's and are already in `src/lib/price.ts` (`ownsCopy`,
  `asksPrice`, `parsePrice`, `priceField`, `PRICE_ERRORS`). Reuse `PriceInput` from
  `PriceField.tsx` for every row; do not write a second price field.
- **No after-adding follow-up for a batch.** The summary *is* the follow-up: it has asked how
  she has them and what they cost. A batch therefore does not open `AddFollowUp`, and the
  free-e-book link step (D-0024) does not apply — a scanned barcode is a paper book. Noted as
  a choice in the Log.
- The series step of T-0060 does not run per scanned book either; a batch of twenty would be
  twenty questions. Those books keep `seriesAsked` unset, so the dashboard's *Waiting for
  you* asks about them one at a time, which is exactly what D-0013 is for.
- Hanna's phone is the only device that can scan (Chrome on Android); keep the list cheap —
  covers at size `M` through the existing `/api/cover/…` proxy, no cover analysis per row
  until **Add all** runs.
- No hint text (D-0014); the scanner's own "Point the camera at the barcode…" line stays,
  because D-0014 keeps the barcode texts.

# Design

Written by the UX designer, 2026-11-23, before the build.

## 1. The Scan tab, top to bottom

```
┌──────────────────────────────────────┐
│ Add a book                        ×  │
│ [Search] [Scan] [ISBN] [Manual] [St…]│
├──────────────────────────────────────┤
│ ┌──────────────────────────────────┐ │
│ │        camera, 4:3               │ │  ← stays running, never pauses
│ │        ⌐        ¬                │ │
│ │        L        ⅃                │ │
│ └──────────────────────────────────┘ │
│ Point the camera at the barcode on   │  ← kept (D-0014 keeps barcode texts)
│ the back of a book.                  │
│                                      │
│ How I have it                        │  ← one row of format chips, for the pile
│ [Paperback✓][Hardcover][E-book][…]   │
│                                      │
│ 4 books                              │  ← the list's heading, counts addable rows
│ ┌──┐ The Night Circus            ✕  │
│ │▓▓│ Erin Morgenstern                │
│ └──┘ [Paperback✓][…]   € [12.50  ]  │
│ ┌──┐ Circe                      ✕  │
│ │▓▓│ Madeline Miller                 │
│ └──┘ [Paperback✓][…]   € [      ]   │
│ ┌──┐ Piranesi            On shelf ✕ │  ← marked, greyed, no chips, no price
│ │▓▓│ Susanna Clarke                  │
│ └──┘                                 │
│ ┌──┐ 9781234567897                ✕ │  ← unknown ISBN
│ │? │ Not found    [ Add it by hand ] │
│ └──┘                                 │
│                                      │
│          [ Add all 4 books ]         │
└──────────────────────────────────────┘
```

- **Newest first.** A book she just scanned appears at the top of the list, where her eye
  already is, with a one-off 300 ms highlight so she sees that it landed. `prefers-reduced-
  motion` turns the highlight into no animation; the row simply appears.
- **The camera never moves.** The list grows under it and the dialog body scrolls. On a phone
  the camera is sticky at the top of the dialog body, so she can keep scanning while looking
  at the list.
- **The pile's formats** sit between the camera and the list, not above the camera: she sets
  them once, at the end, and until then they are out of the way but visible. They start at
  **Paperback**, which is what a barcode almost always is.

## 2. The five kinds of row

| Kind | Cover | Right side | Chips + price | In **Add all** |
| --- | --- | --- | --- | --- |
| normal | the edition's cover, or a book-shaped placeholder | **✕** Remove | yes | yes |
| already on the shelf | the **shelf** book's cover | `On shelf` chip, **✕** | no | no |
| already on the wishlist | the wish's cover | `On your wishlist` chip, **✕** | no | no |
| ISBN not found | `?` placeholder | `Not found`, **Add it by hand**, **✕** | no | no |
| lookup failed | `?` placeholder | `Try again`, **✕** | no | no |
| looking up | shimmer | — | no | no (and **Add all** waits) |

A row that is not added is greyed (`.muted`) but still readable, and keeps its **✕**, so she
can tidy the list. `On shelf` and `On your wishlist` are chips in the design system's
existing `.chip` style, not colour alone: they carry their words.

**Add it by hand** closes the batch and opens the **Manual** tab with the ISBN filled in,
exactly as the old Scan tab did. The rest of the list is kept and she comes back to it by
tapping **Scan** again.

## 3. The summary's numbers

- The list heading counts only addable rows: `4 books`, `1 book`, and when nothing is
  addable, `Nothing to add yet`.
- The button reads **Add all 4 books** / **Add all 1 book**, and is disabled with the plain
  word **Add all** when the count is nought.
- After it runs: the whole tab is replaced by `Added 4 books.` in `.success` with a **Scan
  more** button and a **Done** button. **Scan more** returns to an empty list with the camera
  running; **Done** closes the dialog.

## 4. The price per row

The row's price field is the project's `PriceInput`: the fixed **€** inside its left edge,
about 7 rem wide on a row (9 rem in the follow-up), the number pad on a phone, no placeholder
and no hint (D-0014). It shows **only** while that row's formats include paperback, hardcover
or e-book (D-0024). Taking the last of those off clears what was typed, as the follow-up
already does.

A price that is not a price shows `Try 12.50 or 12,50.` under *that row's* field. **Add all**
then adds nothing, scrolls that row into view and puts focus in its field. Nothing is added
half-way: either every addable row goes on the shelf or none does.

## 5. 390 px and 1280 px

- **390 px:** the camera is 390 × 293 (4:3) and sticky; each row is two lines of text with the
  cover at 48 × 72; the chips wrap to a second line under the title; the price field sits at
  the end of the chip line, right-aligned.
- **1280 px:** the dialog stays 560 px wide. The camera is 560 × 420. Rows are one line
  taller: cover 56 × 84, chips and price on one line beside the title.
- Both wallpapers: the dialog uses `.dialog` / `.dash-card` tokens, which
  `colours.test.ts` already checks on lavender and midnight. No new colour token.

## 6. Keyboard and screen reader

- **One** `aria-live="polite"` region, under the camera, carrying only the newest event:
  `Added to the list: The Night Circus`, `Already on your shelf: Piranesi`,
  `Not found: 9781234567897`. Twenty scans therefore make twenty short announcements, not
  twenty regions.
- The list is a `<ul>`; each row is an `<li>` whose first element is a heading-weight
  `<strong>` with the title. Each **✕** is named `Remove The Night Circus from the list`.
- Tab order: camera (not focusable) → the pile's format chips → row 1's chips → row 1's price
  → row 1's ✕ → row 2 … → **Add all**. Newest-first means a new row joins *above* the focused
  one, which does not move focus.
- Focus after **Add all** goes to the `Added 4 books.` status line, then Tab reaches **Scan
  more** and **Done**.

## 7. Screenshots the designer will review

| Name | Width | Wallpaper |
| --- | --- | --- |
| `batch-empty-390.jpg` | 390 | lavender |
| `batch-four-390.jpg` | 390 | lavender |
| `batch-mixed-390.jpg` (on shelf, wishlist, not found) | 390 | midnight |
| `batch-price-error-390.jpg` | 390 | lavender |
| `batch-twenty-1280.jpg` | 1280 | lavender |
| `batch-added-1280.jpg` | 1280 | midnight |

## Review after the build

Written by the UX designer, 2026-11-23, from the screenshots above.

| What the design asks | What was built | Verdict |
| --- | --- | --- |
| Camera stays running, list grows under it | `batch-four-390.jpg`: four rows, the camera still live above them | matches |
| Newest first, one-off highlight | Row order newest-first; the highlight is a 300 ms background fade, off under reduced motion | matches |
| Pile formats between camera and list, starting at Paperback | matches |
| Five kinds of row, each with its words not just its colour | `batch-mixed-390.jpg`: `On shelf`, `On your wishlist`, `Not found` all carry their words | matches |
| Price only for paperback / hardcover / e-book, cleared when taken off | Asserted per row in the tests and visible in `batch-four-390.jpg` | matches |
| One price error blocks the whole add, focus to that field | `batch-price-error-390.jpg` | matches |
| `Add all 4 books`, `Nothing to add yet` | matches |
| One live region only | One region under the camera | matches |
| 20 rows at 1280 scroll inside the dialog | `batch-twenty-1280.jpg` | matches |

One difference, not blocking: at 390 px a row with four pressed format chips wraps to three
lines and the price field drops to a line of its own. Accepted — it stays readable and the
field keeps its € and its width.

**Verdict: passes.** Hand to the tester.

# Test

Written by the tester.

# Log

- 2026-11-23 architect: wrote the task from backlog item AD2 (batch scan), size **full**,
  numbered T-0061. Depends on T-0060 only because both rewrite `AddBookDialog.tsx` and ship
  in the same pull request. Two choices made while Hanna was at work, both the cautious ones:
  a batch opens **no** after-adding follow-up (the summary has already asked), and a batch
  asks **no** series question per book (the dashboard's *Waiting for you* does that one at a
  time, D-0013). Handed to the UX designer.
- 2026-11-23 ux-designer: designed the batch list and its summary (390 and 1280, both
  wallpapers, keyboard and screen reader, exact wording, six screenshots). Handed to the
  developer.
