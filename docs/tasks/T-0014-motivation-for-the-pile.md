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

# Test

# Log

- 2026-11-21 architect: task written
