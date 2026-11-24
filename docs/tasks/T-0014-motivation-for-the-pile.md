---
id: T-0014
title: "Motivate reading from the pile: in vs. out, two coin jars, dust off the oldest and a pile challenge button"
description: "The want-to-read block shows this month's books in vs. out with a 6-month line and two coin jars (buying and Storytel), Waiting for you offers the longest-waiting book once a week, and Challenges gets a Pile challenge button."
status: Done
depends_on: []
decisions: [D-0008, D-0010, D-0013, D-0014, D-0020, D-0022]
raised_on: 2026-11-21
done_on: 2026-11-21
result: ["https://github.com/SanderGeraedts/Hanna-s-Reading-List/pull/222"]
---

# Goal

From a feature chat with Hanna (2026-11-21). She wants more motivation to read the books she
already has. One task, four parts, everything worked out from the books on the shelf (no new
stored fields, nothing on the server), so her phone and computer always agree.

1. **Pile in vs. out** in the existing "Want-to-read pile" block on the dashboard: for this month
   "You added 3 and read 5 from your pile: your pile shrank by 2 🎉" (or "grew by 2", or "stayed
   the same"), and a small line (sparkline) of the net change per month over the last 6 months
   (this month included).
   - Counts **all** books, Storytel included.
   - **In** = books added that month (`addedAt`).
   - **Out** = finishes that month (`finished` dates) of a book that had been on the shelf at least
     14 days before that finish ("from your pile"). A re-read counts again by the same rule.
     Books without a noted finish day don't count.
   - Net change = in − out.
2. **Two jars** in the same block, worked out by walking the events (adds and finishes) in date
   order from **2026-11-01**, so she starts with this month's coins.
   - 📚 **Buying jar**:
     - Each finish from the pile (same 14-day rule as Out) of a book she owns on paper or as an
       e-book earns one 🪙. "Owns" means `formatsOf(book)` contains `paperback`, `hardcover` or
       `ebook`. Library, borrowed, audiobook and Storytel don't count as owned.
     - With 3 coins or more it shows "Treat earned! 🎁".
     - Adding a book she owns (same three formats) spends 3 coins automatically when there are at
       least 3; with fewer, nothing happens (never below 0).
     - Library and borrowed books never touch this jar.
   - 🎧 **Storytel jar**: a score only. Each finish from the pile of a Storytel book she only
     listens to (`storytel` in its formats and none of `paperback`, `hardcover`, `ebook`) adds one
     coin. It never spends.
   - A book with both a paper or e-book copy and Storytel counts for the buying jar only (D-0010:
     a book stands in one place).
3. **Dust off the oldest** under "Waiting for you" on the dashboard, next to the monthly wrap-up
   item and wired the same way:
   - Once a week, the want-to-read book that has waited longest (oldest `addedAt`) among the
     books she can start now (`readNextChoices`: no book 3 before book 2, nothing not out yet).
   - Shows its cover and "Has waited 2 years — give it a go?" (the wait in years, months or weeks,
     whichever fits).
   - **Maybe** opens the book (`onShowBook`).
   - **Not now** hides it for the rest of that week, remembered on this device in localStorage.
     The next week the oldest book not yet dismissed gets its turn.
   - When no book qualifies, the item doesn't show.
4. **Pile challenge button** on the Challenges page, with her own challenges (#177):
   "📚 Pile challenge" opens the new-challenge form filled in with name "Pile challenge", rule
   "From my pile", target 12, this year. She can change anything, the number too, before saving.
   Nothing is saved until she saves.

Also agreed with Hanna:

- no separate pile-goal block;
- no spending coins by hand;
- no dust-off wish in Make a wish.

# Done when

- Unit tests next to the new `src/lib` logic pass, covering:
  - in and out per month: the 14-day rule (a book finished 13 days after adding is not "out", one
    finished after 14 days is), a re-read, a book with no finish day, the shrank / grew / stayed
    the same result, and the 6-month net-change series;
  - the buying jar walk: earns for paperback, hardcover and e-book finishes from the pile; shows
    a treat at 3 coins; adding a paperback, hardcover or e-book spends 3 only when there are at
    least 3; library and borrowed books never earn or spend; nothing before 2026-11-01 counts;
  - the Storytel jar walk: earns for listen-only Storytel finishes from the pile, never spends
    (also not when owned books are added), and a book with paper and Storytel counts for the
    buying jar only;
  - the weekly oldest pick: the oldest choice from `readNextChoices` (a blocked series book or a
    book not out yet is skipped), the same book all week, and after "Not now" the next week's
    pick is the oldest one not yet dismissed.
- Clicked through on a local dev server with no backend (`pnpm run dev`, the shelf in the browser,
  never the production `POCKETBASE_URL`), with screenshots at 390×844 and 1280×800 of:
  - the pile block (in vs. out sentence, sparkline, both jars, a "Treat earned! 🎁" state);
  - the dust-off item under Waiting for you (Maybe opens the book; Not now hides it);
  - the Pile challenge form, filled in with "Pile challenge", "From my pile", 12 and this year.
- What Hanna sees matches *Design*, checked on both wallpapers (lavender and midnight) at 390×844
  and 1280×800:
  - the pile sentence has the right words for shrank (with 🎉), grew, stayed the same and
    nothing this month;
  - the 6-month line shows a signed number at each point and the month names, with this month
    as a filled dot;
  - the buying jar shows empty slots and "0 of 3" … "2 of 3", and "Treat earned! 🎁" on a gold
    wash at 3 or more coins; the Storytel jar shows "N coins" and never goes down;
  - the dust-off item says "Has waited … — give it a go?" in weeks, months or years (rounded
    down), doesn't show for a book that has been on the shelf less than 14 days, and a book
    without a cover shows its colour; after Not now the block hides if nothing else waits;
  - every new button is at least 44 px high on a touch screen, and the jars, the line and the
    sentence have no explanation text under them;
  - `colours.test.ts` checks `--text` on `--accent-soft` over a card, on both wallpapers.
- `pnpm test`, `pnpm run build` and `pnpm exec harness check` pass.

# Notes

- Group 1 (app code only): nothing for Sander. No change to how the shelf is saved or synced, no
  new `Book` fields, no server code. The only new stored thing is the dismissed dust-off books, per
  device in localStorage (like the wrap-up's `hannas-reading-list:wrapup-seen` in `Dashboard.tsx`).
- Files:
  - `src/components/DashboardExtras.tsx`: `PileCard`, which uses `wantPile` from `src/lib/insights.ts`.
  - `src/lib/library.ts`: `formatsOf`, `Book.addedAt`, `Book.finished`, `localDay`.
  - `src/lib/listening.ts`: `listenOnly` is audiobook *or* Storytel. The Storytel jar is Storytel
    only, so it needs its own check.
  - `src/lib/readNext.ts`: `readNextChoices`.
  - `src/components/WaitingCard.tsx` and `src/components/Dashboard.tsx`: the wrap-up item is the
    example for a weekly item with its own localStorage key.
  - `src/components/ChallengesPage.tsx`, `src/components/OwnChallenges.tsx`, `src/lib/ownChallenges.ts`.
- New logic goes in a new `src/lib` module with its own `*.test.ts`. Put dates and "today" in as
  parameters so the tests are deterministic.
- Definitions the team settled (reversible, so no decision record):
  - a week runs Monday to Sunday;
  - on the same day, finishes count before adds, so a coin earned that day can be spent that day;
  - a jar's coins are whole coins, shown as 🪙 per coin;
  - "this month" and the 6 months are calendar months in local time.
- The challenge rule "From my pile" in `ownChallenges.ts` means *on the shelf before that year
  began*, which is not the block's 14-day rule. That's on purpose: the button uses the existing
  rule as it is. Don't change the rule here.
- D-0013: the dust-off is a Waiting-for-you item, never a pop-up. D-0014: no explanation texts
  under the jars, the line or the item (status texts like "Treat earned! 🎁" are fine).
  D-0020/D-0022: only the design tokens; check it on both wallpapers (lavender and midnight blue).
  D-0008: if a figure ever counts pages, use the shelf's page count.
- Handover: to the UX designer first (the block, jars, sparkline and the dust-off item are new to
  look at), then the developer, who opens the draft pull request on this branch.

# Design

## Design (2026-11-21, before the build)

Only tokens from the top of `src/styles.css` (D-0020/D-0022). No helper sentences (D-0014): the
only new words are the labels, status texts and empty messages below. Everything is worked out on
the device, so there is no loading, error or offline state. Every new button is at least 44 px high
on a touch screen (`min-height: var(--tap)`, not the 36 px of `.btn.small`).

### 1. The "Want-to-read pile" block

The top stays as it is: the title, the big number "24 books waiting", the pages · listening line
(left out when it's empty) and the pace sentence. Under it come a 1 px `--border` line with
`--space-3` above and below, then three new parts in this order:

```
Want-to-read pile
24 books waiting
6,120 pages · 31 h to listen
At your pace of 4 a month, that's 6 months of reading.
───────────────────────────────────────────
This month you added 3 and read 5 from your
pile: your pile shrank by 2 🎉

Last 6 months
  +2
   ○          0           +1
   ╲         ○            ○
 ┄┄┄╲┄┄┄┄┄┄┄╱┄╲┄┄┄┄┄┄┄┄┄╱┄╲┄┄┄  (dashed 0 line)
     ○ −1       ○ −3        ● −2
 Jun    Jul   Aug   Sep   Oct   Nov

┌─ 📚 Buying jar ──┐ ┌─ 🎧 Storytel jar ─┐
│  🪙 🪙 ◌          │ │  🪙 🪙 🪙 🪙       │
│  2 of 3           │ │  4 coins          │
└───────────────────┘ └───────────────────┘
```

**a. The in-vs-out sentence** (`--fs-body`, `--text`, wraps freely):

| This month | Text |
| --- | --- |
| out > in | This month you added 3 and read 5 from your pile: your pile shrank by 2 🎉 |
| in > out | This month you added 5 and read 3 from your pile: your pile grew by 2. |
| in = out, both > 0 | This month you added 2 and read 2 from your pile: your pile stayed the same. |
| in = out = 0 | Nothing added or read from your pile yet this month. (`--muted`, `--fs-small`) |

- Numbers are plain digits, also 0 and 1 ("you added 0 and read 1"). 🎉 only when it shrank, and
  then no full stop.

**b. The 6-month line** (net change, in − out, per calendar month, with this month last):

- A small label above it: "Last 6 months" (`--fs-small`, `--muted`). It's an axis label, not a hint.
- Inline SVG, `width: 100%`, `max-width: 24rem`, about 5rem high, left-aligned. It looks the same
  on a phone and a computer.
- A dashed `--border-strong` line marks 0. **Up is "grew", down is "shrank".** Every point has its
  number, so it reads without colour:
  - the number goes above the point when it's 0 or more ("+2", "0") and below when it's less
    ("−3", with a real minus sign);
  - the scale is symmetric around 0 (the largest absolute value, at least 2), so a month that
    stayed the same sits on the dashed line.
- The line and the points are `--accent` (gold, the 3:1 rule for graphics). Earlier months are
  hollow rings. This month is a filled dot, a little bigger, so "now" differs by shape and not
  only by colour.
- A month label under each point: "Jun Jul Aug Sep Oct Nov" (three letters, `en-GB`). This
  month's label is `--text` and bold, the others are `--muted`. Reuse the `axis` and `grid` text
  and line styles of the Books per month chart.
- Not focusable, no hover. `role="img"` with an `aria-label`, e.g. "Pile change per month: June
  +2, July −1, August 0, September −3, October +1, November −2".

**c. The two jars**, side by side in two equal columns (`--space-3` gap), on a phone (each about
160 px wide) and on a computer. They stack only when the card is narrower than about 18rem.

- Each jar is a well: `--surface-sunken`, a 1 px `--border-strong` outline, `--radius-small`
  corners at the top and `--radius-card` at the bottom, a 4 px `--border-strong` "lid" bar across
  the top, and `--space-3` padding.
- Line 1, the name: "📚 Buying jar" / "🎧 Storytel jar" (`--fs-small`, weight 600, `--text`).
- Line 2, the coins: one 🪙 per coin (`--fs-large`). Above 6 coins it shows "🪙 × 9" instead.
  The coins are `aria-hidden`.
- Line 3, the status (`--fs-small`):

| Jar | Coins | Coins line | Status line |
| --- | --- | --- | --- |
| 📚 Buying | 0 | ◌ ◌ ◌ | 0 of 3 (`--muted`) |
| 📚 Buying | 1–2 | 🪙 ◌ ◌ / 🪙 🪙 ◌ | 1 of 3 / 2 of 3 (`--muted`) |
| 📚 Buying | 3 or more | 🪙 🪙 🪙 (more if she has more) | **Treat earned! 🎁** (`--text`, weight 600) |
| 🎧 Storytel | 0 | ◌ | 0 coins (`--muted`) |
| 🎧 Storytel | 1 or more | 🪙 per coin | 1 coin / 4 coins (`--muted`) |

- ◌ is an empty slot: a dashed `--border-strong` circle the size of a coin, so full and empty
  differ by shape. The buying jar always shows 3 places. The Storytel jar has no target, so it
  shows only its coins, plus one empty slot at 0.
- **Treat earned:** the buying jar's well turns `--accent-soft`, with an `--accent-line` outline
  and lid. Add the pair "`--text` on `--accent-soft` over a card" to `colours.test.ts` for both
  wallpapers.
- Each jar is a `role="group"` with an `aria-label`: "Buying jar: 2 of 3 coins", "Buying jar: 4
  coins, treat earned", "Storytel jar: 4 coins". There's nothing to tap and no tab stop.

**States of the block**

- **Empty pile:** "0 books waiting" with no pages line. The sentence, the line and the jars still
  show, because reading the last book on the pile is worth seeing ("…your pile shrank by 2 🎉").
- **Nothing added or read this month:** "Nothing added or read from your pile yet this month."
  This month's point is a 0 on the dashed line.
- **A new shelf with no history:** six 0 points on the dashed line, and both jars at 0.
- **Jars at 0:** ◌ ◌ ◌ "0 of 3" and ◌ "0 coins", as in the table.

### 2. Dust off the oldest, under "Waiting for you"

The item comes straight after the wrap-up item and before the new badges. It's laid out like a
book to rate:

```
Waiting for you
[cover]  The Name of the Wind · Patrick Rothfuss
         Has waited 2 years — give it a go?
         ( Maybe )  ( Not now )
```

- **Cover:** the small cover (`Cover small`) in a `cover-btn` with `aria-label="Open {title}"`
  that opens the book. The button is at least 44 × 44 px, with the cover centred in it.
  **No cover:** a blank cover in the book's own colour, as everywhere else (`Cover` already does
  this).
- **Line 1:** **{title}** in bold, then " · {authors}" (`--muted`, `--fs-small`), as in Part of a
  series?. A long title wraps.
- **Line 2:** "Has waited {time} — give it a go?" (`--fs-body`, `--text`). The time runs from
  `addedAt` to today, rounded down:
  - under 1 month: "2 weeks", "3 weeks" (whole weeks);
  - 1 to 11 months: "1 month", "5 months" (whole calendar months);
  - 12 months or more: "1 year", "2 years" (whole years, so 2 years and 7 months is "2 years").
- **Buttons** (`chips`; both `btn small`, at least 44 px high on touch):
  - **Maybe** (`primary`, gold), `aria-label="Maybe, open {title}"`: opens the book panel. The
    item stays until she taps Not now or the book is no longer a want-to-read choice. If she
    starts the book, the item is gone until next Monday.
  - **Not now** (secondary), `aria-label="Not now: {title}"`: the item disappears at once and
    stays away on this device for the rest of the week (Monday to Sunday). Focus moves to the
    "Waiting for you" heading (`tabIndex={-1}`) so it isn't lost. Next Monday, the oldest choice
    she hasn't dismissed gets its turn.
- **When the item doesn't show:**
  - there's no want-to-read book she can start now;
  - the oldest one has been on the shelf less than 14 days (the same 14 days as "from your pile");
  - she tapped Not now this week.

  If nothing else is waiting, the block then hides as it does now: the dashboard's "nothing
  waiting" check must include this item.
- No new heading, icon or explanation.

### 3. "📚 Pile challenge" on the Challenges page

- The button sits in the bar above the blocks, after "＋ New challenge" and before "⠿ Arrange":
  `( ＋ New challenge ) ( 📚 Pile challenge ) ( ⠿ Arrange )`. Same `btn small`, solid walnut like
  the others, at least 44 px high on touch. On a phone the bar wraps.
- It shows only when the year shown is this year (like New challenge), and it's disabled while a
  form is open. The 📚 is `aria-hidden`, so the button's name is "Pile challenge".
- Tapping it opens the same form as New challenge, in the same place, already filled in:

```
New challenge for 2026
Name  [Pile challenge        ]   Books [ 12 ]
What counts [ From my pile ▾ ]
Sleep reads don't count.
                         ( Cancel ) ( Save )
```

- The heading stays "New challenge for {year}" (not "Change challenge"), and Save gives it a new
  id. Focus starts in Name, as it does now. She can change anything. Cancel closes the form
  without saving; Save adds it like any of her own challenges. A second Pile challenge is allowed.

### Keyboard and screen reader

- The new buttons are native buttons in reading order: cover, Maybe, Not now; on the Challenges
  bar, New challenge, Pile challenge, Arrange. They get the same focus ring as every `.btn`.
- The sentence is plain text. The line and the jars are read through their `aria-label`s and
  aren't tab stops.

## Review after building (2026-11-21)

Looked at the code (`git diff main...HEAD -- src`) and all 20 screenshots in `T-0014-screens/`
(390×844 and 1280×800, lavender and midnight). No live run needed: every state in the design
has a screenshot or can be read straight from the code.

**What matches**

- **Pile block:** the top is unchanged; the pages line is left out when it's empty. A 1 px
  `--border` line with `--space-3` above and below, then the sentence, the line and the jars in
  that order.
- **Sentence:** word for word as in the table: "shrank by 4 🎉" with no full stop, "grew by N.",
  "stayed the same.", and "Nothing added or read from your pile yet this month." in `--muted`,
  `--fs-small` (`pile-390-nothing.jpg`). Plain digits throughout.
- **6-month line:** "Last 6 months" label; a dashed `--border-strong` 0 line; up is grew; a
  symmetric scale (largest absolute value, at least 2), so 0 sits on the dashed line. Numbers
  above the point at 0 or more and below when negative, with a real minus sign. Gold line, hollow
  rings for earlier months and a bigger filled dot for this month. Three-letter month names, with
  this month bold in `--text`. Axis text uses the Books per month chart's 9 px `--muted` style.
  `role="img"` with the full `aria-label`, no tab stop.
- **Jars:** two equal columns at both widths, and they stack only below about 18rem (`minmax(8.6rem, 1fr)`).
  - The well: `--surface-sunken`, a `--border-strong` outline and 4 px lid, small corners at
    the top and card corners at the bottom.
  - Buying jar: dashed empty slots and "0 of 3" / "2 of 3". At 3 or more coins: "Treat earned!
    🎁" in weight 600 on the `--accent-soft` wash with an `--accent-line` outline and lid. 4
    coins show 4 🪙 and no slots; above 6 it shows "🪙 × N".
  - Storytel jar: one empty slot and "0 coins" at 0, then "1 coin" / "N coins".
  - Coins are `aria-hidden`. Each jar is a `role="group"` with the labels from the design, and
    neither has a tab stop.
  - Both wallpapers look right, and `colours.test.ts` has `--text` on `--accent-soft` over a
    card for lavender and midnight.
- **Dust-off item:** after the wrap-up and before the badges.
  - The cover sits in a 44 × 44 px `cover-btn` labelled "Open {title}". A book with no cover
    shows its own colour (The Name of the Wind).
  - Line 1 is the bold title with " · author" in `--muted`. Line 2 is "Has waited 2 years — give
    it a go?" in body text, rounded down to weeks, months or years.
  - **Maybe** (gold) opens the book panel (`dustoff-maybe-*.jpg`). **Not now** moves focus to
    the "Waiting for you" heading and hides the item.
  - Once nothing else waited, the whole block hid (`dustoff-notnow-*.jpg`), because the
    "nothing waiting" check includes the item.
  - The item doesn't show under 14 days on the shelf, after Not now, or once the book is
    started. All the aria-labels are as designed.
- **Pile challenge:** sits between "＋ New challenge" and "⠿ Arrange", in the same walnut
  `btn small` style. It shows only for this year and is disabled while the form is open; the 📚
  is `aria-hidden`. It opens "New challenge for 2026" filled in with Pile challenge / 12 / From
  my pile, focus starts in Name, and Save adds a new challenge. On a phone the bar wraps whole
  buttons.
- **Touch size:** the new buttons get `min-height: var(--tap)` on a coarse pointer. The
  developer measured 44 px.

**Differences**

1. On a 390 px phone the sparkline's numbers draw at about 10 px and the month names at about
   9 px. That's small, but it's the same axis style as the Books per month chart, which the
   design asked to reuse. Not blocking.
2. At 1280 px the Challenges bar sits in the middle, not at the right edge. That was already so
   on `main` (the bar is a grid item with `margin: 0 auto`), so this task didn't cause it. Not
   blocking.
3. The developer added a few things the design didn't ask for: "＋ New challenge" and "⠿
   Arrange" are 44 px on touch too, so the bar stays even, and the bar now wraps whole buttons.
   Both fit the design. Not blocking.
4. `ownChallenges.ts` has `newChallengeId =()` with a missing space. It's code style that no one
   sees, not a design issue. Not blocking; the developer can tidy it up if they touch the file
   again.

**Verdict:** matches the design. Nothing must be fixed. On to the tester.

# Test

Tester, 2026-11-21, on `t-0014-pile-motivation` at `c37d6a1`, after `pnpm install --frozen-lockfile`.

## Checks as run

- `pnpm test` → `Test Files 71 passed | 1 skipped (72)`, `Tests 477 passed | 9 skipped (486)`
  (`src/lib/pile.test.ts` 19 tests, `ownChallenges.test.ts` and `colours.test.ts` with the
  `--text` on `--accent-soft` pair for lavender and midnight included).
- `pnpm run build` → `✓ built in 825ms` (client) and `✓ built in 661ms` (server), exit 0.
  `src/routeTree.gen.ts` restored afterwards, not committed.
- `pnpm exec harness check` → `✓ tasks: 14 tasks, index in step`, `✓ decisions: 25 records,
  index complete, 3 overrules valid`, `✓ engineers: 2 listed`, `✓ generated files: current`.
- Extra unit checks of my own against `src/lib/pile.ts` (a temporary test file, deleted
  afterwards, not committed): 13 passed (13). They are the logic cases in the list below.
- Click-through on `vite dev --port 3126 --strictPort` with no backend (no `POCKETBASE_URL`
  set, checked by name only), shelves seeded into localStorage `hannas-reading-list:v1`,
  Chrome through playwright-core at 390×844 (touch) and 1280×800, lavender and midnight. No
  page errors. The dev server was stopped afterwards.

## What I tried to break

Logic (my unit checks, all as the task says):

- A book added 13 days before its finish is not "out" and earns nothing; 14 days is out and
  earns 1 coin. A book added at 23:00 and finished 13 calendar days later doesn't count.
- A book added and finished on the same day: in +1, out 0, "…your pile grew by 1."
- On the same day 3 coins are earned first, then an owned add spends them → 0.
- 1 or 2 coins: adding a paperback or e-book spends nothing, never below 0, and later earnings
  go on from there (1 → 2).
- Library and borrowed finishes earn nothing, library and borrowed adds spend nothing, and
  audiobook finishes earn nothing.
- Paper + Storytel counts for the buying jar only; listen-only Storytel books (also an old one
  with only a `storytelId`) fill the Storytel jar; adding owned books and a Storytel book never
  lowers it.
- Finishes before 2026-11-01 and after today don't count.
- Empty shelf: six 0 months, both jars 0, no dust-off book, the "Nothing added…" sentence.
- The 6 months across a year boundary (Sep 2025 … Feb 2026).
- Dust-off rotation:
  - Sunday 2026-11-22 belongs to the week of Monday 2026-11-16.
  - An even older book imported mid-week doesn't change the week's pick, and gets its turn
    the next Monday.
  - After Not now nothing shows for the rest of that week; the next week brings the next
    oldest not dismissed, and the week after that the one after.
- Book 3 of a series (the oldest on the shelf) whose book 2 is unread is never picked; a
  standalone is. A book not out yet is never picked. 13 days on the shelf: no item; 14 days:
  the item shows.
- "Has waited" text: 2 weeks, 4 weeks (one day short of a month), 1 month, 11 months,
  2 years (for 2 years 7 months), and 31 Jan → 1 Mar is 1 month.

In the browser (390×844 and 1280×800, both wallpapers):

- **Edge shelf:** exactly 13 and 14 days, a same-day add and finish, owned adds with 1 and
  2 coins, library and borrowed books, paper + Storytel, two Storytel-only books, a series
  with book 3 older than an unread book 2, and a book not out yet.
  - The sentence was "This month you added 6 and read 6 from your pile: your pile stayed the
    same." (counted by hand: 6 in, 6 out).
  - Line: "Pile change per month: June 0, July 0, August 0, September 0, October 0,
    November 0".
  - Jars: "Buying jar: 2 of 3 coins" (🪙 🪙 ◌) and "Storytel jar: 2 coins".
  - The dust-off item was "Standalone Old · Old Writer / Has waited 3 years — give it a go?"
    (not Saga 3, not the book that isn't out yet).
- **Maybe** opened the book panel, and the item was still there afterwards. **Not now**
  hid it and stored `{"week":"2026-11-16","pick":"b14","dismissed":["b14"]}`; after a reload
  in the same week it stayed hidden.
  - With a book to rate also waiting, the block stayed and focus moved to `waiting-title`.
  - With nothing else waiting, the whole block hid.
- **The next week:** a dismissal stored for the week of 2026-11-09 → this week's item was
  "Saga 2 … Has waited 2 years" (Saga 2 is a choice now that book 1 is read; Standalone Old
  stayed dismissed). A pick stored for last week but not dismissed → recomputed and stored
  for 2026-11-16. Broken JSON in the dust-off key → the dashboard loads and the item shows.
- **Treat:** 3 earned, an owned paperback added the same day (spent 3), then 4 more →
  "Buying jar: 4 coins, treat earned", 4 🪙, on the gold wash (`rgba(217, 168, 91, 0.18)`).
  7 coins in each jar → "🪙 × 7", and the Storytel jar showed "7 coins".
- **Empty pile** (the last two books read this month): "0 books waiting", "…added 0 and
  read 2 from your pile: your pile shrank by 2 🎉", November −2, buying "2 of 3", no
  dust-off item, no Waiting for you block.
- **New shelf (no books):** "Nothing added or read from your pile yet this month." (muted),
  six 0 points with November filled, ◌ ◌ ◌ "0 of 3" and ◌ "0 coins".
- **A book added 11 days ago:** "…grew by 1.", and no dust-off item.
- **Pile challenge:** it opened "New challenge for 2026 | Pile challenge | 12 | From my
  pile", with focus in Name and the button disabled while the form is open. Nothing was stored
  before Save, and still nothing after Cancel. Two Saves (one changed to 20) gave two
  challenges with different ids.
- **Touch sizes at 390:** Maybe 44 px, Not now 44 px, cover button 53 px, Pile challenge
  44 px. At 1280 without touch they keep the normal small size (25–27 px), as designed.

Observation, not blocking: when Not now hides the whole Waiting for you block (nothing else
waiting), focus falls back to the page body, because the heading it moves to disappears too.
The design accepts that the block hides; the UX designer may want to choose where focus goes
then, in a later task.

**Verdict: passed.** Everything in *Done when* ran and holds; nothing remains for a human.

# Log

- 2026-11-21 architect: task written
- 2026-11-21 ux-designer: designed
- 2026-11-21 requester: Hanna confirmed the design, including the 14-day rule for the dust-off book
- 2026-11-21 developer: built in draft pull request #222. New `src/lib/pile.ts` (in vs. out per
  month, the 6-month series and sentence, the two jar walk from 2026-11-01, the weekly dust-off
  pick with its per-device state, the "Has waited …" text) with `src/lib/pile.test.ts` (19
  tests); `PileCard` gets the sentence, the line and the jars; Waiting for you gets the dust-off
  item (key `hannas-reading-list:dust-off`: the week, its pick and the books she said Not now
  to), included in the dashboard's "nothing waiting" check; Challenges gets "📚 Pile challenge"
  (`PILE_CHALLENGE` in `ownChallenges.ts`, tested), which opens the new-challenge form filled
  in; `colours.test.ts` checks `--text` on `--accent-soft` over a card on both wallpapers.
  Check: `pnpm test` → "Test Files 71 passed | 1 skipped (72), Tests 477 passed | 9 skipped
  (486)"; `pnpm run build` → "✓ built"; `pnpm exec harness check` → tasks, decisions, engineers
  and generated files all ✓. Clicked through on `vite dev --port 3124` with no backend and a
  seeded shelf, screenshots in `T-0014-screens/` (390×844 and 1280×800, lavender and midnight):
  sentence "This month you added 2 and read 6 from your pile: your pile shrank by 4 🎉", line
  "June +2, July −1, August 0, September −3, October +1, November −4", jars "Buying jar: 4
  coins, treat earned | Storytel jar: 2 coins", plus "2 of 3" / "0 coins" and the "Nothing
  added or read from your pile yet this month." state; dust-off "Has waited 2 years — give it a
  go?" on a book with no cover (its colour), Maybe opened the book panel, Not now hid it and the
  block hid once nothing else waited; the Pile challenge form showed "New challenge for 2026 |
  Pile challenge | 12 | From my pile", the button disabled while the form is open. Maybe and
  Pile challenge measured 44 px high with a touch screen. Small additions beyond the design: the
  pages · listening line is now left out when it's empty (the design's "left out when it's
  empty"; before, an empty line was drawn), "＋ New challenge" and "⠿ Arrange" are 44 px high on
  touch too so the bar stays even, and the Challenges bar wraps whole buttons instead of the
  words in them. Noted for the architect: in `colours.test.ts` the `token()` pattern is a
  template string, so `\s*` reaches the RegExp as `s*`; it still works only because the value is
  trimmed afterwards.
- 2026-11-21 ux-designer: reviewed: matches the design, nothing to fix (small sparkline labels
  and the centred Challenges bar from `main` noted, not blocking); on to the tester
- 2026-11-21 tester: passed (477 tests, build, harness check, own edge-case checks and click-through on a local dev server with no backend; see *Test*)
