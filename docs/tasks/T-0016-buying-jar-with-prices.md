---
id: T-0016
title: "Make the buying jar spend what a book cost: ask the price of bought books, show the coin count, allow below zero"
description: "The add dialog asks the price of a bought paperback, hardcover or e-book (and the file link for a free e-book), the book panel shows and edits it, and the 📚 buying jar spends €5 per coin exactly, shows just its count and may go below zero."
status: Doing
depends_on: [T-0014]
decisions: [D-0002, D-0009, D-0010, D-0013, D-0014, D-0020, D-0022, D-0024]
raised_on: 2026-11-21
done_on: ""
result: []
---

# Goal

From a feature chat with Hanna (2026-11-21). It changes the 📚 buying jar that T-0014 (#222) put in
the "Want-to-read pile" block on the dashboard, so it follows what she really spends (D-0024).

1. **The jar shows only its coin count:** "🪙 4.6 coins". No "N of 3", no empty slots, no "Treat
   earned! 🎁" and no gold wash any more.
2. **Earning is unchanged:** one coin per finish from the pile (14-day rule) of a book she owns on
   paper or as an e-book (`owned` in `src/lib/pile.ts`), counting from `JAR_START` (2026-11-01).
3. **Spending is the price:** a new optional `Book.price` in euros (D-0002). An owned book added on
   or after 2026-11-01 spends `price / 5` coins, exactly, with decimals (€12 → 2.4 coins). No price
   spends nothing, also for books added since 2026-11-01 before this change (they used to cost 3).
4. **Below zero is allowed:** "🪙 −1.4 coins" (a real minus sign), the count in `--warning`.
5. **Asking the price when she adds a book she bought.** After a book is added from Search, Scan,
   ISBN or By hand in the add dialog (`src/components/AddBookDialog.tsx`), the dialog asks how she
   has it; for paperback, hardcover or e-book it asks "What did it cost?" in euros. Both can be
   skipped; skipping the price leaves it empty (costs nothing). Never asked for library, borrowed,
   audiobook or other, and never for books the Storytel tab imports.
6. **A free e-book:** when the format is e-book and the price is €0, the dialog asks right away for
   the link to the e-book file (`ebookUrl`, T-0007, checked with `cleanEbookLink`: https/http
   only). It can be skipped. Not for paper books at €0.
7. **The book panel** (`src/components/BookPanel.tsx`) shows the price ("€12.50") and lets her
   edit or clear it, for owned books only.
8. The 🎧 Storytel jar is unchanged (a score only).

Out of scope: sleep reads (the next task).

# Done when

- Unit tests next to the `src/lib` logic pass, covering:
  - the jar walk with prices: an owned book's finish from the pile earns 1; adding a priced owned
    book spends `price / 5` exactly (€12 → 2.4, €7.99 → 1.598, sums of decimals without float
    drift, e.g. three books at €0.10 spend exactly 0.06); the jar goes below zero; an owned book
    with no price spends nothing (also one added after 2026-11-01); a library, borrowed or
    listen-only Storytel book with a price never spends; Storytel imports never spend; nothing
    before 2026-11-01 counts; the Storytel jar is unchanged;
  - the coin text: "🪙 4.6 coins", "🪙 4 coins", "🪙 1 coin", "🪙 0 coins", "🪙 −1.4 coins", and a
    count that rounds to zero shows "🪙 0 coins" (never "−0");
  - the price parsing: "12" → 12, "12,50" → 12.5, "12.50" → 12.5, "€ 7.99" → 7.99, "€7,99" and
    "7.99 €" → 7.99, "0" → 0, empty or spaces → no price; rejected: negatives ("-5", "−5"), text
    ("twelve", "12a"), more than two decimals ("7.999"), and above €9,999.99;
  - who is asked: the price question shows for paperback, hardcover and e-book, never for library,
    borrowed, audiobook, Storytel or other, and never for a Storytel import;
  - the €0 e-book link prompt condition: true for an e-book at exactly €0, false at €0.01 or more,
    with no price, and for a paperback or hardcover at €0;
  - `merge.ts`: merging two copies keeps the kept copy's price, else the other's.
- Clicked through on a local dev server with no backend (`pnpm run dev`, no `POCKETBASE_URL`), the
  shelf seeded in localStorage `hannas-reading-list:v1`, with screenshots at 390×844 and 1280×800
  (lavender and midnight) in `docs/tasks/T-0016-screens/` of:
  - the add dialog asking how she has it and the price, after adding a book;
  - the €0 e-book link prompt (a bad link like `javascript:x` is refused; Skip works);
  - the price in the book panel, edited and cleared;
  - the pile block with the buying jar at a decimal count ("🪙 4.6 coins") and at a negative count
    ("🪙 −1.4 coins", in the warning colour), with the Storytel jar beside it as before.
- An older shelf with no `price` on any book loads, and the jar shows its count with no spending.
- `pnpm test`, `pnpm run build` and `pnpm exec harness check` pass.

# Notes

- Group 1 (app code only): one new optional `Book` field, nothing for Sander. No change to
  `shelfMerge.ts`, `src/server/shelf.ts` or the load/save/sync parts of `library.ts`: a whole book
  object travels through the sync as it is, like `ebookUrl` (see `ebookLink.sync.test.ts`).
  `merge.ts` (merging two copies, D-0009) needs `price: keep.price ?? other.price`.
- Files:
  - `src/lib/pile.ts`: `pileJars`, `owned`, `storytelOnly`, `JAR_START`, `TREAT_COST` (goes away).
  - `src/components/DashboardExtras.tsx`: `BuyingJar` and `Coins` (the Storytel jar keeps `Coins`).
  - `src/components/AddBookDialog.tsx`: Search, Scan (adds `formats: ['paperback']`), ISBN and By
    hand tabs; `onUpdate` is already a prop, so the follow-up can patch the added book.
  - `src/components/BookPanel.tsx` and `src/components/EbookLink.tsx` (`EbookLinkField`),
    `src/lib/ebookLink.ts` (`cleanEbookLink`, `ebookHref`).
  - `src/lib/library.ts`: `Book`, `formatsOf`, `withFormats`, `FORMAT_LABELS`.
  - `src/lib/colours.test.ts` already checks `--warning` on a card at 4.5:1 on both wallpapers.
- New logic (price parsing, coin text, who is asked, the €0 link condition) goes in `src/lib` with
  a `*.test.ts`; put "today" in as a parameter.
- Choices taken while Hanna was asleep (reversible, recommended; tell her in the PR):
  - **The add dialog asks how she has it.** Today only Scan sets a format (paperback); Search, ISBN
    and By hand add a book with none, so a price question needs the format first. After adding,
    the dialog shows a short follow-up for that book: the formats as choices (Scan pre-selects
    Paperback), then the price for paperback, hardcover or e-book, then the link for a €0 e-book.
    The book is on the shelf as soon as it is added (as today); the answers patch it, so closing
    the dialog midway loses nothing and leaves the book without format or price.
  - **Price format:** stored as a number of euros with at most two decimals (12.5). Shown as
    "€12.50" (two decimals, `en-GB`). Comma or dot as the decimal mark, € before or after, spaces
    allowed; no thousands separators; at most €9,999.99. An empty field clears the price.
  - **Coin text:** one decimal, rounded half away from zero, the `.0` dropped ("4 coins"),
    "1 coin" singular, a real minus sign; a count that rounds to 0 is "0 coins". Coins are summed
    in cents so decimals don't drift (D-0024).
  - **A price on a book that isn't owned** (e.g. she changes its format to library later) is kept
    but spends nothing, and the panel hides the field.
  - **Same-day order** stays as T-0014 (finishes before adds); with no threshold it no longer
    changes the result.
  - The jar's `aria-label`: "Buying jar: 4.6 coins" / "Buying jar: minus 1.4 coins".
- D-0013: the follow-up lives inside the add dialog she opened; nothing opens by itself. D-0014: no
  explanation next to the price field or the jar (no "€5 = 1 coin"); labels and placeholders only.
  D-0020/D-0022: design tokens only, checked on both wallpapers. D-0010: a book with paper and
  Storytel is owned, so it counts for the buying jar only (unchanged).
- Handover: to the UX designer first (the add-dialog follow-up, the panel field and the jar change
  what she sees), then the developer, who opens the draft pull request from this branch.

# Design

To be written by the UX designer.

# Test

To be written by the tester.

# Log

- 2026-11-21 architect: task written from Hanna's feature chat of 2026-11-21; D-0024 records the
  price-based buying jar (replacing T-0014's 3-coin treat rule); choices taken while Hanna was
  asleep are under Notes; handed to the UX designer.
