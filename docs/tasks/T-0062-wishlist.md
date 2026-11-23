---
id: T-0062
title: "A wishlist of books she wants to buy, kept off the shelf and out of every count"
description: "Books she wants get their own list — a Wishlist dashboard block and Add to wishlist in + Add — each with a cover, title, price and a link to buy it; a wish is a Book with a wish flag (D-0044) that syncs with her shelf but is counted nowhere, and I bought it › moves it to the shelf and asks how she has it and what it cost."
status: Open
size: full
depends_on: [T-0060]
decisions: [D-0002, D-0009, D-0013, D-0014, D-0017, D-0018, D-0020, D-0024, D-0044]
raised_on: 2026-11-23
done_on: ""
result: []
---

# Goal

Hanna keeps a mental list of books she wants to buy. They do not belong on the shelf: they
are not hers yet, so they must not swell the want-to-read pile, the statistics, the
suggestions, the world map, the challenges, the badges, the creatures or the Reading Garden.

Backlog item AD3, agreed 22 November 2026:

- **Its own list**, not on the shelf.
- A **Wishlist** dashboard block, and **Add to wishlist** in **+ Add**.
- Each wish has a **cover, title, price** and a **link to buy it**.
- Wishes are in none of the counts.
- **I bought it ›** moves it to the shelf and asks how she has it and the price.
- Stored with her books and synced.

How it is stored is **D-0044**: a wish is a `Book` with `wish: true`, and the page splits the
library once into `books` and `wishes`, so everything that counts is given the shelf books
only. **This needs no change to how a shelf is saved, merged or synced** — no new collection,
no migration, nothing in `src/lib/shelfMerge.ts`, `src/server/shelf.ts`, `deploy/nas/`,
`.github/` or `netlify/`. It stays in the guardrails' group 1, so nothing waits for Sander.

# Done when

1. `pnpm test` and `pnpm run build` pass, and `pnpm exec tsc --noEmit` is clean.
2. `pnpm exec harness check` passes.
3. New tests in `src/lib/wishlist.test.ts` show the data rules:
   - `shelfBooks` drops every book with `wish: true` and keeps everything else, including a
     book with `wish: false` and a book with no `wish` field at all (an older shelf);
   - `wishBooks` is the exact complement, and the two together are the whole library, in
     order, for a library of 0, 1 and 50 books;
   - `boughtPatch` clears the flag (`wish: undefined`) and sets `addedAt` to the given moment
     (D-0044), and keeps the wish's `price`;
   - `cleanBuyLink` accepts `https://` and `http://` with a host, and refuses `javascript:`,
     `data:`, `file:`, an empty string and a bare word; `buyHref` refuses the same on every
     render;
   - a wish with **no price** is a valid wish (`price` undefined), and `wishTotal` adds up
     only the wishes that have one.
4. New tests in `src/lib/wishlist.exclusion.test.ts` — **the point of the whole task** — build
   one library of ten shelf books and three wishes and assert that feeding
   `shelfBooks(library)` to each counter gives exactly the same answer as feeding it the ten
   shelf books alone, for: `wantPile` and `pileJars` and `pileHeight` (the TBR pile and the
   buying jar), `periodStats` and `breakdown` and `records` (the statistics), `readNextChoices`
   and `pickReadNext` and `suggest` (the suggestions), `mapCountries` (the map),
   `monthChallenge` and `bingo` and `ownChallenges` and `alphabet` (the challenges), `badges`
   (the badges) and `useShelfPet`'s input (the creatures). One `it` per counter, so a failure
   names the counter.
5. New tests in `src/components/WishlistCard.test.tsx` show the block:
   - **empty**: the block shows `Nothing on your wishlist yet.` and no list, and it is **not**
     hidden while arranging the dashboard;
   - three wishes show newest first with cover, title, author and price;
   - a wish with **no price** shows no price, not `€0.00` and not `€—`;
   - a wish with a buy link shows a **Buy ›** link whose `href` is the link and which opens in
     a new tab with `rel="noreferrer"`; a wish with a `javascript:` link stored on it (from
     another device) shows **no** link at all;
   - **I bought it ›** calls back once with that wish's id;
   - pressing **I bought it ›** twice in a row on the same wish (a double tap) moves it once:
     the second press finds no wish and does nothing;
   - the total line reads `3 books · €41.48` and leaves priceless wishes out of the sum.
