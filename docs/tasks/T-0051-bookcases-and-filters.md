---
id: T-0051
title: "Give the shelf four bookcases (All · Read · To read · Digital) and one filter row for genre, rating, spice, year read, language and trope"
description: "A bar above the shelf with a four-way bookcase switch (All, Read, To read, Digital = e-books and audiobooks) and a filter row that takes over the genre filter from the header and adds minimum rating, minimum spice, year read, language and trope (D-0042); the filters combine with AND, a Clear button appears as soon as one is set, nothing is remembered, and the arrangement, the room and dragging stay exactly as they are."
status: Doing
size: full
depends_on: []
decisions: [D-0002, D-0012, D-0014, D-0020, D-0022, D-0042, D-0043, G-0019, G-0031]
raised_on: 2026-11-23
done_on: ""
result: []
---

# Goal

Requester: Hanna, in her feature chat of 22 November 2026, item 1 of `docs/backlog.md`. She asked
to continue the queue on 23 November 2026; this task, T-0052 and T-0053 are items 1, 2 and 3 and
are built together on one branch and in one pull request, because all three are the 3D shelf and
its room.

Today the shelf shows every book, in her Arrange-by order, with one filter: Genre, a `<select>`
in the header on a computer and in the ☰ menu on a phone (D-0012, #41). She wants to be able to
look at one pile at a time and to narrow it down.

**What this task delivers** (D-0043):

1. **A bar above the shelf**, between the header and the 3D stage, shown only on the Bookshelf
   view, with two rows:
   - **the bookcase switch** — `All · Read · To read · Digital`, exactly one chosen, `All` at
     the start;
   - **the filter row** — `Genre · Rating · Spice · Year read · Language · Trope`, and
     **Clear**, which is only there while at least one filter is set.
2. **Four bookcases** (D-0043 §2): All = every book; Read = `status === 'read'`; To read =
   `status === 'want'`; Digital = any book whose formats hold `ebook`, `audiobook` or
   `storytel`, whatever its status. A book can be in two bookcases; the three other statuses
   show only under All (and under Digital when digital).
3. **Six filters** (D-0043 §4), each a single choice with "any" first, each only shown when the
   whole shelf has something to offer for it:
   - **Genre** — moved out of the header toolbar and the ☰ menu with its present words and
     options (*All genres*, each genre with its count, *No genre*);
   - **Rating** — *Any rating*, ★3+, ★3.5+, ★4+, ★4.5+, ★5 (a minimum);
   - **Spice** — *Any spice*, 🌶1+ … 🌶5 (a minimum; `spice: 0`, "No spice" on purpose, passes
     no minimum);
   - **Year read** — *Any year*, then every year she has a finish day in, newest first;
   - **Language** — *Any language*, every language on the shelf with its count, and
     *No language*;
   - **Trope** — *Any trope*, every trope in use on the shelf, folded through
     `src/lib/tropes.ts` (D-0042 §3), never compared as a raw string.
4. **They combine with AND** with each other and with the bookcase; **Clear** puts every filter
   back to "any" and leaves the bookcase alone.
5. **Nothing is remembered** (D-0043 §6): no `localStorage`, no account, no URL. A reload, or
   coming back from the Dashboard, shows All with no filters.
6. **Everything else is unchanged:** her Arrange-by order, the wood, wallpaper, decorations,
   nooks, dividers, the shelf creature, zoom, panning, search, Make a wish, taking a book out.
   Dragging a filtered shelf keeps `reorderShown`'s behaviour.
7. **An empty bookcase** is drawn as an empty case with one line under the switch saying so and
   Clear beside it; the app never clears a filter or falls back to All by itself.

# Done when

**Tests (Vitest, next to the code):**

- `src/lib/shelfFilter.test.ts` (new), the pure module that owns all of it:
  - `BOOKCASES` is exactly `all`, `read`, `want`, `digital` in that order with her labels;
  - `inBookcase`: a `read` book is in All and Read; a `want` book in All and To read; a
    `reading`, `paused` and `dnf` book only in All; a book with `formats: ['storytel']`,
    `['ebook']`, `['audiobook']` in Digital whatever its status; a `paperback`-only and a
    `hardcover`-only book not in Digital; the deprecated single `format` field counts the same
    (through `formatsOf`); a book with no format at all is not in Digital;
  - minimums: `rating` 3.5 passes 3.5 and 4, not 3 and not `undefined`; `spice` 1 passes 1 and
    5, not 0 and not `undefined`;
  - `yearRead`: a book finished `2026-01-02` passes 2026 and not 2025; a book with no `finished`
    passes no year; a book finished in two years passes both;
  - `language`: `'en'` matches `language: 'en'`; the *No language* value matches a book with no
    language and nothing else;
  - `trope`: matches folded, so a book with `['Enemies to Lovers']` passes the option
    `'enemies to lovers'`; a book with no `tropes` and one with `tropes: []` behave identically;
  - `filterOptions(books)`: leaves out a filter the whole shelf has nothing for (no ratings, no
    spice, no finish day, no language, no trope); counts and order as above; the options come
    from the **whole shelf**, not from the chosen bookcase;
  - `applyFilters`: every filter set at once narrows correctly, in shelf order; `isFiltered`
    is false for an untouched state and true as soon as one filter is set; `clearFilters` resets
    the filters and keeps the bookcase; a filter whose value is no longer offered behaves as
    "any";
  - empty shelf, and a shelf of only audiobooks, give sensible options and never throw.
- `src/components/ShelfBar.test.tsx` (new): the switch renders four buttons in a `radiogroup`
  (or a group of `aria-pressed` buttons) with `All` chosen; a click calls back with the
  bookcase; the filter row shows only the filters the shelf offers; choosing one calls back;
  **Clear** is absent until a filter is set, then clears the filters and not the bookcase; the
  empty line shows when nothing matches and not otherwise.
- `src/lib/genreFilter.test.ts`: `reorderShown` keeps working unchanged, and a new case shows a
  drag on a shelf narrowed by **two** filters putting the hidden books back in their own places.
- `src/routes/index.tsx`'s count line, covered wherever the route is already tested, or by a
  small pure helper with its own test: `12 of 150 books` with the bookcase's and the filters'
  names after it, and the plain `150 books · …` line when nothing is set.
- `pnpm test`, `tsc --noEmit`, `pnpm run build` and `pnpm exec harness check` pass; CI green
  with no retries.

**Measurements** (developer runs them, tester re-runs them): `pnpm run measure:shelf` before and
after on this branch, 390 × 844 and 1280 × 800, 150 and 400 books, against the numbers in
T-0034's *Log* (390: 95 draws a frame, 23.20 MB pictures, 0.980 MB geometry, 0 behind the
Dashboard). This task should move them **not at all** — it only chooses which books are handed
to the shelf. Any change over 5 % is explained in the *Log*.

