---
id: T-0023
title: "Measure the want-to-read pile like real books, count audiobooks and e-books, and add an All · Paper · E-book · Audiobook switch"
description: "The pile's height in the Want-to-read pile block uses the thickness of real printed books instead of the 3D shelf's (D-0030): audiobooks she only listens to count as the printed book (minutes ÷ 2 pages), e-books as paperbacks, and a switch like the Genre flower's shows the height of paper books and e-books, and the total listening time of the audiobooks, each with its own everyday comparison."
status: Open
depends_on: [T-0021]
decisions: [D-0008, D-0010, D-0014, D-0020, D-0022, D-0030]
raised_on: 2026-11-22
done_on: ""
result: []
---

# Goal

Hanna asked in a feature chat (2026-11-22) why her want-to-read pile showed only 24 cm. Two
reasons: T-0021 left out the audiobooks she only listens to, and it used the 3D shelf's thickness,
which is drawn to look good, not to measure (about 3.5 cm for 300 pages, at least 1.8 cm a book).
She decided, and D-0030 (which replaces D-0029) records it:

1. The pile uses the thickness of **real books**. The 3D shelf doesn't change.
2. A book she **only listens to** counts as the printed book.
3. An **e-book** counts as a paperback with the same page count.
4. A **switch** in the block, like the "2026 / All time" switch on the Genre flower:
   **All · 📖 Paper · 📱 E-book · 🎧 Audiobook**. All, Paper and E-book show that part's height
   with its own comparison, e.g. "Your paper books would stand 7 cm: not as tall as a mug (10 cm)
   yet." It starts on **All** every time.
5. **🎧 Audiobook shows listening time, not a height** (an extra change she asked for the same
   day): the total listening time of the audiobooks on her pile, with the closest everyday
   comparison from a fixed list, e.g. "Your audiobooks are 86 h 20 min: about as long as
   listening nonstop for 3½ days." Everyday comparisons, not her own listening pace.

