---
id: T-0017
title: "Suggest a book for an empty bingo square, keep A–Z tips to the series order and never recommend sleep reads"
description: "Tapping an empty square on the bingo card being played shows one fitting book from her pile (cover, title, Open, Another one), A–Z tips only offer want-to-read books she can start next, and readNextChoices leaves out sleep reads everywhere."
status: Doing
depends_on: [T-0013, T-0014]
decisions: [D-0002, D-0008, D-0013, D-0014, D-0016, D-0020, D-0022, D-0025]
raised_on: 2026-11-21
done_on: ""
result: ["https://github.com/SanderGeraedts/Hanna-s-Reading-List/pull/226"]
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
| `sameauthor` | Same author twice | is by an author she finished a book by **this year, on any card** (Hanna's decision, see *Same author twice* below) |

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

### Same author twice: the whole year counts (Hanna's decision, 2026-11-21)

Hanna decided this herself on 2026-11-21 (relayed by the coordinator while she was awake), and it
replaces the architect's earlier choice that only books finished on the current card count.

- **The suggestion** for `sameauthor`: a choice by an author of whom she finished a book **this
  year, on any card** (any finish in `yearFinishes(books, year)`, matched on any of the book's
  authors with `authorKey`).
- **The tick changes the same way.** The `sameauthor` tick in `src/lib/bingo.ts` now looks only
  at `win` (the finishes on this card). It must also tick on a finish on this card when she
  finished **another book** (a different book id) by the same author **earlier in the same year**,
  even on an older card of that year. Two finishes of the same book still don't count. The book
  that ticks the square is the finish on this card, as now. The developer gives the tick what it
  needs (for example the year's finishes before this card in `Shelf`), and every other square's
  tick and `cardSquares` stay exactly as they are.
- What this means for her: on a second or later card, "Same author twice" can tick with the first
  book she finishes by an author she already read that year. A card she is playing may tick this
  square on her next visit if such a book is already on it; full cards stay as remembered.

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
5. **New author**: "never finished a book by" is per author, the way the tick checks it
   (`firstByAuthor`), so a co-written book with one new author fits.
6. **Week vs fast**: `week` uses Make a wish's "short" (under 300 pages or 8 hours), `fast` uses
   the bingo "Under 200 pages" test; two days asks for a shorter book than a week.
7. **Five and spicy** match on any of the book's authors (the `authorKey` comparison bingo uses),
   and for spicy also on its series (`seriesGroups` key).
8. **Re-read** prefers books she rated 4–5 stars, leaves out sleep reads, and isn't weighted.
9. **Page squares** use the same page count as the tick (`thicknessPages`): a book with no page
   count and no listening time doesn't fit `long`, `huge`, `short`, `fast` (or `week` without
   either).
10. **A–Z tips for DNF books** stay as today (suggestible, ranked last): Hanna only asked about
    want-to-read books, and DNF books aren't recommendations from the pile.
11. **No new stored fields** were needed (D-0002 would make one optional).

(The architect's earlier choice about *Same author twice* was replaced by Hanna's own decision,
under *Same author twice: the whole year counts* above.)

Taken by the UX designer (2026-11-21), the visual and interaction ones, written out under *Design*:

12. **The card names its square.** Its heading is the tapped square's label (e.g. "Over 500
    pages"), so on a phone she still sees which square it is for when the grid has scrolled up.
    A label, not an explanation (D-0014).
13. **The author is shown under the title**, as in What next?: two books with a similar title are
    told apart, and it is not a reason line.
14. **Buttons are "Open" and "🎲 Another one"**, full-size buttons like What next? (gold Open,
    outlined Another one); the 🎲 matches What next?'s "🎲 Another".
15. **The cover is a picture, not a button**: Open is the one way to the book, so there is one tab
    stop less per suggestion.
16. **Tappable squares look tappable**: empty squares of the card being played get the stronger
    frame (`--border-strong`); "3 books in one month", "5 books in one month", filled squares, other
    years and full cards keep today's look. The chosen square gets a solid gold frame.
17. **Focus moves to the card's heading** when it opens (the card sits after all 16 squares in tab
    order); × or Escape closes it and puts focus back on the square.