**What she sees** (screenshots in `docs/tasks/T-0051-screens/`, local dev server, no backend,
G-0019): per the UX designer's list under *Design*.

**From the design** (added by the UX designer; details under *Design*):

- The bar is the **header's bottom row**, so the measured header height still keeps the top
  shelf clear of it: at 360 × 800 and 390 × 844 with 150 books, All and no filters, the whole
  top shelf of books is visible with the bar on screen.
- The switch is the project's `.segmented` pill, `role="group"` labelled **Bookcase**, four
  buttons `All`, `Read`, `To read`, `Digital`, the chosen one `aria-pressed`; no counts in the
  buttons.
- Each filter is a visible-labelled `<select>` with the exact option words of *Design* §3, and a
  set filter's label carries `.active` (the gold ring) so she can see which are on.
- **Clear** reads `✕ Clear` with the accessible name `Clear filters`, is present only while a
  filter is set, resets the filters and not the bookcase, and moves focus to the chosen bookcase
  button.
- The count line reads `12 of 150 books · Read · ★4 and up · Enemies to lovers`: the bookcase
  (unless All), then each set filter's chosen option in row order, joined with ` · `.
- An empty result shows `No books match these filters.` (or `No books here yet.` with no filters
  set) under the row, with Clear beside it; the case is still drawn.
