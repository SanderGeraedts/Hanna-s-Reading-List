---
id: T-0017
title: "Suggest a book for an empty bingo square, keep A–Z tips to the series order and never recommend sleep reads"
description: "Tapping an empty square on the bingo card being played shows one fitting book from her pile (cover, title, Open, Another one), A–Z tips only offer want-to-read books she can start next, and readNextChoices leaves out sleep reads everywhere."
status: Open
depends_on: [T-0013, T-0014]
decisions: [D-0002, D-0008, D-0013, D-0014, D-0016, D-0020, D-0022, D-0025]
raised_on: 2026-11-21
done_on: ""
result: []
---

# Goal

From a feature chat with Hanna (2026-11-21). Three parts, one task, all app code worked out from
the books on the shelf: nothing new is stored and nothing changes on the server. The rule behind
all three is D-0025: every book suggested from her pile comes from `readNextChoices`.

## 1. Bingo suggestions

Tapping an **empty** square on the bingo card she is playing now shows a small suggestion card:
the book's cover, its title, **Open** (opens the book in the book panel, `onShowBook(id)`, like
What next? and Make a wish) and **Another one** (another fitting book). Filled squares stay as
they are today (not tappable).

Where the book comes from: `readNextChoices(books, today)` (want to read, never finished, out
already, series strictly in order with a missing earlier book counting as unread, and after part 3
no sleep reads), drawn at random **weighted by `wishWeight`** (waited long, an author she loves, a
series she enjoys), like Make a wish. The only exception is the re-read square.

Each square, by its id in `SQUARES` (`src/lib/bingo.ts`). "Same test as the tick" means: a book
that passes the test the square uses to tick itself, so finishing the suggested book ticks it.

