---
id: T-0091
title: "Add four ready-made challenges: around the world, seasonal, minutes a day and read the series"
description: "Four new cards on the Challenges page — 12 countries this year from the map's places, a cosy/beach/spooky target per calendar season judged by genre and trope, a month grid of days that reached 20 minutes (a paper page is 1.5 minutes, a book she only listens to its real minutes), and the series she picks to finish this year with a bar each, kept as own challenges so nothing new is saved."
status: Open
size: full
depends_on: [T-0090]
decisions: [D-0008, D-0013, D-0014, D-0017, D-0018, D-0020, D-0026, D-0037, D-0042, D-0060, D-0061]
raised_on: 2026-11-23
done_on: ""
result: []
---

# Goal

Backlog item **CH2**, agreed with Hanna on 22 November 2026: four new ready-made challenges
next to the reading goal, the monthly challenge, bingo and A–Z.

- **Around the world:** books set in 12 different countries this year (uses the places and the
  map).
- **Seasonal:** by calendar season, for example 3 cosy or spooky books in autumn, 5 beach
  reads in summer, by genre **and** by tropes (D-0042).
- **Minutes a day:** at least 20 minutes a day read or listened, as a month grid that fills
  up; paper pages count as about 1.5 minutes a page, books she only listens to their real
  minutes.
- **Read the series:** she picks series to finish this year, with progress per series.

**D-0061** settles exactly what each one counts, and that only *Read the series* saves
anything — her picks, as own challenges with a new `finishseries` rule, so no new field, no
migration and nothing for Sander.

# Done when

1. `pnpm test`, `pnpm run build` and `pnpm exec tsc --noEmit` pass, and `pnpm exec harness check`
   passes.
2. New tests in `src/lib/worldChallenge.test.ts`:
   - twelve finished books in twelve countries is complete; the same country twice counts once;
   - a book with no `places` field, a book with `places: []`, and a book whose places are all
     imaginary each count nothing;
   - a sleep read set in a new country counts nothing;
   - a book finished in another year counts nothing, and a book finished twice (once this
     year) counts once;
   - the countries come back in a stable order with the book that brought each one.
3. New tests in `src/lib/seasonChallenge.test.ts`:
   - a book finished 2026-09-01 and one finished 2026-11-30 are both **autumn**, 2026-12-01 is
     **winter**, and 2027-02-28 is winter of the 2027 card — the **season boundary** cases;
   - **29 February 2028** is winter and does not throw; **29 February 2027** (not a real day,
     from an older shelf) is ignored, not counted as winter;
   - a book matches by **genre** (`Romance`) and by **trope** (`One bed`), folded, and
     `Romantasy` does **not** match *romance*;
   - a book that matches two of a season's words counts once;
   - autumn needs 3 and summer 5: 2 of 3 is not complete, 3 of 3 is, 6 of 5 is;
   - the card's own ring counts **seasons completed** out of 4.
4. New tests in `src/lib/minutesChallenge.test.ts`:
   - a day with `readingLog` 0.5 of a 300-page paper book is 225 minutes (0.5 × 300 × 1.5) and
     counts;
   - a day with 0.1 of a 600-minute listen-only book is 60 minutes and counts;
   - a day with 0.5 of a book with neither pages nor minutes is **0** and does not count;
   - a day of exactly 20 minutes **counts** (at least 20), 19.9 does not;
   - two books on one day add up over the 20-minute line;
   - a **month boundary**: 31 January and 1 February land in their own months, and a 30-day
     month shows 30 cells, a 31-day month 31;
   - a **leap day**: February 2028 shows 29 cells, February 2027 shows 28, and reading logged
     on a 2027-02-29 that does not exist is left out of every month;
   - the ring counts days reached in the year against the days of that year that have already
     happened, so 5 of 5 on 5 January is complete and 5 of 6 on 6 January is not.
5. New tests in `src/lib/seriesChallenge.test.ts`:
   - a pick is an `OwnChallenge` with `rule: 'finishseries'`, the series key as `value` and
     the series' size as `target`;
   - progress is the books of that series finished **ever**, not only this year (she is
     finishing a series, not re-reading it), capped at the target, and the series is complete
     when every book of it on the shelf has been read;
   - **a series with one book**: `seriesGroups` gives it no key, so it is never offered; a
     saved pick whose series has shrunk to one book shows `1 of 1` only when that book is read
     and is otherwise `0 of 1`, and never throws;
   - a saved pick for a series that is no longer on the shelf at all shows `0 of <target>` with
     its saved name and can be removed;
   - picking the same series twice is refused.