18. **When the shelf changes under an open card**: if the book shown no longer fits (finished,
    removed, marked as a sleep read), the card shows another fitting book (or the no-fit line); if
    the square ticks itself, the card closes.

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
      series, series of 5+, an author finished this year on any card, also one finished only on
      an earlier card of this year, but not one finished only last year);
    - the best guesses: `week` (under 300 pages / 8 h), `fast` (under 200 pages), `five` (an
      author with a 5-star book), `spicy` (an author or series with 4+ spice);
    - `reread` suggests only finished books, prefers 4–5 stars, never a sleep read, and never a
      want-to-read book;
    - `three` and `fivemonth` give "no reaction"; a square with nothing fitting gives "no fit";
    - no square (except `reread`) ever suggests a finished book, a sleep read, a book not out yet
      or book 3 of a series with book 2 unread;
    - the draw is weighted by `wishWeight` and Another one doesn't repeat until every fitting book
      was shown (a seeded `random` and a fixed `today` make the tests deterministic).
  - **bingo tick for Same author twice** (`src/lib/bingo.test.ts`, Hanna's decision of
    2026-11-21): a book by an author finished on card 1, then **another** book by that author
    finished on card 2 of the same year, ticks card 2's `sameauthor` square with the card 2 book;
    the same author finished only last year doesn't tick it; finishing the same book twice doesn't
    tick it; two books by one author on one card still tick it as before; the existing bingo
    tests for every other square still pass unchanged.
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
- Checked by the tester for the UX designer's part:
  - with the keyboard only: Tab reaches each empty square of this year's card (not `three`,
    `fivemonth`, filled squares, another year's card or a full card); Enter or Space opens the
    card and focus lands on its heading; Tab then reaches Open, 🎲 Another one and ×; Escape or ×
    closes it and focus is back on the square; a visible gold focus ring on each of them;
  - a screen reader (or the accessibility tree) gives each empty square as a button named
    "<label>, suggest a book" with expanded false/true, and the card as a region named after the
    square;
  - the card is never a pop-up: it opens under the grid, inside the bingo block, and the page
    behind it stays usable;
  - one fitting book: no 🎲 Another one; nothing fitting: only the heading, × and "No book on
    your shelf fits this one yet.";
  - at 390×844 nothing scrolls sideways, the buttons wrap as whole buttons, and a long title
    wraps without overflowing;
  - the colour test (`colours.test.ts`) still passes; no new colour was added.
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
    no card she is playing changes, except the `sameauthor` tick (Hanna's decision above).
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

Written by the UX designer, 2026-11-21. New choices are 12–18 under *Choices made while Hanna
slept*. Language: English, as the rest of the app. No new colours, sizes or components: everything
below is existing tokens (top of `src/styles.css`) and existing classes.

## Where it lives

The bingo block (`BingoCard`), on the dashboard and on the Challenges page, only for **the card
being played this year** (`year === thisYear`). The suggestion card is a part of the bingo block,
directly **under the grid** (and on Challenges above "Full cards in …" and Share). It pushes what
is below it down; it never floats over anything, never dims the page and has no backdrop (D-0013).
At most one is open per bingo block; the dashboard's and the Challenges page's blocks each have
their own.

## The squares

| Square | Looks | Tap / Enter / Space | For a screen reader |
|---|---|---|---|
| Empty, card being played, not `three`/`fivemonth` | as today, plus the stronger frame `border-color: var(--border-strong)`; on hover (computer) `background: var(--surface-hover)` and `border-color: var(--accent-line)`; `cursor: pointer` | opens the card for this square; tapped again: closes it; another empty square: switches to it | a `<button type="button">`, name "`<label>`, suggest a book", `aria-expanded` false/true, `aria-controls` the card while it is open |
| Empty, chosen (its card is open) | `border: 1px solid var(--accent)` plus `box-shadow: 0 0 0 1px var(--accent)` (a 2 px gold frame without moving the grid), label in `--text` instead of `--muted`; background stays `--surface-sunken`, so it never looks ticked | closes the card | as above, `aria-expanded="true"` |
| `three`, `fivemonth` (empty) | exactly as today (`--border`, no hover) | nothing | as today: `role="img"`, "`<label>`. Ticks itself when a finished book fits" |
| Filled (ticked) | exactly as today | nothing | as today |
| Another year's card, full cards | exactly as today | nothing | as today |

- Focus ring on a square button: the app's own, `outline: 2px solid var(--accent); outline-offset:
  2px` (as `.btn:focus-visible`).
- Hover title (computer): "Suggest a book" on a tappable square, today's titles on the others.
- While the dashboard is being arranged, the block ignores taps as every block does today
  (`pointer-events: none`); nothing extra.
- The grid's size, gaps and text size stay as they are. A square is about 70 px on a 390 px
  phone, so each is a big enough target.

## The suggestion card

One `<section>` (`className="bingo-suggest"`, `aria-labelledby` its heading), styled with tokens
only: `background: var(--surface-sunken)`, `border: 1px solid var(--accent-line)`, `border-radius:
var(--radius-card)`, `padding: var(--space-3)`, `display: grid; gap: var(--space-3)`. The gold line
ties it to the gold-framed square above. It sits inside the block's walnut `--surface`, so it looks
the same on the lavender and the midnight wallpaper; no `--header-*` colours are used.

**Top row** (`display: flex; align-items: center; justify-content: space-between; gap:
var(--space-2)`):

- the heading: an `<h3>` with the square's label exactly as on the square (e.g. "Over 500
  pages", "A spicy read (4+ 🌶️)"), `font-family: var(--serif)`, `font-size: var(--fs-body)`,
  `font-weight: 600`, `color: var(--text)`, `margin: 0`, `tabIndex={-1}` so focus can be put on it
  (focus ring as `.waiting-card h2:focus-visible`, no ring for a plain `:focus`);
- the close button: `.btn icon small` with "×", `aria-label="Close"`; on a touch screen at least
  44×44 px (`@media (pointer: coarse)`: `min-width` and `min-height: var(--tap)`).

**With a book** (the `.next-book` / `.next-title` / `.next-actions` layout of What next?, reused):

- the cover: `<Cover book={book} />` at the normal dashboard size (5.5 rem wide), a picture only
  (`alt=""`, not a button). No cover URL: `Cover` already draws the coloured blank with the title.
- next to it, in one `aria-live="polite" aria-atomic="true"` wrapper: the title in `.next-title`
  (serif, `--fs-large`), the authors joined by ", " in `.muted` under it (left out when there are
  none). Long titles wrap (`overflow-wrap: anywhere`), never cut off.
- `.next-actions` under them:
  - **Open**: `.btn primary`, `aria-label="Open <title>"`. Calls `onShowBook(book.id)`, exactly
    like What next? and Make a wish: the book panel opens on the shelf. The suggestion card stays as
    it was (coming back to the dashboard it is closed, because the page remounts; fine).
  - **🎲 Another one**: `.btn`, the die in `<span aria-hidden>`, `aria-label="Another book for
    <label>"`. Shows the next fitting book that wasn't shown yet (choice 3); focus stays on the
    button; the live wrapper reads the new title and author. Left out when exactly one book fits.
  - both `white-space: nowrap` so they wrap as whole buttons (as `.again-card .next-actions
    .btn`); at least 44 px high on a touch screen (`.btn` already gets `min-height: var(--tap)` on
    `pointer: coarse`).

**No fit**: under the top row one line, `<p className="muted">No book on your shelf fits this one
yet.</p>`. No cover, no Open, no Another one. (An empty-block message, allowed by D-0014.)

No other text anywhere: no reason line, no "best guess" mark, no count of fitting books, no helper
sentence (D-0014, choice 4).

## Behaviour

- **Opening** (tap, Enter or Space on an empty square): the card draws a book (weighted, as the
  task says) and appears; focus moves to its heading with `focus({ preventScroll: true })`, then
  the card is scrolled into view only as far as needed (`scrollIntoView({ block: 'nearest' })`,
  smooth unless `prefers-reduced-motion: reduce`). The screen reader then reads the heading;
  Tab goes to Open, 🎲 Another one, ×, and on to the rest of the page.
- **Switching** to another empty square: the card's contents change in place to that square (new
  heading, a fresh draw), the first square loses its gold frame, focus goes to the heading again.
