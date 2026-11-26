---
id: T-0100
title: "Stop a fact coming round twice, and show each reading day's fact on the calendar"
description: "The count of facts becomes max(reading days, a mark that only grows), the mark rides in the choice log as one `place` event keyed `f:seen`, it is moved on by the page rather than by the Fact of the day block, and the calendar's day panel shows the fact that reading day unlocked."
status: Doing
size: full
depends_on: []
decisions: [D-0034, D-0067, D-0079]
raised_on: 2026-11-26
done_on: ""
result: []
---

# Goal

Hanna: "make sure that I am not getting facts twice. I am pretty sure that I had the fact of
today before", and she confirmed it was a fact from further back, not yesterday's. A fact is
picked by its **position** in her reading days, so a day that goes away — a day corrected down
to nothing on the calendar (T-0045), a progress slider nudged back, a book removed or two copies
merged — pulls the whole run back a step and hands her a fact she has read. She also asked for
the fact to be on the calendar.

# Done when

- `pnpm test` passes, with new cases in `src/lib/facts.test.ts`, `src/lib/factsSeen.test.ts` and
  `src/components/CalendarPage.fact.test.tsx`.
- Taking a reading day out of the middle no longer changes today's fact once the mark is set,
  and "All my facts" keeps everything it had.
- The calendar's day panel shows the fact a reading day gave her, and nothing on a day without
  reading.
- On the preview: correct a past day down to nothing → today's fact does not change; read today
  → a fact she has not had; tap a day on the calendar → its fact.

# Notes

- `src/lib/facts.ts`: `unlockedSequence` gains `atLeast`; `factCount`, `factsUnlocked` and
  `factForDay` are new; `dailyFact` and `unlockedFacts` take the mark last, so every existing
  caller behaves exactly as before.
- `src/lib/factsSeen.ts`: the mark in the choice log, read as the **highest** `f:seen` count.
- `src/components/useFactMark.ts`: on the page (D-0079 §4), so a reading day moves the mark on
  even when the block is hidden.
- Nothing is sent to the server that it does not already take (D-0067's route), so this is group
  1 and waits for nobody.

# Design

Nothing new on the dashboard: the same block, the same two lines under the fact. On the Calendar
page's day panel, under what she read and above what comes out, one quiet line in a sunken well:
"💡 Your fact that day: …". A day without reading has no line at all.

# Test

`pnpm test`: 201 files, 2498 tests passed (22 skipped); `pnpm run build`: built;
`pnpm exec harness check`: in step.

- `src/lib/facts.test.ts` — "the mark: facts only ever go forward": the old slip is shown
  first (a day taken out of the middle changes the last fact), then held by the mark; the
  taking-turns carries on into the facts the mark holds; the count never falls below the mark,
  even with an empty shelf; today's fact stays put when a day is corrected away; "All my facts"
  keeps all three; and `factForDay` gives each reading day its fact, nothing for a day she
  didn't read or one before her first, and the same fact the dashboard gave that day.
- `src/lib/factsSeen.test.ts` — the mark is read as the **highest** `f:seen` count, not the
  newest; another feature's `place` events (bingo's `b:`, the den's `home:`) are ignored and
  survive the merge; a count that is not a whole number above zero is ignored; and `mergeLogs`
  keeps the mark at **one** event after four moves, which is what makes it cheap.
- `src/components/CalendarPage.fact.test.tsx` — tapping a reading day shows its fact, each day
  has its own, and a day without reading says nothing.

Tried to break it, and found one hole while writing the tests: the first version read the
**newest** mark, so a device that wrote while still behind another could pull the mark back.
Reading the highest closes that while both events are in the log. What is left — a device that
writes a lower mark after a merge has already dropped the higher one — is written down in
`factsSeen`'s comment and in D-0079's consequences rather than hidden.

Looked at it running, on both wallpapers at 430 × 932: the day panel shows "💡 Your fact that
day: …" under what she read, in a sunken well, and a day without reading has no line.

Remaining: Hanna checks on the preview that correcting a past day leaves today's fact alone,
that a reading day still brings a new one, and that the calendar shows the day's fact.

# Log

- 2026-11-26 architect: raised by Hanna, cause found (a reading day going away shifts the run),
  D-0079 recorded, sized full.
- 2026-11-26 ux-designer: one quiet line in the day panel, under what she read; nothing new on the dashboard.
- 2026-11-26 developer: the mark in factsSeen.ts, useFactMark on the page, atLeast in unlockedSequence, factForDay on the calendar.
- 2026-11-26 developer: first version read the newest mark instead of the highest; found while writing the tests and changed.
- 2026-11-26 tester: ran pnpm test and pnpm run build, both pass; the day panel checked on a screenshot, both wallpapers.
- 2026-11-26 tester: Remaining: Hanna checks on the preview that a corrected day leaves today’s fact alone and that the calendar shows each day’s fact.