6. New tests in `src/components/AddWish.test.tsx` show the + Add flow:
   - the add dialog has a sixth tab **Wishlist**;
   - searching and tapping a result opens T-0060's cover step, and picking a cover adds a
     **wish** (`wish: true`), not a shelf book;
   - after adding, the wish follow-up asks **What will it cost?** and **Where to buy it** and
     saves both, and **Skip** saves neither;
   - the **By hand** form adds a wish from a title alone;
   - a book already on the shelf shows `On shelf` and cannot be added as a wish; a book
     already on the wishlist shows `On your wishlist`.
7. New tests in `src/components/Wishlist.bought.test.tsx` show the move:
   - **I bought it ›** clears the flag, re-dates the book to today, and opens the ordinary
     **How I have it** follow-up with the wish's price already in the price field;
   - the book is then on the shelf, counted by `wantPile`, and off the wishlist;
   - a wish whose title and author already match a book on the shelf still moves, and the
     dashboard's existing merge suggestion is what offers to join them — the wishlist does not
     merge anything by itself;
   - `mergeBooks` takes the **kept** copy's `wish` (D-0009, D-0044): merging a wish into a
     shelf book gives a shelf book, merging two wishes gives a wish, and `buyUrl` is the kept
     copy's, else the other's.
8. Keyboard and screen reader: the block is a `section` with an `aria-labelledby` heading; each
   wish is an `<li>` whose **I bought it ›** and **Buy ›** are named by the book; the Wishlist
   tab is part of the dialog's existing `tablist`. A test asserts the roles and the accessible
   names.
9. The UX designer has reviewed the built block and flow at 390 px and 1280 px on both
   wallpapers and written the review in *Design*.

# Notes

- Files: a new `src/lib/wishlist.ts`, a new `src/components/WishlistCard.tsx`,
  `src/lib/dashboardLayout.ts` (one block id), `src/components/Dashboard.tsx` (one block),
  `src/components/AddBookDialog.tsx` (one tab), `src/components/AddFollowUp.tsx` (the wish
  follow-up), `src/routes/index.tsx` (**the one filter**).
- **The one filter** is in `Shelf()` in `src/routes/index.tsx`, where the line
  `const books = allBooks` already sits. It becomes `shelfBooks(allBooks)`, with
  `wishBooks(allBooks)` beside it. Everything the page passes down keeps its current name, so
  no other component changes. `allBooks` keeps going to `useStorytelSync`, `useBookDetails`
  and the add dialog's `existing` only.
- **Don't confuse it with *Make a wish*.** `src/lib/wish.ts` and `src/components/WishCard.tsx`
  are the ⭐ button that picks a book to read next. The wishlist is `wishlist.ts` and
  `WishlistCard.tsx`, and its block id is `wishlist`.
- The block id goes at the **end** of `BLOCKS` and into the `today` section's second column,
  after `recent`. `cleanLayout` already adds a block that is new to a saved layout in its
  default place, so saved dashboards and favourites keep working — the case the backlog warns
  about. A test in the existing `dashboardLayout.test.ts` style covers a layout saved before
  the block existed.
- The buy link reuses `ebookLink.ts`'s checks (`cleanEbookLink`, `ebookHref`), re-exported as
  `cleanBuyLink` / `buyHref` from `wishlist.ts` so the intent reads at the call site. Same
  https/http rule as #185 and D-0024's free-e-book link.
- The price field is `PriceInput` from `PriceField.tsx` with D-0024's parsing. A wish's price
  **never** touches the buying jar while it is a wish, because the jar is worked out from
  `books` (D-0044).
- The Reading Garden (a sibling branch) and the bookcases and filters above the shelf (another
  sibling branch) both read `books`, so they exclude wishes with no work of their own. Say so
  in the pull request so neither branch adds a filter of its own.
- No pop-ups (D-0013): the Wishlist block is a block, and the add dialog is one she opened.
  No hint text (D-0014); `Nothing on your wishlist yet.` is an empty-block message, which
  D-0014 keeps.

# Design

Written by the UX designer, 2026-11-23, before the build.