6. New tests in `src/components/ReadyChallenges.test.tsx`, one per card:
   - **Around the world** shows `7 of 12 countries` and the flags/names of the countries so
     far, and `No countries yet this year.` when empty;
   - **Seasonal** shows four rows with their icons and `2 of 3`, the **current** season marked,
     and a past year's card with no current season;
   - **Minutes a day** shows a month grid with a month switch, the days reached filled, today
     outlined, and days in the future plain; the heading reads `Minutes a day`, the line under
     it `12 of 23 days · 20 min a day`;
   - **Read the series** shows a bar per picked series with `3 of 7`, **＋ Add a series** with a
     picker of the series on her shelf, and `Pick a series to finish this year.` when empty;
     a complete series shows `Done!` and its tick.
7. A new test in `src/lib/ownChallenges.test.ts`: `cleanChallenges` keeps a `finishseries`
   challenge and drops one with no `value`.
8. Each of the four cards has a ring in T-0090's row, with the right name and numbers (a test
   in `challengeRings.test.ts` covering all four), and each can be hidden and arranged like
   every other block on the page.
9. Keyboard and screen reader: each card is a `section` with a heading; the month switch is a
   `group` of buttons; the month grid's days are `role="img"` cells with a name like
   `14 March: 25 minutes, reached`; **＋ Add a series** opens a `select` with a label.
10. The UX designer has reviewed the four built cards at 390 px and 1280 px on both wallpapers
    and written the review in *Design*.

# Notes

- Files: new `src/lib/worldChallenge.ts`, `src/lib/seasonChallenge.ts`,
  `src/lib/minutesChallenge.ts`, `src/lib/seriesChallenge.ts`,
  `src/components/ReadyChallenges.tsx`; changed `src/lib/ownChallenges.ts` (the
  `finishseries` rule), `src/lib/challengeRings.ts` (four entries),
  `src/components/ChallengesPage.tsx` (four blocks, and `finishseries` kept out of the generic
  own-challenge cards), `src/styles.css`.
- Reuse, don't re-derive: `placesOf` + `MAP_COUNTRY_SET` (as `badges.ts` does for
  `countries-N`), `seasonOf`/`SEASON_LABEL`/`SEASON_ICON` from `src/lib/garden/seasons.ts`
  (already leap-day safe), `amountUnit` from `src/lib/readingLog.ts`, `foldTrope`/`tropesOf`
  from `src/lib/tropes.ts`, `seriesGroups` from `src/lib/series.ts`, `sleepReadIds` from
  `src/lib/sleepSeries.ts`.
- `MINUTES_PER_PAGE = 1.5` lives in `minutesChallenge.ts` and nowhere else (D-0061).
- The four block ids are `world`, `season`, `minutes`, `series`. They go at the end of
  `CHALLENGE_IDS` and into `DEFAULT_ORDER`; `cleanTwoColumns` already puts a block that is new
  to a saved layout in its default place, so a layout saved before them keeps working — add
  the test for that case.
- **Careful:** `series` as a block id is new, and `series` is also an existing own-challenge
  **rule** value. They never meet (one is a block id, the other a `rule`), but name the
  constants so the next reader can tell.
- No pop-ups (D-0013): the series picker is a `select` in the card, not a dialog. No hint
  texts (D-0014): the empty-state lines above are empty-block messages, which D-0014 keeps.
- Nothing is looked up for any of these (D-0017, D-0018): *Around the world* reads the places
  already on her books.
- Don't touch the page tab row: a sibling branch adds a **Stats** tab.

# Design

Written by the UX designer, 2026-11-23, before the build.

All four are ordinary `.dash-card` blocks in the page's grid, so they arrange, hide and
anchor like every other challenge. Each has the standard `.dash-card-head`: `h2`, then a
`.muted.small-text` count on the right.

## 1. Around the world — `world`

