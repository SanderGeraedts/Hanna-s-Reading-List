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

To be written by the UX designer.

# Test

To be written by the tester.

# Log

- 2026-11-23 architect: wrote CH2 as a full task; recorded D-0061 (what each of the four counts, and that only Read the series saves anything, as own challenges). Hand to the UX designer.