Today (T-0021) the **Want-to-read pile** block (`PileCard` in `src/components/DashboardExtras.tsx`)
shows: "**N** books waiting", the grey "1,234 pages · 10 h 25 min to listen" line, the height line
(`PileHeightLine`: "📚 Stacked up, your pile would be 1.62 m: about as tall as an adult (1.75 m)."
or, for a pile of only audiobooks, "🎧 Your pile is all audiobooks, so it takes up no room at
all."), the pace line, and the motivation part from T-0014. The height comes from `pileHeight` in
`src/lib/pileHeight.ts`, which adds up `bookDims(book).t` and skips listen-only books.

## 1. The thickness of one book (D-0030)

`p` is the book's page count for the pile:

- A book she **only listens to** (`listenOnly` in `src/lib/listening.ts`):
  1. `minutes ÷ 2` when it has minutes (30 pages per hour of listening);
  2. otherwise its `pages`;
  3. otherwise 280.
- **Every other book:**
  1. its `pages`;
  2. otherwise `minutes ÷ 2` when it has minutes;
  3. otherwise 280.
- Only counts above 0 are used (as in `thicknessPages`); `minutes ÷ 2` is not rounded.

Why the listen-only rule starts with minutes: for those books the app keeps `pages` equal to
`minutes` (`lengthPatch`, `linkOnFormatChange`, D-0008), so a 10-hour audiobook usually has
`pages: 600`. Taking that as printed pages would make it twice too thick.

The thickness, in millimetres, with no minimum or maximum:

| Counted as | Thickness | 300 pages | 280 pages |
|---|---|---|---|
| Paperback | `0.07 × p + 1` | 22 mm | 20.6 mm |
| Hardcover | `0.07 × p + 5` | 26 mm | 24.6 mm |

## 2. What counts where

Only want-to-read books (`status === 'want'`, the same set as `wantPile`).

- **All:** every want-to-read book, **once**. As a **hardcover** when Hardcover is among its formats
  (`formatsOf`), otherwise as a **paperback** (also e-books, audiobooks, Storytel, Other, and books
  with no format).
- **The kinds**, where a book counts in **every** kind it has:

  | Kind | Formats | Counted as |
  |---|---|---|
  | 📖 Paper | Paperback, Hardcover, From the library, Borrowed (`PHYSICAL_FORMATS`) | hardcover when it has Hardcover, otherwise paperback |
  | 📱 E-book | E-book | paperback |
  | 🎧 Audiobook | Audiobook, Storytel (also an old Storytel import with only `storytelId`) | no height: listening time (section 5) |

  In Paper and E-book a book uses the same `p` as in All. A book with only Other, or no format,
  counts in All and in no kind. The kinds can add up to more than All.

## 3. The switch

- It shows when **more than one kind** has want-to-read books. A kind with no books gets **no
  button**. With one kind or none (also: an empty pile, or a pile of only Other books) there is no
  switch, only the All line.
- Buttons in this order: **All**, **📖 Paper**, **📱 E-book**, **🎧 Audiobook**, each only when
  shown. It reuses the `.segmented` group from the Genre flower (`role="group"`, `aria-pressed`).
- It **starts on All** every time the dashboard is shown: plain component state, not saved in the
  layout, the shelf or localStorage. When the chosen kind has no books any more (the shelf
  changed), it falls back to All.
- It changes **only the height line**. "Books waiting", the pages · listening line, the pace line
  and the motivation part keep showing the whole pile.

## 4. The line

The rounding, the comparison list (a mug 10 cm … the Eiffel Tower 330 m), "about as tall as" within
10% (closest by log ratio), "taller than", "not as tall as a mug (10 cm) yet", the `en-GB` number
writing, the non-breaking spaces and the spoken units ("1.62 metres", "1 centimetre") all **stay as
in T-0021**.

| Choice | Line |
|---|---|
| All | 📚 Stacked up, your pile would be `<height>`: `<comparison>`. (as now) |
| Paper | 📖 Your paper books would stand `<height>`: `<comparison>`. |
| E-book | 📱 Your e-books would stand `<height>`: `<comparison>`. |
| Audiobook | 🎧 Your audiobooks are `<time>`: `<time comparison>`. (section 5) |

With exactly one book in that kind: "Your paper book would stand", "Your e-book would stand",
"Your audiobook is". The emoji stays `aria-hidden`. The UX designer may refine the words, keeping
the height or time, the comparison and plain language.

- **Empty pile:** no line and no switch (as now).
- **The all-audiobooks line goes away** (`ALL_AUDIOBOOKS_LINE`): a pile of only audiobooks now has
  a height, e.g. 15 audiobooks of 10 hours → "📚 Stacked up, your pile would be 33 cm: taller than
  a cat (25 cm)."

## 5. 🎧 Audiobook: listening time (D-0030)

**Which books:** every want-to-read book with Audiobook or Storytel among its formats
(`formatsOf`), listen-only or not: the same books the Audiobook kind counts.

**Minutes of one book:**

1. its `minutes` when above 0 (also for a paperback she has on Storytel: its real listening time);
2. otherwise `pages × 2` when `pages` is above 0 (30 pages an hour, the other way round);
3. otherwise 560 (280 pages × 2).

**The time** is the sum, written with `formatDuration` from `src/lib/listening.ts`, unchanged:
"86 h 20 min", "40 h", "45 min". It stays in hours and minutes however long (no days in the time
itself, like the pages · listening line two lines above); days only appear in the comparison.

**The comparison**, from this fixed list (texts exactly as here; durations written with
`formatDuration`):

| Thing | Duration | Source |
|---|---|---|
| a football match | 1 h 30 min | two halves of 45 minutes |
| the film Titanic | 3 h 14 min | runtime 194 minutes |
| a working day | 8 h | |
| the nonstop flight from Perth to London | 17 h 20 min | Qantas QF9/QF10, about 17 h 20 min scheduled |
| all eight Harry Potter films back to back | 19 h 39 min | the eight runtimes add up to 1,179 minutes |
| a whole day and night | 24 h | |
| a work week | 40 h | |

Worked out on the unrounded total, in this order:

1. one or more things **within 10%** (total ÷ thing between 0.9 and 1.1): the closest by log ratio,
   as for heights → **"about as long as <thing> (<duration>)"**;
2. otherwise, a total of **48 h or more** → **"about as long as listening nonstop for <n> days"**,
   with `n` = total in days rounded to the nearest half day, written "2", "3½", "10½" (no
   brackets);
3. otherwise, longer than at least one thing → **"longer than <thing> (<duration>)"**, the longest
   one it beats;
4. otherwise → **"not as long as a football match (1 h 30 min) yet"**.

**The line:** `🎧 Your audiobooks are <time>: <comparison>.` ("Your audiobook is" for one book),
e.g. "Your audiobooks are 86 h 20 min: about as long as listening nonstop for 3½ days."

**What a screen reader hears:** like the heights, each time is shown `aria-hidden` (with
non-breaking spaces between number and unit) and spoken through `.visually-hidden` with units in
full: "86 hours 20 minutes", "1 hour 30 minutes", "40 hours", "45 minutes", singular for 1 ("1
hour", "1 minute"). "3½ days" is heard as "3 and a half days", "½ day" never occurs (the days
rule starts at 2).

The pages · listening line keeps showing `wantPile`'s minutes as now; the Audiobook total can be
larger because it fills in books without minutes.

# Done when

- **Unit tests** in `src/lib/pileHeight.test.ts`, updated (function names are the developer's;
  heights with `toBeCloseTo`):
  - one book's thickness: a 300-page paperback is 0.022 m, a 300-page hardcover 0.026 m, a
    paperback without pages 0.0206 m (280 pages), a 300-page e-book 0.022 m;
  - listen-only: `pages: 600, minutes: 600` → 0.022 m (minutes ÷ 2, not 600 pages); only
    `minutes: 600` → 0.022 m; only `pages: 300` → 0.022 m; neither → 0.0206 m; 0 or negative
    values are ignored;
  - not listen-only: a paperback + Storytel book with `pages: 300, minutes: 720` → 0.022 m (its
    pages); an e-book + audiobook book with only `minutes: 600` → 0.022 m;
  - a book with Paperback and Hardcover counts as a hardcover; a library or borrowed book counts in
    Paper as a paperback; an old Storytel import (only `storytelId`) counts in Audiobook;
  - **a mixed shelf**: A paperback 300, B hardcover 300, C e-book 300, D Storytel-only with
    `pages: 600, minutes: 600`, E paperback + Storytel with `pages: 300, minutes: 720`, F only Other
    without pages, G a read paperback. All ≈ 0.1346 m (6 books; G left out); Paper ≈ 0.070 m (A, B,
    E); E-book ≈ 0.022 m (C); Audiobook 1,320 min (D 600 + E 720) → "22 h", about as long as a
    whole day and night (24 h); F counts in All only;
  - audiobook minutes of one book: listen-only `minutes: 600` → 600; listen-only only `pages: 300`
    → 600; paperback + Storytel `pages: 300, minutes: 720` → 720; Storytel-only with nothing →
    560; a read audiobook doesn't count;
  - the time comparison: 5,180 min → "Your audiobooks are 86 h 20 min: about as long as listening
    nonstop for 3½ days."; 1,179 → about as long as all eight Harry Potter films back to back
    (19 h 39 min); 480 → about as long as a working day (8 h); 2,400 → about as long as a work week
    (40 h); 600 → longer than a working day (8 h); 1,800 → longer than a whole day and night
    (24 h); 2,880 → listening nonstop for 2 days; 14,460 → 10 days; 60 → not as long as a football
    match (1 h 30 min) yet; one audiobook of 560 min → "Your audiobook is 9 h 20 min: longer than a
    working day (8 h)."; every list duration written with `formatDuration` as in the table, list in
    order;
  - spoken time: "86 hours 20 minutes", "1 hour 30 minutes", "40 hours", "1 minute", "3 and a half
    days";
  - read, reading, paused and did-not-finish books never count;
  - which kinds are there: the mixed shelf gives Paper, E-book and Audiobook; only paper books (plus
    an Other one) give one kind; an empty pile gives none;
  - the kind lines: Paper 0.070 → "Your paper books would stand 7 cm: not as tall as a mug (10 cm)
    yet."; one e-book → "Your e-book would stand 2 cm: not as tall as a mug (10 cm) yet.";
  - the T-0021 tests for `heightText`, `heightSpoken` and `compareHeight` (rounding, boundaries,
    ties, the list) stay and pass unchanged; the tests that expect the shelf thickness (`bookDims`)
    or a left-out listen-only book are replaced by the ones above, and `ALL_AUDIOBOOKS_LINE` and its
    tests are removed.
- **Component tests** in `src/components/PileCard.test.tsx`, updated:
  - the mixed shelf shows the switch with All, Paper, E-book and Audiobook, All pressed, and the All
    line ("… 13 cm: taller than a mug (10 cm)."); clicking each button shows that kind's line and
    sets `aria-pressed`; heard text with units in full ("13 centimetres"); 🎧 Audiobook shows "Your
    audiobooks are 22 h: about as long as a whole day and night (24 h)." with no height, heard as
    "22 hours … (24 hours)";
  - a pile of paper books only (and one Other) has no switch; a kind with no books has no button
    (paper + audiobooks only → All, Paper, Audiobook);
  - a pile of only listen-only books shows the 📚 All line with a height and no switch, and no
    "all audiobooks" text;
  - an empty pile shows no line and no switch;
  - after rendering the card again (unmount and mount) it starts on All;
  - the switch is a group named "Which part of the pile", its buttons are named "All", "Paper",
    "E-book" and "Audiobook" (emoji not in the name), and it comes right before the height line
    (after the pages · listening line); while the switch shows, the height line has
    `aria-live="polite"` and `aria-atomic="true"`, and without a switch it has no `aria-live`;
  - the times in the Audiobook line have non-breaking spaces inside ("86 h 20 min");
  - "books waiting", the pages · listening line, the pace line and the motivation part are there and
    don't change when the switch changes;
  - the T-0021 edge-case tests are updated to the new thickness (e.g. one 400-page paperback is
    29 mm → "3 cm: not as tall as a mug (10 cm) yet"; 30,000 books of 300 pages → 660 m → "660 m:
    taller than the Eiffel Tower (330 m)").
- The 3D shelf is unchanged: `bookDims` and `thicknessPages` and their tests are not touched; the
  existing tests still pass, including `src/lib/shelfLayout.test.ts` (if present),
  `src/lib/insights.test.ts`, `src/lib/dashboardLayout.test.ts` and
  `src/components/Dashboard.favourites.test.tsx`.
- Clicked through on a local dev server with no backend (`pnpm run dev`, never a production
  `POCKETBASE_URL`; shelf seeded in localStorage), screenshots at 390×844 and 1280×800 on
  **lavender and midnight** in `docs/tasks/T-0023-screens/`: a mixed pile on All and on each kind,
  a pile of only audiobooks (no switch), and an empty pile. No console errors, no horizontal scroll.
- Design checks (UX designer) added under *Design* and checked on the screenshots.
- `pnpm test`, `pnpm run build` and `pnpm exec harness check` pass; `src/routeTree.gen.ts`
  unchanged.

# Notes

- **Group 1** (app code only), nothing for Sander: no new stored field, no change to `Book`, the
  shelf or its sync (`shelfMerge.ts`, `src/server/shelf.ts`, `library.ts`), `src/server/` or
  `deploy/nas/`. No outside service, no new package. The switch is not saved anywhere.
- **Files:** `src/lib/pileHeight.ts` (replace `pileHeight` and drop `ALL_AUDIOBOOKS_LINE`; keep the
  rounding, spoken units and comparison functions), its test, `PileCard` / `PileHeightLine` in
  `src/components/DashboardExtras.tsx`, `src/components/PileCard.test.tsx`. `src/styles.css` only
  if the switch needs a small rule; reuse `.segmented` and `.dash-card-head` first.
- **Don't touch** `bookDims` in `src/lib/shelfLayout.ts` or `thicknessPages` / `lengthPatch` in
  `src/lib/listening.ts`. Use `listenOnly`, `formatsOf` and `PHYSICAL_FORMATS`.
- The constants (0.07 mm a page, 1 mm cover, 5 mm boards, 2 minutes a page, 280 pages) go in one
  place, named, with a comment pointing at D-0030.
- **D-0008** allows Hanna to treat audiobooks differently in one feature; she did, and D-0030
  records it. Everywhere else a listen-only book's minutes still count as its pages.
- **D-0010:** in All a book counts once, physical first; under the switch it counts in each kind it
  has (that is a view of the pile, not a shelf group).
- **D-0014:** no hint text: no "audiobooks count as 30 pages an hour" note in the block.
  **D-0020 / D-0022:** tokens only, readable on lavender and midnight.
- T-0021 stays Done as the record of the first version; this task changes what it built.

## Choices made by the team

Hanna decided points 1 to 4 of the goal and approved the defaults in the plan (A). The rest (B) was
open, and the team took the recommended option without asking her. The UX designer may refine the
wording and placing under *Design*.

A. Approved by Hanna:

1. The switch only shows when there is more than one kind; a kind with no books gets no button.
2. A book with several formats counts once in All (at paper thickness if it has paper), and in
   every kind it has under the switch.
3. A book with no page count and no minutes counts as 280 pages.
4. The "all audiobooks" line goes away.
5. The 3D shelf doesn't change.

B. Taken by the architect:

6. **Constants:** paperback `0.07 mm × pages + 1 mm`, hardcover `0.07 mm × pages + 5 mm`
   (Hanna's own examples: 300 pages ≈ 2.2 cm and ≈ 2.6 cm). No minimum or maximum, so a pile with
   one tiny book can show "1 cm" (the rounding's minimum).
7. **30 pages an hour is `minutes ÷ 2`**, and for a listen-only book minutes come first; its
   `pages` only count when it has no minutes, because the app keeps them equal to the minutes
   (D-0008). A listen-only book whose `pages` and `minutes` differ (it once had a paper copy) still
   uses minutes ÷ 2: one predictable rule over a guess.
8. **A book that isn't listen-only but has no pages** uses minutes ÷ 2 too, before 280.
9. **Paperback and hardcover on one book:** counted as a hardcover.
10. **From the library and Borrowed are paper** (they are in `PHYSICAL_FORMATS`), counted as
    paperbacks unless the book also has Hardcover.
11. **Audiobook and Storytel are one kind,** 🎧 Audiobook.
12. **Other / no format:** counted in All as a paperback, in no kind, and no button of its own.
13. **The kind lines:** "Your paper books / e-books would stand `<height>`: `<comparison>`." and
    "Your audiobooks are `<time>`: …", singular for one book, with the button's emoji in front; the
    All line stays "Stacked up, your pile would be …".
14. **The switch only changes the height line;** the rest of the block keeps showing the whole pile.
15. **Starts on All** on every visit and falls back to All when the chosen kind runs out; nothing is
    saved.
16. **A new decision (D-0030) replaces D-0029,** since an Accepted decision isn't edited.

C. Hanna's extra change (2026-11-22): 🎧 Audiobook shows total listening time with an everyday
comparison, not a height and not her own pace. Taken by the architect for it:

17. **Which books:** every want-to-read book with Audiobook or Storytel, listen-only or not, the
    same as the Audiobook kind.
18. **Minutes:** `minutes` first, then `pages × 2`, then 560 (280 pages), the 30-pages-an-hour rule
    the other way round.
19. **The list:** seven checkable durations, from a football match (1 h 30 min) to a work week
    (40 h), including Hanna's ideas: a flight to Australia (the nonstop Perth–London flight,
    17 h 20 min), all eight Harry Potter films (19 h 39 min) and a work week.
20. **Past two days, "listening nonstop for N days"**, rounded to the nearest half day, as in
    Hanna's example ("3½ days"), unless a list thing is within 10%. Between 44 h and 48 h it says
    "longer than a work week (40 h)".
21. **The time stays in hours and minutes** (`formatDuration`, unchanged) however long; days only
    appear in the comparison.
22. **Spoken in full:** "hours", "minutes", "3 and a half days".

D. Taken by the UX designer (2026-11-22), the recommended option without asking Hanna:

23. **The switch sits directly above the height line,** on its own row, not in the card head: it
    changes only that line, and in the head it would look as if the whole block were filtered.
24. **One small CSS rule** on a second class next to `.segmented`: `justify-self: start`, plus
    `max-width: 100%` and `flex-wrap: wrap` as a safety net on narrow phones or with large text.
    `.segmented` itself doesn't change.
25. **Emoji hidden from screen readers inside the buttons;** button names are "All", "Paper",
    "E-book", "Audiobook". The group is called "Which part of the pile".
26. **The line is announced** when it changes: `aria-live="polite"` and `aria-atomic="true"` on the
    height line, only while the switch shows.
27. **The architect's words are kept** ("would stand", "are"), and a time never splits across lines
    (non-breaking spaces inside it).

# Design

T-0021's design stays the starting point: the height line is a plain `<p>` in cream body text
(`--text`, `--fs-body`, regular, no class), with the emoji in `<span aria-hidden="true">` and each
height written twice (`aria-hidden` "1.62 m" plus `.visually-hidden` "1.62 metres"). This task adds
the switch, three new lines and one small CSS rule. No new colour, text size, spacing or corner
(D-0020), and no hint text (D-0014).

## Where the switch sits

- **Above the line, not in the card head.** The switch sits on its own row **directly above the
  height line**, between the grey "1,234 pages · 10 h 25 min to listen" line and the height line.
  The card head stays the plain "Want-to-read pile" title.

  Why: on the Genre flower and "What I read" the switch changes the whole block, so it sits next to
  the title. Here it changes **one line in the middle**. In the head it would look as if "N books
  waiting" and the pace line were filtered too. Right above the line, it is clear what it changes,
  and a screen reader reaches the line as the very next thing.
- **The block then reads:** **N** books waiting / pages · listening / **switch** / **height line** /
  pace line / motivation part. The switch is a child of the card's grid, so the space above and
  below it is the card's own gap (`--space-3`). It gets no margin of its own.
- **Without a switch** (one kind or none) the block is exactly as in T-0021: the height line follows
  the pages line directly.

## How the switch looks

- It is the existing `.segmented` group: the sunken pill (`--surface-sunken`, `--border`,
  `--radius-pill`), buttons in `--fs-small` and `--muted`, and the pressed button in gold
  (`--accent`, `--accent-ink`, semibold). It looks the same as the Genre flower's "2026 / All time".
- **Buttons, in this order, each only when that kind has books:** `All`, `📖 Paper`, `📱 E-book`,
  `🎧 Audiobook`. The emoji go in `<span aria-hidden="true">` followed by a normal space, so the
  visible label is "📖 Paper" and the button's name is "Paper".
- **All is pressed** every time the block first shows.
- **One small CSS rule**, on a second class next to `.segmented` (e.g. `pile-kinds`):
  - `justify-self: start`: a grid child would otherwise stretch the pill across the whole card;
  - `max-width: 100%` and `flex-wrap: wrap` (with `row-gap: 3px`, the pill's own padding), as a
    safety net so a narrow phone or a large text setting wraps the buttons onto a second row instead
    of pushing the card sideways.

  Nothing else is added to `src/styles.css`. The `.segmented` rules themselves don't change, so the
  other switches in the app stay as they are.

## Phone 390 and computer 1280

- **390:** the card's text area is about 332 px wide (0.75 rem dashboard padding, 1 rem card padding
  and the border on each side). The four buttons in `--fs-small` come to roughly 320 px, so the
  switch should fit **on one row**, left-aligned, with little room to spare. The developer measures
  it in the dev server; if it does wrap at 390, that is acceptable (the safety net above), but say
  so in the build notes with a screenshot. Two or three buttons always fit on one row.
- **Touch size:** on a touch screen (`pointer: coarse`) every `.segmented` button is already at
  least 44 px tall (`--tap`), so nothing needs adding. The narrowest button, "All", is about 42 px
  wide with its padding; next to its neighbours in one pill that is fine, as it is for the other
  switches.
- **1280:** the block is one dashboard column (about 33 rem); the switch takes about half the width,
  left-aligned, on one row.
- The height line wraps like normal text at both widths (T-0021): no `nowrap`, no ellipsis. No
  horizontal scroll at either width.

## The line for each choice

The rounding, the list of things, the `en-GB` numbers and the spoken units stay as in T-0021. Text
exactly as below: sentence case, a colon after the height or time, the thing's size in round
brackets, a full stop at the end. Examples are the mixed shelf of *Done when*.

| Choice | What she sees |
|---|---|
| All | 📚 Stacked up, your pile would be 13 cm: taller than a mug (10 cm). |
| Paper (several) | 📖 Your paper books would stand 7 cm: not as tall as a mug (10 cm) yet. |
| Paper (one) | 📖 Your paper book would stand 3 cm: not as tall as a mug (10 cm) yet. |
| E-book (several) | 📱 Your e-books would stand 15 cm: taller than a mug (10 cm). |
| E-book (one) | 📱 Your e-book would stand 2 cm: not as tall as a mug (10 cm) yet. |
| Audiobook (several) | 🎧 Your audiobooks are 22 h: about as long as a whole day and night (24 h). |
| Audiobook (many) | 🎧 Your audiobooks are 86 h 20 min: about as long as listening nonstop for 3½ days. |
| Audiobook (one) | 🎧 Your audiobook is 9 h 20 min: longer than a working day (8 h). |

- The architect's words are kept. "Would stand" already says it is a what-if, also for e-books.
- **Non-breaking spaces** (U+00A0): between number and unit in every height and time, **and inside a
  time** ("86 h 20 min" never splits across two lines), between "3½" and "days", and after the
  emoji. The thing's size in brackets stays with its brackets.
- The emoji are only decoration: each line reads fully without them.

## Cases

| Case | Switch | Line |
|---|---|---|
| Mixed pile (two or more kinds) | yes, only the kinds with books | the chosen kind's line; All at first |
| Only one kind (e.g. only paper books, maybe plus Other) | none | the 📚 All line |
| Only audiobooks she listens to | none | the 📚 All line with a height, e.g. "📚 Stacked up, your pile would be 33 cm: taller than a cat (25 cm)." No "all audiobooks" line any more |
| Only Other / no-format books | none | the 📚 All line |
| Empty pile | none | no line; the block shows "0 books waiting" as now |
| The chosen kind runs out (shelf changed) | the button goes; All is pressed | the All line |

If the switch itself disappears (only one kind left), the block goes back to the T-0021 layout.

## Keyboard and screen reader

- **The group:** `role="group"` with `aria-label="Which part of the pile"`. Each button has
  `aria-pressed` (`true` on the pressed one, `false` on the others) and the `active` class, as on
  the Genre flower. A screen reader says e.g. "Which part of the pile, group. All, toggle button,
  pressed."
- **Button names** are the words without emoji: "All", "Paper", "E-book", "Audiobook".
- **Keyboard:** they are ordinary buttons: Tab moves through them, Enter or Space presses. The
  browser's own focus ring stays visible (`.segmented` doesn't remove it). Pressing a button doesn't
  move focus.
- **The changed line is announced.** When the switch is shown, the height line's `<p>` gets
  `aria-live="polite"` and `aria-atomic="true"`, so after pressing "Audiobook" she hears the whole
  new sentence: "Your audiobooks are 22 hours: about as long as a whole day and night (24 hours)."
  The emoji and the `aria-hidden` short forms are skipped, the `.visually-hidden` long forms are
  read. Nothing is announced when the page first loads. Without a switch the line has no live
  region, as in T-0021. (The other switches in the app change a whole block, which would be too much
  to read out; this one changes one sentence, which is just right.)
- **What is heard, per choice:**
  - "Stacked up, your pile would be 13 centimetres: taller than a mug (10 centimetres)."
  - "Your paper books would stand 7 centimetres: not as tall as a mug (10 centimetres) yet."
  - "Your audiobooks are 86 hours 20 minutes: about as long as listening nonstop for 3 and a half
    days."
- **When the pressed button disappears** while it has focus (rare: only when the shelf changes
  while she is on the dashboard), focus may simply be lost; no special handling is needed.

## Both wallpapers

The block is a walnut card on both **lavender and midnight**, and the switch uses the same tokens as
the Genre flower's switch, which already sits on that card on both wallpapers. The line is `--text`
on `--surface` as in T-0021. No new colour pair, so `colours.test.ts` needs nothing new.

## Design checks (on the screenshots and in the dev server)

- [ ] **Place:** on a mixed pile the switch sits on its own row directly above the height line,
  under the grey pages line, left-aligned, not in the card head. The title row is only "Want-to-read
  pile".
- [ ] **Look:** the same pill as the Genre flower's switch: All pressed in gold at first, the others
  muted. Labels "All", "📖 Paper", "📱 E-book", "🎧 Audiobook", in that order, only the kinds with
  books.
- [ ] **390:** the switch is on one row (or, if it wraps, nothing is cut off and the build notes say
  so); the line wraps without cutting off, no height or time is split ("86 h 20 min", "(24 h)",
  "3½ days" stay whole); no horizontal scroll. **1280:** switch on one row, line on one or two lines.
- [ ] **Touch:** on a phone each button is at least 44 px tall.
- [ ] **Wording:** each choice's line matches the table, including the singular for one book.
- [ ] **Only listen-only books:** the 📚 All line with a height, no switch, no "all audiobooks"
  text. **Empty pile:** no switch, no line, "0 books waiting".
- [ ] **Screen reader:** the group is called "Which part of the pile"; buttons are "All", "Paper",
  "E-book", "Audiobook" with `aria-pressed`; the line is a polite live region only when the switch
  shows; units heard in full ("centimetres", "hours", "3 and a half days"); emoji not read.
- [ ] **Rest of the block:** books waiting, the pages line, the pace line and the motivation part
  don't change when the switch changes. Lavender and midnight look the same.

# Test

To be written by the tester.

# Log

- 2026-11-22 architect: task written from Hanna's feature chat (2026-11-22, "why does my pile show
  24 cm?"); D-0030 replaces D-0029: real-book thickness (paperback 0.07 mm a page + 1 mm,
  hardcover + 5 mm), listen-only books as minutes ÷ 2 pages, e-books as paperbacks, the 3D shelf
  unchanged; the All · Paper · E-book · Audiobook switch and the open details under *Choices made by
  the team*; group 1, no new stored fields. Hanna's extra change the same day added: 🎧 Audiobook
  shows total listening time with an everyday comparison (section 5, choices 17–22, in D-0030);
  handed to the UX designer.
- 2026-11-22 ux-designer: designed: the switch on its own row directly above the height line
  (`.segmented` plus one small rule), the line for each choice, screen reader (group "Which part of
  the pile", `aria-pressed`, the line a polite live region while the switch shows), the cases
  without a switch, 390 and 1280 on both wallpapers; choices 23–27; handed to the developer.