```
┌──────────────────────────────────────┐
│ Around the world      7 of 12        │
│ ████████████░░░░░░░░                 │  ← .progress-bar
│ Japan · Italy · Ireland · Mexico ·   │
│ Nigeria · Peru · United Kingdom      │
└──────────────────────────────────────┘
```

- The bar is the existing `.progress-bar` with `role="progressbar"`, `aria-valuemax={12}`.
- Under it, the countries so far as plain chips (`.chip`, `--fs-small`), in the order she first
  finished a book in each, newest last. A chip is **not** a button: tapping a country does
  nothing here, because the world map is where countries are explored and two places to tap a
  country would be two answers to the same question.
- At 1280 the chips sit on one or two lines; at 390 they wrap freely. No horizontal scroller.
- Complete: the bar is full and the count reads `12 of 12 · Done! 🎉`, matching the
  own-challenge card's existing `Done! 🎉`.
- Empty: `No countries yet this year.` (an empty-block message, which D-0014 keeps). The bar is
  still drawn, at zero, so the card is not a blank rectangle.
- Exact words: heading **Around the world**; count `7 of 12`; the word *countries* is in the
  accessible name of the bar (`Around the world: 7 of 12 countries`), not repeated in the
  count.

## 2. Seasonal — `season`

```
┌──────────────────────────────────────┐
│ Seasonal              2 of 4         │
│ 🌸 Spring   ███████░░░   3 of 3  ✓   │
│ ☀️ Summer   ████░░░░░░   2 of 5      │
│ 🍂 Autumn   ██████████   3 of 3  ✓   │  ← now: .current, gold outline
│ ❄️ Winter   ░░░░░░░░░░   0 of 3      │
└──────────────────────────────────────┘
```

- One row per season: icon + name (`SEASON_ICON`, `SEASON_LABEL`, already in the garden), a
  thin `.progress-bar`, and `3 of 3` with a `✓` when done.
- The **current** season's row has the gold outline the current month tile already uses
  (`--accent-line`), and the accessible name says `, now`. A past year has no current season.
- The head's count is **seasons completed**, `2 of 4`.
- Rows are `<li>` in a `<ul aria-label="Seasonal 2026">`, not buttons: nothing to open.
- Empty (no finishes at all): all four rows at zero. There is no separate empty state — four
  named seasons at zero say it better than a sentence.
- Exact words: heading **Seasonal**; the rows' accessible names
  `Spring: 3 of 3 romance, contemporary and coming-of-age books, done`,
  `Summer: 2 of 5 beach reads`, `Autumn: 3 of 3 cosy or spooky reads, done, now`,
  `Winter: 0 of 3 fantasy, classic and historical books`. The card itself shows only the
  season name and the numbers: the word lists would be hint text (D-0014), so they live in the
  accessible name and the `title`, where she can reach them on purpose.

## 3. Minutes a day — `minutes`

```
┌──────────────────────────────────────┐
│ Minutes a day         ‹ March ›      │
│ 12 of 23 days · 20 min a day         │
│  M  T  W  T  F  S  S                 │
│              ▓  ▓  ░  ▓              │  ← a filled cell = 20 min reached
│  ▓  ▓  ░  ▓  ▓  ▓  ▓                 │
│  ▓  ░  ░  ▣  ·  ·  ·                 │  ← ▣ today, · still to come
│  ·  ·  ·  ·  ·  ·  ·                 │
└──────────────────────────────────────┘
```

- A month grid, Monday-first, the same shape as the dashboard calendar so it is instantly
  familiar. Cells are 26 px at 390 and 30 px at 1280, `--radius-small`.
- **Filled** (`on`): the day reached 20 minutes — `--accent-soft` with an `--accent-line`
  border. **Open**: the day happened and did not reach it — `--surface-sunken`. **Future**: a
  faint dot, no box. **Today** gets the gold outline.
- The month switch is the existing `.period-pick` `‹ March ›` group, bounded by the year: it
  cannot walk out of the challenge's year.
- The second line is the count for the **year**, not the month: `12 of 23 days · 20 min a day`.
  The month grid is the picture; the ring and this line are the score, and both are the year,
  so they can never disagree with each other.
- Empty: `Nothing read yet in March.` under the grid, with the grid still drawn.
- A day's accessible name: `14 March: 25 minutes, reached` / `15 March: 8 minutes` /
  `22 March: still to come`. Cells are `role="img"`, not buttons: the calendar page is where a
  day is opened.