**Clear fit** (the square's own tick test, applied to the book):

| Square id | Label on the card | Suggests a choice that… |
|---|---|---|
| `long` | Over 500 pages | has more than 500 pages (`thicknessPages`, a minute of listening is a page for listen-only books, D-0008) |
| `huge` | Over 700 pages | has more than 700 pages (same count) |
| `short` | Under 200 pages | has more than 0 and fewer than 200 pages (same count) |
| `dutch` | A book in Dutch | has `language === 'nl'` |
| `audio` | An audiobook | `hasAudio` |
| `longlisten` | A listen over 15 hours | `hasAudio` and more than 15 hours (`minutes > 900`) |
| `library` | From the library | has `library` in `formatsOf` |
| `borrowed` | A borrowed book | has `borrowed` in `formatsOf` |
| `hardcover` | A hardcover | has `hardcover` in `formatsOf` |
| `classic` | A classic (before 1950) | was published before 1950 (`pubYear`) |
| `brandnew` | Brand new (out this year) | was published this year (`pubYear` = the card's year) |
| `romance` | A romance | has a genre matching the square's regex |
| `mystery` | A mystery or thriller | has a genre matching the square's regex |
| `scifi` | Science fiction or dystopian | has a genre matching the square's regex |
| `nonfiction` | Not fiction | has a genre matching the square's regex |
| `genre` | Not fantasy | has genres and none of them is fantasy |
| `author` | A new author ("newauthor") | has an author she has never finished a book by |
| `firstinseries` | Start a new series | is book 1 (`seriesGroups` index 1, a series with at least 2 books on the shelf) of a series of which she has read nothing and is reading or has paused nothing |
| `series` | Finish a series | is the last unread book of its series on the shelf: every other book of that series on the shelf is read (the `seriesProgress` test the tick uses, a series of 2 or more) |
| `longseries` | From a series of 5+ | is in a series with 5 or more books on the shelf, or numbered 5 or higher |
| `sameauthor` | Same author twice | is by an author she finished a book by on this card (see *Choices made while Hanna slept*) |

**Best guess** (can't be known before she reads it, so the most likely book):

| Square id | Label on the card | Suggests a choice that… |
|---|---|---|
| `week` | Started and finished in a week | is short as Make a wish means it: under 300 pages or under 8 hours of listening (`lengthOf(book) === 'short'` in `src/lib/wish.ts`) |
| `fast` | Gone in 2 days | has more than 0 and fewer than 200 pages (the `short` test) |
| `five` | A 5-star read | is by an author of whom she rated another book 5 stars (`cleanRating === 5`) |
| `spicy` | A spicy read (4+ 🌶️) | is by an author, or in a series, of which she rated a book 4+ spice (`cleanSpice >= 4`), or has 4+ spice itself |
| `reread` | A re-read | is a book she has finished (see below): the only place a finished book is suggested (D-0025) |

The re-read square doesn't use `readNextChoices`. Its books: status `read` (finished at least
once, not being re-read or paused now, not DNF, not want), not a sleep read (`sleepReadIds`). When
any of those are rated 4 or 5 stars, only those; otherwise any of them. Drawn at plain random (no
`wishWeight`: "waited long" means nothing for a book she has read).

**No reaction:** `three` (3 books in one month) and `fivemonth` (5 books in one month). No book can
help, so tapping does nothing and these squares don't look tappable.

**No fit:** when no book fits a square, the card says **"No book on your shelf fits this one
yet."** (with no Open and no Another one).

All 28 square ids in `SQUARES` are covered above; there is no square left to decide.

## 2. A–Z tips follow the series rules

In `alphabetYear` (`src/lib/alphabet.ts`, the `pile` for `tips`, around line 124): a want-to-read
book may be a tip only when it is in `readNextChoices(books, today)`. Books she is reading or has
paused stay suggestible, first, as now. The monthly challenge picker
(`src/lib/monthChallenge.ts`) stays exactly as it is.

## 3. Sleep reads never in TBR recommendations

`readNextChoices` (`src/lib/readNext.ts`) leaves out every book in `sleepReadIds(books)`
(`src/lib/sleepSeries.ts`: ticked itself or through its series). That covers Make a wish, the
dashboard's What next?, the weekly dust-off book (`src/lib/pile.ts`) and the bingo suggestions
without changes to them. The A–Z tips left sleep reads out already.

## Choices made while Hanna slept

Hanna agreed on the scope above and asked to take the recommended option for anything still open.
These were taken by the architect; the UX designer may refine the visual ones and writes them
under *Design*.

1. **Which card.** Suggestions only on the card being played this year, both on the dashboard's
   bingo block and on the Challenges page. Empty squares of another year's card (the year switcher
   on Challenges) and the full cards under "Full cards in …" are not tappable: they can't be
   ticked any more.
2. **Where the card shows.** Inside the bingo block, right under the grid, with the tapped square
   marked as chosen; never a pop-up or a dialog (in the spirit of D-0013). Tapping the same square
   again closes it; tapping another empty square switches to that one. A small close button (×)
   closes it too.
3. **Another one** draws another fitting book that hasn't been shown for that square since the
   card opened; when all have been shown it starts over. With only one fitting book, Another one
   is left out. What was shown is not remembered (no localStorage, nothing stored): a new visit
   draws fresh.
4. **No difference shown between a clear fit and a best guess**, and no reason line ("An author you
   love" etc.) on the card: D-0014, no explanation texts. The square's own label already says what
   it asks.
5. **Same author twice** uses the authors of books finished **on this card** (since the card
   started), not the whole year, because only those make the square tick. On the first card of
   the year that is the same as "this year". The developer exposes the card's start (the same
   window `bingoYear` plays) to the suggestion logic.
6. **New author**: "never finished a book by" is per author, the way the tick checks it
   (`firstByAuthor`), so a co-written book with one new author fits.
7. **Week vs fast**: `week` uses Make a wish's "short" (under 300 pages or 8 hours), `fast` uses
   the bingo "Under 200 pages" test; two days asks for a shorter book than a week.
8. **Five and spicy** match on any of the book's authors (the `authorKey` comparison bingo uses),
   and for spicy also on its series (`seriesGroups` key).
9. **Re-read** prefers books she rated 4–5 stars, leaves out sleep reads, and isn't weighted.
10. **Page squares** use the same page count as the tick (`thicknessPages`): a book with no page
    count and no listening time doesn't fit `long`, `huge`, `short`, `fast` (or `week` without
    either).
11. **A–Z tips for DNF books** stay as today (suggestible, ranked last): Hanna only asked about
    want-to-read books, and DNF books aren't recommendations from the pile.
12. **No new stored fields** were needed (D-0002 would make one optional).

# Done when