- **Closing**: tapping the chosen square again (focus stays on it), ×, or Escape while focus is
  anywhere in the bingo block (a `keydown` on the block, not on `window`): the card goes, focus
  returns to the chosen square. No animation needed; if one is added, it is a fade of at most
  150 ms and none with `prefers-reduced-motion`.
- **The shelf changes while it is open** (choice 18): the book shown stops fitting → another
  fitting book (or the no-fit line); the square ticks itself → the card closes (focus to the
  block's heading `#bingo-title` only if focus was inside the card); the card fills and a new card
  starts → closes.
- **Year switch on Challenges**: the block remounts per year (it is keyed by year), so the card
  closes; on another year's card nothing opens.
- Nothing is stored (no localStorage); a new visit starts with no card open.

## Phone and computer

- **Phone (390×844)**: the bingo block is the full width (about 310 px inside its padding). Under
  the grid: the card full width, cover 5.5 rem on the left, title and author on the right, the two
  buttons below them; "Open" and "🎲 Another one" sit side by side when they fit and otherwise
  wrap, Open first. The × is top right, 44×44. Nothing scrolls sideways.
- **Computer (1280×800)**: the block is one column of the two-column dashboard / Challenges page
  (about 560–600 px). Same layout; the buttons stay on one line next to each other under the
  title.
- **Lavender and midnight**: the card and the squares sit on the block's own walnut surface, so
  they look the same on both; only the block's surroundings differ. The tester checks both
  (screens in `docs/tasks/T-0017-screens/`).

## Exact wording

| Where | Text |
|---|---|
| Card heading | the square's label, unchanged from `SQUARES` |
| Main button | Open |
| Second button | 🎲 Another one |
| Close button | × (accessible name "Close") |
| No fit | No book on your shelf fits this one yet. |
| Square button, accessible name | `<label>`, suggest a book |
| Square button, hover title | Suggest a book |
| Open, accessible name | Open `<title>` |
| Another one, accessible name | Another book for `<label>` |

## Reused, not new

`Cover` (`Dashboard.tsx`), `.next-book`, `.next-title`, `.next-actions` (What next?), `.btn`,
`.btn.primary`, `.btn.icon.small`, `.muted`, the `.bingo-square` look, and the tokens
`--surface-sunken`, `--surface-hover`, `--border-strong`, `--accent`, `--accent-line`, `--text`,
`--muted`, `--fs-body`, `--fs-large`, `--space-2`, `--space-3`, `--radius-card`, `--tap`,
`--serif`. New CSS is only `.bingo-suggest` (and its top row), the tappable / chosen square states
and the 44 px × on touch screens, all with these tokens. `BingoCard` gets an `onShowBook` prop from
`Dashboard.tsx` and `ChallengesPage.tsx`.

## Build notes (developer, 2026-11-22)

- **Where it lives:** `src/lib/bingoSuggest.ts` (`suggestionPool(id, books, year, today)`: `null`
  for no reaction, `[]` for no fit, else the fitting books with their `wishWeight`;
  `drawSuggestion(pool, shown, random)`: the weighted draw that doesn't repeat until all were shown).
  Each square's test reuses the helpers now exported from `src/lib/bingo.ts` (`pagesOf`, `pubYear`,
  `authorKey`, `GENRE_SQUARES`, `hasGenre`, `notFantasy`, `hasFormat`, `longListen`,
  `inLongSeries`, `shelfFacts`); the ticks use the same functions, so they can't drift apart.
  The weighted draw in `grantWish` moved into `weightedIndex` (`src/lib/wish.ts`), used by both.
- **Same author twice tick:** `Shelf` got `before` (the year's finishes before the card started);
  `bingoYear` passes it per card, and only the `sameauthor` tick reads it. Every other tick and
  `cardSquares` are unchanged (the existing bingo tests pass untouched).
- **readNext:** leaves out `sleepReadIds`. **A–Z tips:** a want-to-read book is a tip only when it is
  in `readNextChoices`; reading, paused and DNF books as before.
- **UI:** `BingoCard` gets `onShowBook` from `Dashboard.tsx` and `ChallengesPage.tsx`; empty
  squares of this year's card (not `three`/`fivemonth`) are `<button>`s; the card is a `<section>`
  under the grid. CSS only with existing tokens; no new colour.

Choices taken while Hanna slept (the recommended option, none changes what she sees in *Design*):

19. **The × comes last in tab order.** The Done-when asks for Open → 🎲 Another one → × after the
    heading, so the × is the last element of the card in the page order and is drawn top right
    (`position: absolute`), with the heading row keeping room for it.
20. **Starting over after every book was shown** leaves out the book on screen (when there are
    others), so Another one never shows the same book twice in a row.
21. **The block heading `#bingo-title` gets `tabIndex={-1}`** so focus can go to it when the card
    closes because its square ticked (choice 18); no ring for a plain `:focus`, the gold ring for
    `:focus-visible`.

# Test

To be written by the tester.

# Log

- 2026-11-21 architect: task written from Hanna's feature chat of 2026-11-21; D-0025 records that
  every suggestion from her pile follows `readNextChoices` (series in order, no sleep reads, re-reads
  only on bingo's re-read square); all 28 bingo squares mapped; choices taken while Hanna was
  asleep are under *Choices made while Hanna slept*; group 1, no new stored fields; handed to the
  UX designer.
- 2026-11-21 ux-designer: Hanna's decision recorded: *Same author twice* counts every book she
  finished this year, on any card, for the suggestion and for the square's tick (replaces the
  architect's choice 5, with a test in *Done when*).
- 2026-11-21 ux-designer: designed (the suggestion card under the bingo grid, tappable squares,
  keyboard and screen reader, wording; choices 12–18); handed to the developer.
- 2026-11-22 developer: built the bingo suggestions (`src/lib/bingoSuggest.ts`, the card under the
  grid in `BingoCard`, on the dashboard and on Challenges), the whole-year *Same author twice* tick,
  no sleep reads in `readNextChoices`, A–Z tips for want books only from `readNextChoices`; choices
  19–21 under *Build notes*. New tests: `bingoSuggest.test.ts` (22), `bingo.test.ts` (+5 for Same
  author twice), `readNext.test.ts` (+1), `alphabet.test.ts` (+3); checked that the Same author and
  sleep-read tests fail without the change. `pnpm test`: 77 files passed, 1 skipped; 578 tests
  passed, 9 skipped. `pnpm exec tsc --noEmit`: no errors. `pnpm run build`: built.
  `pnpm exec harness check`: tasks, decisions, engineers, generated files all ✓. Clicked through on
  the no-backend dev server (shelf in the browser) at 390×844 and 1280×800 on lavender and
  midnight: 40 screens in `docs/tasks/T-0017-screens/` (grid, suggestion, Another one, no fit,
  `three`/filled square tapped, Open → book panel, Challenges, another year's card, What next?,
  Make a wish). Logged: empty squares are buttons (10), `three` and filled squares stay
  `role="img"` and tapping them opens nothing; focus lands on the card's heading; Tab goes Open →
  🎲 Another one → ×; Escape and × put focus back on the square; Another one went through all three
  500+ page books before repeating; no fit shows "No book on your shelf fits this one yet."; Open
  opened the book panel on that book; another year's card has no buttons; Open, Another one and ×
  44 px high on the phone (× 44×44); nothing scrolls sideways; What next? (25 picks) and Make a wish
  (6 wishes) never offered the sleep read; no page errors. Handed to the UX designer for review.