- The bar is not rendered on the Dashboard, Challenges, Calendar or Creatures views, so their
  header height is unchanged.
- Keyboard order: page tabs → the four bookcase buttons → Genre … Trope → Clear.

**Hanna** (keeps the task *Doing* with a `Remaining:` line until she confirms): on her own phone
the four bookcases and the filters do what she expected, and she can still find every book.

# Notes

- Read first: D-0043 (this task's decision), D-0012 (genre is a filter, and the sort keys that
  may never be removed), D-0042 (folding a trope), T-0034's *Log* (the measured shelf budget),
  D-0014 (no hint texts), D-0020/D-0022 (tokens, both wallpapers).
- Code: `src/routes/index.tsx` (`genre`, `genreChoices`, `activeGenre`, `shown`, `reorderShelf`,
  the count line in the header, `genreSelect`, the ☰ `menu-tools`, where `shown` reaches
  `SafeBookshelf`), `src/lib/genreFilter.ts` (`genreOptions`, `filterByGenre`, `reorderShown`),
  `src/lib/library.ts` (`Book`, `formatsOf`, `ReadingStatus`, `STATUS_LABELS`),
  `src/lib/languages.ts`, `src/lib/tropes.ts`, `src/styles.css` (`.sort`, `.genre-filter`,
  `.tabs`/`.tab`, the pile block's switch for the segmented pattern).
- New: `src/lib/shelfFilter.ts` (the pure module: bookcases, filters, options, counts) and
  `src/components/ShelfBar.tsx` (the bar). `filterByGenre` stays and is used by the new module,
  so nothing that already calls it breaks.
- **No code-owned path is touched**: nothing in `.github/`, `netlify*`, `deploy/nas/`,
  `src/lib/shelfMerge.ts`, `src/server/shelf.ts` or `.claude/`. No new `Book` field and no
  server change: group 1 of the guardrails.
- The bar must not eat the room the shelf has: the shelf's camera framing already works from the
  header's height (`--header-h`, `topGap`). The bar's height has to reach that same sum, or the
  top shelf ends up under it (the bug T-0003 and T-0035 fixed for the header).
- Built together with T-0052 (book poses) and T-0053 (cosy room extras) on branch
  `shelf-and-room`, one pull request, to save Netlify build minutes. Whoever merges after
  another branch runs `pnpm exec harness tasks-index` again.

## Choices made by the team

Hanna agreed the brief; these follow from D-0043 and are the architect's:

1. **Genre moves into the filter row** and leaves the header and the ☰ menu, so there is one
   place for filters. She may want it back in the header; that is one line to change.
2. **Read = finished, To read = want-to-read**, and the other three statuses live under All.
3. **Nothing is remembered**, like the genre filter today.
4. **One pure module** (`shelfFilter.ts`) owns the bookcases, the filters, the options and the
   counts, so the shelf, the count line and the tests have one source.
5. **Size: full.** It changes the first thing she sees on the shelf and adds a bar of its own.

## Questions to put to Hanna

1. "Genre has moved from the top bar into the new filter row with the others. Shall it stay
   there, or would you like it back next to Arrange by as well?"
2. "**Read** shows the books you finished and **To read** the ones waiting. Books you are
   reading now, paused, or gave up on show under **All** (and under **Digital** if you have them
   as an e-book or audiobook). Is that what you expected?"
3. "The bookcase and the filters start fresh every time you open the app. Would you rather it
   remembered the last one?"

# Design

(UX designer, before the build. No new colours, sizes or words beyond those below; tokens from
D-0020, no hint texts (D-0014).)

## 1. Where the bar lives

**The bar is the header's bottom row, not a band of its own.** `.topbar` is absolutely
positioned over the stage and its measured height (`useHeaderHeight` → `--header-h` →
`topInset` → `topGap`) is what keeps the top shelf out from under it. A separate element above
the stage would reopen exactly the bug T-0003 and T-0035 fixed. So the bar is a third flex
child of `<header class="topbar">` with `flex: 1 0 100%`, after `.brand` and `.toolbar`, and the
camera framing follows by itself.

Order down the header on a phone: brand title (with ☰) → count line → page tabs → **bookcase
switch** → **filter row**. On a computer: title + count line on the left, toolbar on the right,
and the two bar rows across the full width under both.

**Only on the Bookshelf view.** On Dashboard, Challenges, Calendar and Creatures the bar is not
rendered at all (`offShelf`), so those pages keep today's header height exactly.

## 2. The bookcase switch

```
( All )  ( Read )  ( To read )  ( Digital )
```

- The project's existing `.segmented` pill (as the Want-to-read pile's All · Paper · E-book ·
  Audiobook switch, T-0023), with `.shelf-cases` for its own width and wrapping. No new
  component and no new colours: the chosen one is `background: var(--accent)` with
  `--accent-ink` text and 600 weight, the rest `--muted` on `--surface-sunken`.
