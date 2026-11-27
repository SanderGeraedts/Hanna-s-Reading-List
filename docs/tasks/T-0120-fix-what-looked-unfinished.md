---
id: T-0120
title: "Fix what looked broken or unfinished"
description: "A round of small fixes Hanna noticed: den pets sized by age, soft garden mist, a whole-year grid on Stats, room under the quick-update button, a tidier phone header and filter row, a new armchair, a quieter Monthly challenge, a lighter night garden, finish dates that agree, and no more \"0 of 0\"."
status: Doing
size: small
depends_on: []
decisions: [D-0001, D-0077]
raised_on: 2026-11-27
done_on: ""
result: []
---

# Goal

Hanna went through the app and pointed at things that looked broken or half done. Each one is
fixed here; three turned out not to be bugs (see *Notes*).

1. **Den pets sized by age.** Pets walking around the den were all 0.3 tall, so a baby on the
   cushion stood twice as tall as a grown pet walking by. Walking pets are now 0.6 × the
   cushion size for their stage (`roamHeight` in `src/components/creatures/WalkingPets.tsx`).
2. **Garden mist** is drawn as soft, fading drifts instead of hard bands
   (`src/components/garden/GardenFlat.tsx`).
3. **The Stats year grid** shows the whole year as two half-year rows that fit the card,
   instead of a sideways scroll she couldn't see (`HeatmapCard` in `DashboardMore.tsx`). Its
   page count now says "pages read"; Stats "in numbers" says "pages in finished books", so the
   two different numbers no longer look like a mistake.
4. **Room at the bottom of every page,** so the round 📖 quick-update button never covers the
   end of a page.
5. **Phone shelf filters** sit on a solid pill with a fade at the right edge, so it is clear
   the row scrolls.
6. **Phone header** shows a short summary (books · reading · read) instead of a line cut off
   halfway.
7. **The reading-corner armchair** is rebuilt with rounded, padded shapes and wooden legs, and
   is left out on an upright phone, where only slivers of it showed (`RoomExtras.tsx`,
   `BookshelfScene.tsx`).
8. **Monthly challenge** shows one line of months instead of twelve empty boxes before anything
   is picked (`ChallengeCard.tsx`).
9. **The night garden** is lighter, and a half-full last row of beds is centred
   (`gardenLayout` in `src/lib/garden/view.ts`, `GardenScene.tsx`).
10. **Finish dates agree.** The dashboard strip's finish date uses the same calculation as
    "Finish by" (`daysToFinish` → `finishEstimate` in `src/lib/finishEstimate.ts`), so both
    name the same day.
11. **"Read the series"** no longer shows "0 of 0".

# Done when

- `pnpm exec vitest run src/components/creatures/WalkingPets.size.test.ts src/lib/garden/view.test.ts src/lib/finishEstimate.test.ts`
  passes.
- Hanna sees the fixes on the preview or the live site.

# Notes

Checked and found **not** to be bugs:

- **The pages-per-month bars** looked wrong in a screenshot; that was the screenshot, not the
  chart.
- **"When I read most"** showed nearly equal bars because the days really were nearly equal.
- **Crowded calendar cells** came from demo data with fifteen books a day; real shelves don't.

Small task, agreed with Hanna on her instance; nothing here touches saving or the server.

# Design

Each fix makes something look the way it already meant to; no new screens. Hanna checks them
on the preview.

# Test

The three test files in *Done when*, the full suite and the build run locally; see *Log*.

# Log

- 2026-11-28 developer: built on `fix/unfinished-bits`; tests added for the pet sizes, the garden layout and the finish date.
- 2026-11-28 developer: checked the pages-per-month bars, "When I read most" and the calendar cells; none was a bug.
- 2026-11-28 tester: `pnpm test`: 220 files passed, 2 skipped; 2809 tests passed, 22 skipped. `tsc --noEmit` clean, `harness check` all ✓, `pnpm run build` ✓. Screenshots of every page at phone and computer size, 13:00 and 21:00, full and empty shelf, looked at. An independent review found three bugs (a pick taken out lost the day's extra coins; More › Bookshop could open the shop later by itself; old layouts kept lone section headings); all three fixed with tests.
- 2026-11-28 developer: Remaining: Hanna checks it on the preview/live site.