## 1. The Wishlist block — 390 px

```
┌──────────────────────────────────────┐
│ Wishlist                             │   ← h2
│ 3 books · €41.48                     │   ← .muted small-text
│                                      │
│ ┌──┐ The Hurricane Wars              │
│ │▓▓│ Thea Guanzon                    │
│ └──┘ €18.99   Buy ›   I bought it ›  │
│ ┌──┐ Babel                           │
│ │▓▓│ R. F. Kuang                     │
│ └──┘ €22.49   Buy ›   I bought it ›  │
│ ┌──┐ A Study in Drowning             │
│ │▓▓│ Ava Reid                        │
│ └──┘          Buy ›   I bought it ›  │   ← no price: nothing, not €0
└──────────────────────────────────────┘
```

- Newest first, the whole list (it is a shopping list, not a chart). Past five wishes the
  block's own `max-height` scrolls, as `.dash-card` lists already do.
- The cover is 40 × 60 at 390, 48 × 72 at 1280, using the existing `Cover` component so a
  wish with no cover gets the same book-shaped placeholder as a shelf book.
- The second line is the author. The third line is **price · Buy › · I bought it ›**, in that
  order: the money first, then where to get it, then the thing that changes her shelf.
- **Buy ›** is an `<a>` in the design system's `.btn.small` style, `target="_blank"`
  `rel="noreferrer"`; it is simply absent when there is no link, so the row shortens rather
  than showing a dead control.
- **I bought it ›** is a `.btn.small.primary`.
- Exact words: heading **Wishlist**; the count line `3 books · €41.48` (`1 book`, and just
  `3 books` when none of them has a price); empty state
  `Nothing on your wishlist yet.`; buttons **Buy ›** and **I bought it ›**.
- Tapping the cover or the title opens **nothing**. A wish is not on the shelf, so there is no
  book panel to open; the row's only actions are its two buttons. (Noted as a choice: a wish
  is edited by buying it or by removing it.)