- Markup: `<div className="segmented shelf-cases" role="group" aria-label="Bookcase">` with four
  `<button>`s, the chosen one `aria-pressed="true"` and `.active`. A group of pressed buttons,
  not radios: it is what `.segmented` already is everywhere else in the app, and a screen reader
  reads "Bookcase, group" then "All, button, pressed".
- **Words:** `All`, `Read`, `To read`, `Digital` — hers, exactly. No counts in the buttons: the
  count line above already says "12 of 150 books", and four counts would make the pill wrap on
  a phone.
- Keyboard: each button is a tab stop, gold `:focus-visible` ring as everywhere. Enter or Space
  chooses. Focus stays on the button pressed.
- A tap changes the shelf **at once**, with no animation: the case rebuilds, the camera
  re-frames and scrolls back to the top row, as it already does when a genre is chosen.

## 3. The filter row

```
Genre [All genres ▾]  Rating [Any rating ▾]  Spice [Any spice ▾]
Year read [Any year ▾]  Language [Any language ▾]  Trope [Any trope ▾]   ✕ Clear
```

- Each filter is the **same `label.sort` + `select.input`** the Genre filter uses today, so it
  inherits the header's light select styling (`.topbar .input`) on both wallpapers and needs no
  new styles. The row is `.shelf-filters`: `display:flex; flex-wrap:wrap; gap: var(--space-2)`
  on a computer; on a phone (≤ 700 px) `flex-wrap: nowrap; overflow-x: auto` with a 16 px end
  padding, so it is one sideways-scrolling row rather than four stacked lines eating the shelf.
- **A select, not a popover or chips.** Six single choices; a native select is one tap on a
  phone, reads correctly to a screen reader with no extra ARIA, and is what she already knows
  from Genre and Arrange by.
- **A filter that is set** gets `.active` on its label, which is today's `.genre-filter.active`
  treatment (a gold 1 px ring on the select), so she can see at a glance which are on without
  reading the values.
- Each `<select>` keeps a visible `<span class="muted">` label (`Genre`, `Rating`, `Spice`,
  `Year read`, `Language`, `Trope`) **and** that label as its accessible name through the
  wrapping `<label>`; no `aria-label` that differs from the visible text.
- **Option words**, exactly:
  - Genre: `All genres`, `<Genre> (12)`, `No genre (3)` — unchanged from today.
  - Rating: `Any rating`, `★3 and up`, `★3½ and up`, `★4 and up`, `★4½ and up`, `★5`.
  - Spice: `Any spice`, `🌶1 and up`, `🌶2 and up`, `🌶3 and up`, `🌶4 and up`, `🌶5`.
  - Year read: `Any year`, then `2026 (31)`, `2025 (44)`, … newest first.
  - Language: `Any language`, then `English (112)`, `Dutch (36)`, … most first, then
    `No language (2)`.
  - Trope: `Any trope`, then `Enemies to lovers (14)`, … most first.
  "and up" rather than "+" because "★4+" reads as a rating of four-plus-something out loud.
