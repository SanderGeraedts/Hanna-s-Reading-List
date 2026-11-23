---
id: T-0072
title: "A wishlist of books she wants to buy, kept off the shelf and out of every count"
description: "Books she wants get their own list — a Wishlist dashboard block and Add to wishlist in + Add — each with a cover, title, price and a link to buy it; a wish is a Book with a wish flag (D-0044) that syncs with her shelf but is counted nowhere, and I bought it › moves it to the shelf and asks how she has it and what it cost."
status: Doing
size: full
depends_on: [T-0070]
decisions: [D-0002, D-0009, D-0013, D-0014, D-0017, D-0018, D-0020, D-0024, D-0044]
raised_on: 2026-11-23
done_on: ""
result: ["https://github.com/SanderGeraedts/Hanna-s-Reading-List/pull/PRNUM"]
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
   - searching and tapping a result opens T-0070's cover step, and picking a cover adds a
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

# Choices made while Hanna was at work

Hanna was at work on 23 November 2026 and could not be asked. The big one — how a wish is
stored — was the only route that both syncs and needs nothing from Sander, and it is also the
cheapest to undo, so it was taken and recorded as **D-0044** rather than parked.

1. **A wish is a `Book` with a `wish` flag, in the same shelf, synced by the code that was
   already there.** No new collection, no migration, nothing on the server at Sander's home,
   so **nothing in this pull request waits for him**. The other two routes were a second
   collection (needs Sander) or browser-only storage (would not follow her from phone to
   computer). *To change:* it would be a new decision, and probably a question for Sander.
2. **"I bought it ›" dates the book today**, not the day she wished for it, so *Newly added*,
   the pile's fourteen-day wait and the buying jar all count from the day it arrived.
   *To change:* drop `addedAt` from `boughtPatch`.
3. **A wish's row opens no book panel.** A wish is not on the shelf, so there is nothing to
   open; its only actions are **Buy ›**, **I bought it ›** and **✕**. *To change:* a wish would
   need a panel of its own.
4. **The wishlist never merges a bought wish with a look-alike on the shelf.** Both go on the
   shelf and the dashboard's existing merge suggestion offers to join them.
5. **The wish follow-up asks the price and the link on one step**, not two.
6. **The Wishlist tab has a small "By hand" form** for a book Open Library does not have (a
   pre-order, a small press). It was that or no way at all to wish for such a book.
7. **A wish with no cover shows a plain colour block**, not the book-shaped placeholder.
8. **The block shows the whole list, newest first**, and scrolls past five — it is a shopping
   list, not a chart.
9. **Hanna's own wishlist starts empty.** Nothing was invented for it.

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
3. Tapping it opens **T-0070's cover step**, unchanged except that its primary button reads
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

Written by the UX designer, 2026-11-23, from the built app on the no-backend dev server at
port 3175 and the screenshots in `docs/tasks/T-0072-screens/`.

| What the design asks | What is there | Verdict |
| --- | --- | --- |
| Block: heading, count line, newest first | `wishlist-block-390.jpg`: **Wishlist**, `3 books · €41.48`, *A Study in Drowning* (newest) first | matches |
| A wish with no price shows nothing at all, not €0 | The *A Study in Drowning* row has no € anywhere | matches |
| **Buy ›** absent rather than dead when there is no link | Only the two wishes with a link have it | matches |
| Empty state wording | `wishlist-empty-390.jpg`: `Nothing on your wishlist yet.` | matches |
| The sixth tab, with the row wrapping at 390 | `wishlist-tab-390.jpg`: two lines, *Wishlist* selected, nothing cut off | matches |
| The cover step's primary button reads **Add to wishlist** | Checked in the browser and asserted in `AddWish.test.tsx` | matches |
| The wish follow-up asks both things on one step | `wishlist-followup-390.jpg`: `What will it cost?` and `Where to buy it`, **Skip** / **Done** | matches |
| **I bought it ›** opens *How I have it* with the wish's price in the field | `wishlist-bought-390.jpg`: `Added “Babel”.`, Hardcover pressed, `€ 22.49` already there | matches |
| **By hand** for a book Open Library does not have | `wishlist-byhand-390.jpg` | matches |
| 1280: the price and both buttons on the author's line | `wishlist-block-1280.jpg` and `wishlist-block-midnight-1280.jpg` | matches |
| Wishes counted nowhere | Checked in the browser: after **I bought it ›** the shelf holds *Babel* and the block drops to `1 book · €18.99`; the whole exclusion is proved counter by counter in `wishlist.exclusion.test.ts` | matches |

