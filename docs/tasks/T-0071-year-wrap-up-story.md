---
id: T-0071
title: "Make the year wrap-up a full-screen story she can play any time, ending in a shareable picture"
description: "Year in review becomes a ▶ Play block on the dashboard and the Stats page that opens a full-screen tap-through story for the chosen year — books, top book, top author, top genre, longest book, busiest month, pages, hours listened, new authors and her map — ending in a summary slide she can share as a picture."
status: Open
size: full
depends_on: [T-0070]
decisions: [D-0013, D-0014, D-0020, D-0061]
raised_on: 2026-11-23
done_on: ""
result: []
---

# Goal

The backlog item *Year wrap-up story (ST2)*, agreed with Hanna on 22 November 2026.

She can play her year whenever she likes — this year so far, or any past year — as full-screen
slides she taps through, one fact at a time, ending in a summary picture she can send to friends.
The entry point is the *Year in review* block, which becomes `▶ Play` and sits on both the
dashboard and the Stats page. It opens only when she taps it (D-0013). The monthly wrap-up stays
exactly as it is.

# Done when

- `pnpm test`, `pnpm run build` and `pnpm exec harness check` pass, with the output in *Test*.
- The *Year in review* block shows the year, the headline numbers and a `▶ Play` button, on the
  dashboard and on the Stats page, and nothing opens until that button is pressed.
- Pressing it opens a full-screen story for that year: one slide per fact, a progress indicator,
  forward on a tap anywhere (or `→`, `Space`, `Enter`), back with `←` and a *Back* control, closed
  by `Escape`, the `×` and the backdrop.
- The last slide is a summary with a `Share` button that draws a picture through the existing
  `shareImage` code (shared on a phone, downloaded elsewhere).
- `src/lib/yearStory.test.ts` proves: a year with books produces the expected slides in order; a
  slide with no data is left out; a year with **no** books produces a story that says so and still
  ends in the summary slide; a past year and the current year end on their own closing line.
- Keyboard only, from the block to the last slide and back out, works and is covered in *Test*;
  focus returns to the `▶ Play` button on close.
- The screenshots in *Design* exist under `docs/tasks/T-0071-screens/`.
- Added by the UX designer: a year with no finished books has no ▶ Play button; the last slide does
  not advance on a tap; and the story is closed by Escape, by × and by the backdrop, with focus
  back on ▶ Play.

# Notes

- Files: a new `src/lib/yearStory.ts` and `src/lib/yearStory.test.ts`, a new
  `src/components/YearStory.tsx`, `src/components/DashboardMore.tsx` (`WrappedCard` becomes the
  play block), `src/components/Dashboard.tsx`, `src/components/StatsPage.tsx`, `src/styles.css`.
- Reuse: `yearReview` and `favouriteAuthors` (`src/lib/insightsMore.ts`), `periodStats`
  (`src/lib/stats.ts`), `monthlyCounts` and `breakdown` (`src/lib/insights.ts`), `worldMap` with
  `MAP_COUNTRY_SET` (`src/lib/places.ts`, `src/lib/mapCountries.ts`), `ShareSpec` and
  `shareChallenge` (`src/lib/shareImage.ts`), `ShareButton`.
- The block id stays `wrapped`, so a saved layout or a star that names it keeps working (D-0061).
- Nothing is saved: the slide she is on lives only while the story is open.
- Sister task: T-0070 (the Stats page), built on the same branch.

# Design

## The block

*Year in review* keeps its name, its id and its place, and becomes short:

```
✨ 2026 in books                         [2026 ▾]
48 books · 14,218 pages · 36 hours listened
              ▶ Play
```

- On the **dashboard** it keeps its own year select (the block stands alone there).
- On the **Stats page** it has no select: it plays the year the page's picker says, and its heading
  reads `✨ 2024 in books`.
- With no books in that year: `No books finished in 2026 yet.` and no `▶ Play` button — there is
  nothing to play. (A year with books but no page counts still plays.)
- `▶ Play` is `.btn primary`, labelled `Play your 2026 in books`. Nothing opens until she presses
  it (D-0061, D-0013).

## The story