- **Clear** is a `.btn.small` with `✕ Clear`, last in the row, **only present while at least one
  filter is set**. Its accessible name is `Clear filters`. Pressing it puts every select back to
  its "any" option and leaves the bookcase alone; focus moves to the bookcase switch's chosen
  button, because Clear itself disappears.
- Keyboard order: page tabs → the four bookcase buttons → Genre … Trope → Clear → (toolbar).

## 4. The count line and the empty bookcase

- **The count line** (the existing `.brand .muted`) is the one place that says what is on. With
  nothing set it is today's `150 books · 3 reading · 44 read · …`. With anything set:
  `12 of 150 books · Read · ★4 and up · Enemies to lovers` — the bookcase first (left out when
  it is All), then each set filter's chosen option in the row's order, joined with ` · `. No
  parentheses, no "filtered".
- **An empty bookcase:** the case is drawn empty (she still sees her room) and one line sits
  under the filter row, centred, in `--header-muted`: **`No books here yet.`** for an empty
  bookcase with no filters set, and **`No books match these filters.`** as soon as one is. The
  Clear button stays in the row next to it. Nothing else changes; the app never clears or falls
  back.
- On a truly empty shelf (no books at all) the existing `An empty shelf, waiting for stories`
  stays and the bar is not shown.

## 5. Both wallpapers, small screens, long text

- The bar sits on the header's haze on the shelf, so the selects use `.topbar .input`'s light
  styling and `--pill-ink`, which `colours.test.ts` already checks on lavender and midnight.
- At 390 the switch fits on one line (`All · Read · To read · Digital` at `--fs-small` is about
  280 px inside the pill); the filter row scrolls sideways. At 360 the switch may wrap to two
  lines inside the pill (`row-gap: 3px`, as `.pile-kinds` already does) — allowed.
- A very long genre or trope name is truncated by the select itself (`max-width: 11rem` on
  `.shelf-filters .input`), with the full text still read out; the count line wraps rather than
  truncating.
- The bar costs the shelf two rows of height on a phone (~76 px). That is the price of the
  feature and it is why the camera framing must come from the measured header. The top shelf
  must still be fully visible at 360 × 800 with 150 books — a screenshot checks it.

## 6. Screenshots (into `docs/tasks/T-0051-screens/`)

Local dev server, no backend, the same seeded books in every shot. Names
`<width>-<wallpaper>-<n>-<what>.jpg`.

| # | Width | Wallpaper | What |
|---|---|---|---|
| 1 | 390, 1280 | lavender, midnight | Bookshelf at rest, bar visible, All and no filters; top shelf clear of the bar |
| 2 | 390, 1280 | lavender | `Read` chosen, then `Digital` chosen, with the count line |
| 3 | 390, 1280 | lavender | Three filters set at once (Rating, Year read, Trope) with Clear present and the set labels ringed |
| 4 | 390 | lavender | The Trope select open on a phone |
| 5 | 390, 1280 | lavender | An empty result: `No books match these filters.` with Clear |
| 6 | 1280 | lavender | Keyboard focus on `To read`, and on `Clear` (gold ring) |
| 7 | 360 | lavender | 150 books, All: the switch wrapped inside the pill and the top shelf still whole |

## Review after building

(UX designer, after the build.)

# Test

(Tester.)

# Log

- 2026-11-23 architect: wrote the task from Hanna's backlog item 1 and recorded **D-0043** (four
  bookcases, one filter row above the shelf, AND, Clear, nothing remembered, genre moved out of
  the header). Took **T-0051** of T-0051–T-0053: T-0047 and T-0048 are Done, and T-0049 and
  T-0050 are left free for the `roam-around-props` branch and the den-cushion work running in
  other worktrees. Removed items 1–3 from `docs/backlog.md` and renumbered the queue. Size:
  **full**. Three questions for Hanna, none of them blocking. Handed to the **UX designer**.