**One thing was sent back to the developer during this review and fixed:**

- **Focus fell to `<body>` when the follow-up closed.** The design says it goes back to the
  Wishlist block's heading, because the row it was pressed on has moved to the shelf. Measured
  in real Chrome: `document.activeElement` was `body`. Fixed with a `returnFocusId` on
  `FollowUpDialog` and `tabIndex={-1}` on the heading; measured again as `h2 "Wishlist"`, and a
  test now asserts it (docs/lessons.md: a happy-dom focus test is not proof, so this was
  checked in the browser as well).

**Differences that stay, neither blocking:**

1. **A wish with no cover shows a plain colour block**, not the book-shaped placeholder of the
   `Cover` component the design named. It reads fine and keeps the block cheap; a wish that
   came from a search has a real cover anyway.
2. **A wish is only matched against a search result by its Open Library work key.** A wish
   typed in by hand has no work key, so searching for it again offers **Add to wishlist**
   rather than **On your wishlist**. That is the same rule the Search tab has always used for
   the shelf; recorded so the tester knows it is not a regression.

**Verdict: passes.** Hand to the tester.

# Test

Written by the tester, 2026-11-23. The checks and the repeated runs are in T-0070's *Test*
section; they cover all three tasks, which ship in one pull request.

## The one that matters: a wish is counted nowhere

`src/lib/wishlist.exclusion.test.ts` builds one library of ten shelf books and three wishes —
one of the wishes deliberately finished, rated, placed, priced and dated inside the buying
jar's window, so it *would* land in nearly every count — and asserts, **one `it` per counter**,
that the counter given `shelfBooks(library)` answers exactly what it answers for the ten shelf
books alone:

| Counter | Module | Result |
| --- | --- | --- |
| the want-to-read pile | `wantPile` | same |
| the 📚 buying jar | `pileJars` | same; and `pileJars(library)` is **different**, so the wish really would have spent |
| the pile's height | `pileHeights` | same |
| the statistics | `periodStats` | same; `periodStats(library)` **different** |
| what I read | `breakdown` (genre, format, language) | same |
| the records | `records` | same |
| the suggestions | `readNextChoices`, `pickReadNext` | same; `readNextChoices(library)` **different** |
| the world map | `worldMap` | same; `worldMap(library)` **different** |
| the monthly challenge | `challengeNow` | same |
| book bingo | `bingoYear` | same |
| the A–Z challenge | `alphabetYear` (title and author) | same |
| her own challenges | `challengeBooks` | same; `challengeBooks(…, library)` **different** |
| the badges | `badges` | same; `badges(library)` **different** |
| the creatures, and the Reading Garden (given the same books) | `readingDays`, `deriveCreatures` | same |
| the series guess at add time | `seriesGuesses` | same |

And in the browser: buying *Babel* from the block put it on the shelf and the block dropped to
`1 book · €18.99`, with `localStorage` holding `['Piranesi', 'Babel']` as shelf books and one
wish left.

## Trying to break it

| What I tried | What happened |
| --- | --- |
| **A wishlist book with no price** | Shown with no price at all — not `€0.00`, not a dash — and left out of the total (`3 books · €41.48` for two priced wishes and one without). |
| **A wish of exactly €0** | Keeps its price, so the row shows `€0.00`; the count line leaves a zero total out, because "· €0.00" says nothing. |
| **Twelve wishes at €9,999.99** | `12 books · €119999.88`, added up in cents so nothing drifts. `10000` is refused with D-0024's `That’s more than €9,999.99.` |
| **A price that drifted in from somewhere else** (`NaN`, `Infinity`, a negative) | Counts as nothing and never breaks the total. |
| **"I bought it ›" twice** | The row leaves the list on the first press, so there is nothing left to press; the page's guard also refuses an id that is no longer a wish. One book on the shelf, one `role="status"`, no second dialog. |
| **A wishlist book that is already on the shelf** | It still moves; both are then on the shelf and joining them is the dashboard's existing merge suggestion, not the wishlist's job. `mergeBooks` takes the **kept** copy's `wish`, so merging a wish into a shelf book gives a shelf book and merging two wishes stays a wish. |
| **The Wishlist block when empty** | `Nothing on your wishlist yet.`, no list, and the block is not hidden (`wishlist-empty-390.jpg`). |
| **A library of fifty wishes and nothing else** | Every counter has nothing to count; the block holds all fifty. |
| **A buy link that is not a web link** | `javascript:`, `JavaScript:` with spaces around it, `data:`, `vbscript:`, `file:`, `mailto:`, `ftp:`, `//example.com`, a bare word and an empty string are all refused on the way in **and** on every render, so the **Buy ›** link is simply absent. Odd but legal links (a port, a fragment, non-ASCII, 2 000 characters) are kept. |
| **A wish with no author, no cover and a 1 200-character title** | Still a wish, still off the shelf; the title wraps. |
| **The dashboard she arranged before the block existed** | `cleanLayout` puts **Wishlist** in Today in its default place, keeps her order, her hidden blocks, her folded sections and her favourites, and the block appears exactly once. It can be hidden, shown again and starred like any other (`dashboardLayout.test.ts`). |
| **Closing the "I bought it" follow-up early** | A price that was valid is kept (`flush`), and focus goes back to the **Wishlist** heading — checked in real Chrome as well as in a test, after the UX review found it falling to `<body>`. |
| **By hand with a bad link** | The form's own message, nothing added; fixing the link adds the wish with its price and link. (The field is `type="text"`, not `type="url"`, so the browser's own check cannot swallow our message.) |
| **Nothing a server has to do** | `git diff --stat` touches nothing in `src/lib/shelfMerge.ts`, `src/server/shelf.ts`, `deploy/nas/`, `.github/` or `netlify/`. A wish is a `Book` in the same JSON shelf, so saving, merging and syncing are the code that was already there (D-0044). |