- Unit tests pass, next to the new and changed `src/lib` code:
  - **readNext** (`src/lib/readNext.test.ts`): a want-to-read book ticked as a sleep read is never
    in `readNextChoices`, nor is one whose series is marked as a sleep read; a plain want book next
    to them still is.
  - **alphabet** (`src/lib/alphabet.test.ts`): book 3 of a series is never a tip while book 2 is
    unread (want or missing from the shelf); once book 2 is read, book 3 can be; a book she is
    reading or has paused is still a tip, ahead of want books.
  - **bingo suggestions** (a new module, e.g. `src/lib/bingoSuggest.ts`, with its own test):
    - for each clear-fit square id in the table, a book that fits is suggested and one that
      doesn't is never suggested (pages incl. a listen-only book counted in minutes, Dutch, audio,
      15 h, library, borrowed, hardcover, before 1950, this year, each genre, not fantasy, new
      author, book 1 of an unstarted series but not of a started one, the last unread book of a
      series, series of 5+, an author finished on this card but not one finished only on an
      earlier card);
    - the best guesses: `week` (under 300 pages / 8 h), `fast` (under 200 pages), `five` (an
      author with a 5-star book), `spicy` (an author or series with 4+ spice);
    - `reread` suggests only finished books, prefers 4–5 stars, never a sleep read, and never a
      want-to-read book;
    - `three` and `fivemonth` give "no reaction"; a square with nothing fitting gives "no fit";
    - no square (except `reread`) ever suggests a finished book, a sleep read, a book not out yet
      or book 3 of a series with book 2 unread;
    - the draw is weighted by `wishWeight` and Another one doesn't repeat until every fitting book
      was shown (a seeded `random` and a fixed `today` make the tests deterministic).
- Clicked through on a local dev server with no backend (`pnpm run dev`, the shelf in the browser,
  never the production `POCKETBASE_URL`), with screenshots at 390×844 and 1280×800 on both
  wallpapers (lavender and midnight) in `docs/tasks/T-0017-screens/`, of:
  - an empty square tapped on the dashboard and on Challenges: the card with cover and title;
    Open opens the book panel; Another one shows another book;
  - a square with nothing fitting: "No book on your shelf fits this one yet.";
  - `three` / `fivemonth` tapped: nothing happens; a filled square looks and behaves as before;
  - Make a wish and What next? no longer offering a sleep read on a shelf that has one.
- What Hanna sees matches *Design*; new buttons are at least 44 px high on a touch screen; no
  explanation text is added (D-0014).
- `pnpm test`, `pnpm run build` and `pnpm exec harness check` pass.

# Notes

- **Group 1** (app code only, `docs/hanna-guardrails.md`): nothing for Sander. No `Book` fields, no
  server code, nothing in `src/lib/shelfMerge.ts`, `src/server/shelf.ts` or `deploy/nas/`.
- Files:
  - `src/lib/readNext.ts`: `readNextChoices` (part 3).
  - `src/lib/sleepSeries.ts`: `sleepReadIds`.
  - `src/lib/alphabet.ts`: `alphabetYear`, the `pile` for `tips` (part 2).
  - `src/lib/bingo.ts`: `SQUARES` and the helpers the suggestions should reuse rather than copy
    (`pagesOf`, `pubYear`, the genre regexes, `has`, `authorKey`, `shelfFacts`, the card's start
    day). Export what's needed; keep the tick behaviour and `cardSquares` exactly as they are, so
    no card she is playing changes.
  - `src/lib/wish.ts`: `wishWeight`, `lengthOf`, and the weighted draw in `grantWish` (reuse or
    extract it).
  - `src/lib/series.ts` (`seriesGroups`), `src/lib/insights.ts` (`seriesProgress`),
    `src/lib/ratings.ts` (`cleanRating`, `cleanSpice`), `src/lib/listening.ts` (`hasAudio`,
    `thicknessPages`).
  - `src/components/DashboardMore.tsx`: `BingoCard` (squares are `role="img"` divs now; empty
    squares of the card being played become buttons). It has no `onShowBook` yet: pass it from
    `src/components/Dashboard.tsx` (`bingo:` entry) and `src/components/ChallengesPage.tsx`.
  - Examples for a suggestion with cover, Open and Another one: `ReadNextCard` in `Dashboard.tsx`
    and `src/components/WishCard.tsx`.
- Put "today" and `random` in as parameters so the tests are deterministic.
- D-0016: books not out yet are never suggested (`readNextChoices` already checks it).
- D-0020/D-0022: only the design tokens from the top of `src/styles.css`; check both wallpapers.
- Handover: to the UX designer first (a new card on the bingo block and tappable squares), then the
  developer, who opens the draft pull request on this branch (`t-0017-bingo-suggestions`).

# Design

To be written by the UX designer.

# Test

To be written by the tester.

# Log

- 2026-11-21 architect: task written from Hanna's feature chat of 2026-11-21; D-0025 records that
  every suggestion from her pile follows `readNextChoices` (series in order, no sleep reads, re-reads
  only on bingo's re-read square); all 28 bingo squares mapped; choices taken while Hanna was
  asleep are under *Choices made while Hanna slept*; group 1, no new stored fields; handed to the
  UX designer.