- 2026-11-23 ux-designer: designed. The bar is the **header's own bottom row** (not a band above
  the stage), so the measured header height keeps the top shelf clear of it and the T-0003 /
  T-0035 bug cannot come back. The bookcase switch is the project's `.segmented` pill; the six
  filters are visible-labelled native `<select>`s in a row that scrolls sideways on a phone, a
  set one ringed in gold; `✕ Clear` appears only when something is set and leaves the bookcase
  alone. Wrote the exact option words ("★4 and up", not "★4+"), the count line's shape and the
  two empty-result lines. Seven screenshot rows. Added the design's checks to *Done when*. No new
  questions for Hanna beyond the architect's three. Handed to the **developer**.
- 2026-11-23 developer: built, with T-0052 and T-0053 on `shelf-and-room`, one pull request.
  **The module:** `src/lib/shelfFilter.ts` owns the four bookcases, the six filters, their
  options, the "a value that left the shelf counts as any" rule, Clear and the count line's
  words; `filterByGenre` stays and is called from it, so nothing that used it broke.
  **The bar:** `src/components/ShelfBar.tsx`, rendered as the header's own bottom row rather
  than a band above the stage, because the header's one measured height (`useHeaderHeight` →
  `--header-h` → `topInset`) is what keeps the top shelf clear of it.
  **Two camera fixes the bar forced** (both strictly better, both no-ops with a short header):
  (1) `frameCase` now takes the header's share of the view and steps the camera back for it,
  and the `fitsH` look-at keeps that share above the case — with a short header the formula
  reduces exactly to `FRAME.vertical` and the old look height, which the camera tests still
  pin; without it the bar covered the whole top shelf on a computer. (2) `topGap` now gets the
  real header height on a computer too, not only on a phone, so a computer **zoomed in**
  (which scrolls) keeps the top row clear of the header as well.
  **Styling:** the switch and Clear take the header's light styling (`--pill-ink` on a white
  pill), because `.segmented`'s card styling is near-invisible on the haze over the shelf; on a
  phone the bar is a full-width row of the header's grid, and each filter keeps its visible
  label, which the header otherwise hides for a `.sort` label ("Arrange by").
  **Checks:** `pnpm test` 1783 passed, 22 skipped (142 files); `tsc --noEmit` clean;
  `pnpm run build` passes; `pnpm exec harness check` all four green. New tests:
  `src/lib/shelfFilter.test.ts` (24) and `src/components/ShelfBar.test.tsx` (7).
  **Measured** (`pnpm run measure:shelf`, built app on port 3173, no `POCKETBASE_URL`, no
  `.netlify` link, headless Chrome with SwiftShader, 150/400 demo books, 3 s at rest):

  | At rest, Detailed on | 390 × 844, 150 | 390 × 844, 400 | 1280 × 800, 150 | 1280 × 800, 400 |
  |---|---|---|---|---|
  | Draw calls per frame, this branch | 90 | 84 | 941 | 2,209 |
  | Draw calls per frame, T-0034's numbers | 95 | 95 | 926 | 2,199 |
  | Picture MB | 22.59 | 21.96 | 123.66 | 251.03 |
  | Geometry MB | 0.798 | 0.830 | 5.010 | 12.685 |
  | Draw calls behind the Dashboard | 0 | 0 | 0 | 0 |

  The phone's draw calls **fell** by 5 % (95 → 90) and its picture bytes by 2.6 %: the bar
  takes 218 px of header, so two or three fewer books are in view. The computer's +15 draws a
  frame are T-0053's room extras, not this task (extras off: 926, exactly T-0034's number). So
  this task moves nothing of its own; it only shows a little less shelf.
  Screenshots: all seven rows of the design's list in `T-0051-screens/` (16 files).
  Handed to the **UX designer** for review.