Full screen over everything, `role="dialog" aria-modal="true"`, labelled by the slide's heading.
Dark walnut (`--surface-solid`) with the gold accent, like the monthly wrap-up sheet, so it feels
part of the app and not a web page from elsewhere.

Each slide is one fact, centred, big:

| # | Slide | Reads |
|---|-------|-------|
| 1 | Opening | `2026` · `Once upon a time…` |
| 2 | Books | `48` · `books finished` |
| 3 | Top book | the cover · `Book of the year` · title · stars |
| 4 | Top author | `Freya Marske` · `4 books` |
| 5 | Top genre | `Fantasy` · `19 books` |
| 6 | Longest book | the cover · `Longest read` · title · `704 pages` |
| 7 | Busiest month | `July` · `8 books` |
| 8 | Pages | `14,218` · `pages turned` |
| 9 | Hours listened | `36` · `hours listened` |
| 10 | New authors | `11` · `authors new to you` |
| 11 | Her map | `14` · `countries visited` and the places, most books first, at most eight |
| 12 | Summary | everything that was in the story, as a list, with `Share` |

- **A slide with no data is left out**: no audiobooks, no hours slide; no rated book, no top book;
  no places, no map slide. The opening and the summary are always there.
- **A year with no books** is never reached from the block (no `▶ Play`), but if it is played from
  a link it shows one slide: `2026` · `No books finished yet. The year's story starts with the
  first one.` and then the summary.
- The last slide ends with the closing line: `…and she read happily ever after.` for a past year,
  `…and the story continues.` for this one — the same two lines the old card used.

## Moving through it

- **Tap or click anywhere** on the slide: forward. The controls are not traps: `×` closes, `‹
  Back` goes back, and both stop the tap from also going forward.
- **Keyboard:** `→`, `Space`, `Enter` forward; `←`, `Backspace` back; `Escape` closes. Focus is
  put on the story when it opens and returns to `▶ Play` when it closes.
- **Progress:** a row of small bars at the top, the current one gold — `Slide 4 of 12` for a screen
  reader (`aria-label` on the row, and each slide's text in an `aria-live="polite"` region so a
  screen reader hears each new slide).
- On the **last** slide a tap does nothing but the `Share` and `Close` buttons: she should not tap
  her way out by accident.
- Nothing is timed. No slide advances by itself (D-0013); no confetti, no sound.

## The picture

The `Share` button on the summary is the existing `ShareButton` with a `ShareSpec`:

- title `2026 in books`;
- subtitle the numbers and the top facts on one line, the way the monthly wrap-up does it;
- tiles: the year's covers, newest finish first, at most twelve, three columns at 1.5 aspect
  (four columns above six books), each captioned with its title.

So it is drawn by `shareImage` exactly like the monthly wrap-up and the challenges: shared through
the phone's share sheet, downloaded on a computer, `Try again` when the browser refuses.

## Empty, long and small

- **390 px:** one slide fills the screen; a long title wraps to three lines and then ellipses; a
  cover is at most 40% of the height so the caption always fits.
- **1280 px:** the slide's content is centred in a column of at most 34 rem, so a big screen does
  not stretch one number across a metre of desk.
- Both wallpapers: the story covers them completely, so it looks the same on either.

## Screenshots

Under `docs/tasks/T-0071-screens/`:

- `block-390.jpg`, `block-1280.jpg` — the `▶ Play` block on the dashboard.
- `story-390-books.jpg`, `story-390-topbook.jpg`, `story-390-summary.jpg` — three slides on the
  phone, including the summary with `Share`.
- `story-1280-books.jpg`, `story-1280-summary.jpg` — the same on the computer.
- `story-1280-empty.jpg` — a year with nothing finished.
- `block-stats-1280.jpg` — the block on the Stats page (no year select).

# Test

Written by the tester.

# Choices made while Hanna was at work

# Log

- 2026-11-23 architect: turned backlog item ST2 into this task, size full; recorded D-0061 (a
  played full-screen story for any year, ending in a shareImage picture; the block id `wrapped`
  stays). Handed to the UX designer.
- 2026-11-23 ux-designer: designed the ▶ Play block (dashboard and Stats page) and the twelve-slide
  story with its keyboard, progress and share picture. Handed to the developer.