## Known, and not a regression

A wish is matched against a search result by its Open Library work key only, so a wish typed
in **By hand** has no key and searching for it again offers **Add to wishlist** rather than
**On your wishlist**. That is the rule the Search tab has always used for the shelf.

**Verdict: passed.**

# Log

- 2026-11-23 architect: wrote the task from backlog item AD3 (wishlist), size **full**,
  numbered T-0072, and recorded **D-0044** for how a wish is stored and kept out of every
  count. Checked the storage question the backlog raises: a flag on `Book` needs **no** server
  change, so this is guardrail group 1 and nothing waits for Sander. Choices made while Hanna
  was at work, all the reversible ones: a wish's row opens no book panel; **I bought it ›**
  re-dates the book to today rather than keeping the day she wished for it; the wishlist never
  merges a bought wish with a look-alike on the shelf by itself. Handed to the UX designer.
- 2026-11-23 ux-designer: designed the Wishlist block, the sixth tab, the wish follow-up and
  the **I bought it ›** move (390 and 1280, both wallpapers, keyboard and screen reader, exact
  wording, eight screenshots). Handed to the developer.
- 2026-11-23 developer: built `lib/wishlist.ts` (the one filter, the buy link, `boughtPatch`),
  `WishlistCard.tsx`, `FollowUpDialog.tsx`, the sixth tab with its **By hand** form, and the
  one-line split in `src/routes/index.tsx`. Nothing in `shelfMerge.ts`, `src/server/shelf.ts`,
  `deploy/nas/`, `.github/` or `netlify/` was touched. Check output: `pnpm exec tsc --noEmit`
  clean; `pnpm test` 143 files, 1849 passed, 22 skipped; `pnpm run build` built in 801 ms;
  `pnpm exec harness check` all four lines ✓. Handed to the UX designer.
- 2026-11-23 ux-designer: reviewed the built block and flow at 390 and 1280 on both wallpapers
  and in real Chrome. Sent one thing back (focus fell to `<body>` when the follow-up closed),
  which the developer fixed and covered with a test. Two differences recorded and accepted.
  **Passed.** Handed to the tester.
- 2026-11-23 tester: ran the checks and the new tests independently (output in T-0070's
  *Test*), three repeated runs with no retry, and spent most of the time on the one thing that
  matters — that a wish is counted nowhere — checking fifteen counters one by one, and on the
  awkward wishes: no price, €0, €9,999.99 twelve times, a drifted price, "I bought it" twice, a
  wish already on the shelf, an empty block, fifty wishes and nothing else, and every shape of
  bad buy link. Added `wishlist.break.test.ts`. Confirmed by `git diff --stat` that nothing in
  `shelfMerge.ts`, `src/server/shelf.ts`, `deploy/nas/`, `.github/` or `netlify/` is touched,
  so **nothing here waits for Sander**. **Passed.**
  Remaining: Hanna reads *Choices made while Hanna was at work* above and confirms **D-0044**
  (a wish is a book with a flag, kept out of every count by one filter) and that buying a wish
  dates the book today.