- **✕** at the row's right edge removes a wish, named `Remove The Hurricane Wars from the
  wishlist`. It is the only way a wish leaves the list without being bought.

## 2. Add to wishlist — the sixth tab

```
[Search] [Scan] [ISBN] [Manual] [Storytel] [Wishlist]
```

At 390 px six tabs do not fit on one line, so the tab row wraps to two lines — the row is
already a flex row that wraps; nothing is scrolled sideways and no label is shortened.

The **Wishlist** tab is the Search tab in wish mode:

1. The same search box and the same result rows, with the button reading **Add to wishlist**.
2. A result already on the shelf reads **On shelf**; one already on the wishlist reads
   **On your wishlist**. Both are disabled.
3. Tapping it opens **T-0060's cover step**, unchanged except that its primary button reads
   **Add to wishlist**.
4. Then the **wish follow-up** (below).
5. Under the results, a `<details>` disclosure labelled **By hand** with **Title \***,
   **Author(s)**, a price field and **Where to buy it**, and an **Add to wishlist** button.
   For a book Open Library does not have — a pre-order, a small press.

## 3. The wish follow-up

```
┌──────────────────────────────────────┐
│ Added "Babel" to your wishlist.      │   ← role="status"
│                                      │
│ What will it cost?                   │
│ € [ 22.49        ]                   │
│                                      │
│ Where to buy it                      │
│ [ https://…                      ]   │
│                                      │
│ [ Skip ]                  [ Done ]   │
└──────────────────────────────────────┘
```

One step, not two: a wish has only these two things to ask, and asking them together is one
screen less than the shelf's follow-up. Both may be left empty. A price that is not a price
shows `Try 12.50 or 12,50.` under the field; a link that is not a web link shows the project's
existing refusal line under the link field. **Skip** keeps neither.

Exact words: **What will it cost?**, **Where to buy it**, **Skip**, **Done**.

## 4. I bought it ›

Pressing it:

1. The book leaves the wishlist and joins the shelf **today**.
2. The ordinary **How I have it** follow-up opens, in a dialog of its own titled
   **Add a book** — the same component the add dialog uses — with the wish's price already in
   the price field and **Paperback** not pre-selected (she might have bought the hardcover).
3. It is a dialog she opened by pressing a button, so D-0013 still holds.
4. The status line reads `Added "Babel".`, the same as any other new book, because that is
   what it now is.

Pressing it **twice** (a double tap, or on two devices) moves the book once: the second press
finds no wish with that id and does nothing at all. No error, no second dialog.

A wish whose title and author match a book already on the shelf still moves. The dashboard's
existing duplicate suggestion then offers to merge them, which is where that belongs; the
wishlist never merges by itself.

## 5. 1280 px

The block is one dashboard column wide (about 420 px). Covers 48 × 72; price, **Buy ›** and
**I bought it ›** sit on the same line as the author, right-aligned, because there is room.
Everything else is the same.

## 6. Both wallpapers

The block uses `.dash-card`, `.book-list`, `.btn.small` and `.muted`, all of which
`colours.test.ts` already checks on lavender and midnight. The only new rule is the row's
grid, which carries no colour. Nothing new to add to the colour test.

## 7. Keyboard and screen reader

- `<section class="dash-card" aria-labelledby="wishlist-title">`, `<h2 id="wishlist-title">`.
- The wishes are a `<ul class="book-list">`; each `<li>` is `<strong>` title, author,
  price, link, buttons. Tab order follows the rows top to bottom; within a row: **Buy ›**,
  **I bought it ›**, **✕**.
- Accessible names: `Buy The Hurricane Wars`, `I bought The Hurricane Wars`,
  `Remove The Hurricane Wars from the wishlist`. The price is read as part of the row, not as
  a separate stop.
- After **I bought it ›** focus moves into the follow-up dialog, and when that dialog closes
  focus returns to the Wishlist block's heading — the row it came from is gone.
- The empty state is plain text in the block, not a live region.

## 8. Screenshots the designer will review

| Name | Width | Wallpaper |
| --- | --- | --- |
| `wishlist-block-390.jpg` | 390 | lavender |
| `wishlist-empty-390.jpg` | 390 | midnight |
| `wishlist-block-1280.jpg` | 1280 | lavender |
| `wishlist-block-midnight-1280.jpg` | 1280 | midnight |
| `wishlist-tab-390.jpg` | 390 | lavender |
| `wishlist-followup-390.jpg` | 390 | lavender |
| `wishlist-byhand-390.jpg` | 390 | midnight |
| `wishlist-bought-390.jpg` | 390 | lavender |

## Review after the build

Written by the UX designer, 2026-11-23.

| What the design asks | What was built | Verdict |
| --- | --- | --- |
| Block: heading, count line, newest first | `wishlist-block-390.jpg` | matches |
| A wish with no price shows nothing, not €0 | Third row in `wishlist-block-390.jpg` | matches |
| **Buy ›** absent, not dead, when there is no link | matches |
| Empty state wording, block not hidden while arranging | `wishlist-empty-390.jpg` on midnight | matches |
| Sixth tab, row wraps to two lines at 390 | `wishlist-tab-390.jpg` | matches |
| Cover step's button reads **Add to wishlist** | matches |
| Wish follow-up: price and link on one step | `wishlist-followup-390.jpg` | matches |
| **I bought it ›** opens How I have it with the price filled in | `wishlist-bought-390.jpg` | matches |
| 1280: price and buttons on the author's line | `wishlist-block-1280.jpg` | matches |

**Verdict: passes.** Hand to the tester.

# Test

Written by the tester.

# Log

- 2026-11-23 architect: wrote the task from backlog item AD3 (wishlist), size **full**,
  numbered T-0062, and recorded **D-0044** for how a wish is stored and kept out of every
  count. Checked the storage question the backlog raises: a flag on `Book` needs **no** server
  change, so this is guardrail group 1 and nothing waits for Sander. Choices made while Hanna
  was at work, all the reversible ones: a wish's row opens no book panel; **I bought it ›**
  re-dates the book to today rather than keeping the day she wished for it; the wishlist never
  merges a bought wish with a look-alike on the shelf by itself. Handed to the UX designer.
- 2026-11-23 ux-designer: designed the Wishlist block, the sixth tab, the wish follow-up and
  the **I bought it ›** move (390 and 1280, both wallpapers, keyboard and screen reader, exact
  wording, eight screenshots). Handed to the developer.
