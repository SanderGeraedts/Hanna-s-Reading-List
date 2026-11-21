---
id: T-0014
title: "Motivate reading from the pile: in vs. out, two coin jars, dust off the oldest and a pile challenge button"
description: "The want-to-read block shows this month's books in vs. out with a 6-month line and two coin jars (buying and Storytel), Waiting for you offers the longest-waiting book once a week, and Challenges gets a Pile challenge button."
status: Doing
depends_on: []
decisions: [D-0008, D-0010, D-0013, D-0014, D-0020, D-0022]
raised_on: 2026-11-21
done_on: ""
result: []
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

# Test

# Log

- 2026-11-21 architect: task written
- 2026-11-21 ux-designer: designed