- Exact words: heading **Minutes a day**; `12 of 23 days · 20 min a day`; the weekday letters
  `M T W T F S S` are `aria-hidden` with the full day name in each cell's own name.

## 4. Read the series — `series`

```
┌──────────────────────────────────────┐
│ Read the series       1 of 3         │
│ The Lord of the Rings   ███  3 of 3 ✓│
│ Throne of Glass        ██░░  5 of 8  │
│ The Kane Chronicles    ░░░░  0 of 3  │
│                                      │
│ ＋ Add a series  [ pick one…   ▾ ]   │
└──────────────────────────────────────┘
```

- One row per series she picked: name, a `.progress-bar`, `5 of 8`, a `✓` when every book of it
  on her shelf is read, and a `✕` to take the series off the list (named `Remove Throne of
  Glass from the challenge`, with the same `window.confirm` the own-challenge delete uses, so a
  stray tap cannot wipe a pick).
- Tapping the series **name** opens nothing (the shelf arranged by series is where a series is
  browsed). The row is an `<li>`.
- **＋ Add a series** reveals a labelled `select` of the series on her shelf that she has not
  picked, alphabetical, plus **Add**. A series with only one book on the shelf is not in the
  list (the shelf does not treat it as a series at all). While every series is picked, the
  button is absent rather than disabled.
- The head's count is **series completed**, `1 of 3`.
- Empty: `Pick a series to finish this year.` and the **＋ Add a series** button.
- A past year: the rows show, the **＋ Add a series** button and the `✕` are gone.
- A pick whose series is no longer on the shelf shows its saved name and `0 of 7`, so she can
  see it and remove it. It is never silently dropped.
- Exact words: heading **Read the series**; `1 of 3`; button `＋ Add a series`; the select's
  label `Which series`; its first option `Pick one…`; the add button `Add`; empty line
  `Pick a series to finish this year.`

## 5. Both wallpapers, both widths

Every card is `.dash-card`, which already carries `--surface` over both wallpapers and is
checked by `colours.test.ts`. At 390 all four are one column; at 1280 they sit in the page's
two columns, and `DEFAULT_ORDER` puts **world** and **minutes** in the left column (the two
wide pictures) and **season** and **series** in the right (the two list cards), so neither
column is all lists.

## 6. Keyboard and screen reader

- Each card is a `<section aria-labelledby>` with its `h2`, so the ring row's jump lands on a
  named heading.
- Nothing in the four cards opens a dialog or steals focus (D-0013).
- The month switch is a `role="group"` named `Month` with two buttons, disabled at the year's
  edges — the same pattern as the page's year switch.
- The series picker is a `<label>` + `<select>` + `<button>`; after adding, focus moves to the
  new row's `✕` so a keyboard user knows it landed.
- The grids are made of `role="img"` cells with full names; no cell is a tab stop, so Tab does
  not have to walk 31 days.

## 7. Screenshots the developer must take

1. `world-390-lavender.jpg`, `world-1280-midnight.jpg` — part way, with chips.
2. `world-390-empty.jpg` — no countries this year.
3. `season-390-lavender.jpg`, `season-1280-midnight.jpg` — autumn current, two done.
4. `minutes-390-lavender.jpg`, `minutes-1280-midnight.jpg` — a part-filled month with today.
5. `minutes-390-february-2028.jpg` — the leap-day month, 29 cells.
6. `series-390-lavender.jpg`, `series-1280-midnight.jpg` — three picks, one done.
7. `series-390-add.jpg` — the picker open.
8. `series-390-empty.jpg` — the empty state.
9. `challenges-390-all.jpg`, `challenges-1280-all.jpg` — the whole page with all eight
   challenges and the ring row, both widths.

# Test

To be written by the tester.

# Log

- 2026-11-23 architect: wrote CH2 as a full task; recorded D-0061 (what each of the four counts, and that only Read the series saves anything, as own challenges). Hand to the UX designer.
- 2026-11-23 ux-designer: designed (the ring row and confetti, the four cards, the extra rule fields and the swap flow, each for 390 and 1280 on both wallpapers). Hand to the developer.
