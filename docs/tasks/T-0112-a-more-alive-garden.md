---
id: T-0112
title: "Make the garden more alive: weather from the date, scenery that arrives, and small kindnesses"
description: "Weather invented from the day, seven pieces of scenery that arrive with her reading, and three kindnesses that are never needed — all without anything new being saved on the server."
status: Doing
size: full
depends_on: []
decisions: [D-0050, D-0051, D-0052, D-0071, D-0083]
raised_on: 2026-11-26
done_on: ""
result: []
---

# Goal

The garden is calm but still: the same picture every day until a book is finished. This task
gives it three things Hanna agreed in a feature chat on 2026-11-26 (D-0083):

1. **Weather she can see**, invented from the date and the season and **never fetched** — the
   same on every device, never waiting on the internet, never failing, and testable. Both
   views show it: the flat SVG garden (her phone) and the 3D garden.
2. **Scenery that arrives with her reading**: a hedge, stepping stones, a fence, a brook, a
   birdhouse, a potting shed and a beehive, which turn up at reading milestones. Not bought,
   not placed, derived from her shelf exactly as the plants are, and a different thing from
   the `g:i:` garden items she places herself (D-0052).
3. **Small kindnesses**: water a plant, scatter seed, sweep the path. Each gives the garden a
   little something for the day, and each is **never needed** — nothing wilts, no streak, no
   nag, and a month of ignoring them costs nothing.

Nothing new may be saved on the server: no change in `deploy/nas/`, no new field, nothing
waiting for Sander. The kindnesses ride in the existing creatures choice log as `place` events
with `g:k:` keys, the way a swapped bingo square does (D-0067).

# Done when

1. `pnpm test` passes, including the new `src/lib/garden/weather.test.ts`,
   `scenery.test.ts` and `kindness.test.ts`.
2. `pnpm run build` passes.
3. `pnpm exec harness check` is green.
4. The 3D garden's budget test still passes in every weather and with all the scenery
   standing (60 draw calls, 20,000 triangles — `src/components/garden/gardenBudget.test.ts`).
5. The log is bounded: a test waters, seeds and sweeps every day for a month and the merged
   log still holds three events.

# Notes

- New logic: `src/lib/garden/weather.ts`, `scenery.ts`, `kindness.ts`, each with a test
  beside it.
- Changed: `garden.ts` (the weather, the scenery and today's gifts on the `Garden`),
  `seen.ts` (arrivals), `words.ts` (the lines), `GardenFlat.tsx`, `GardenScene.tsx`,
  `plantModel.ts` (`buildScenery`, weather in `buildWeather`), `useGarden.ts`, `useSeen.ts`,
  `GardenPage.tsx`, `GardenCard.tsx`, and one appended block in `src/styles.css`.
- Not touched: `deploy/nas/`, `shelfMerge.ts`, `server/shelf.ts`, and the files another agent
  is working in (`Dashboard.tsx` among them).

# Design

**Weather.** One weather per day, drawn from the month's own weighted list with the hash the
creatures already use, so April is showery and July is bright. The head of the Garden tab
shows it beside the season ("🍂 Autumn · 🌫️ Mist"), and so does the dashboard block. The flat
garden draws one cheap layer of plain shapes; the 3D garden reuses its single Points object
and dims its light. "Have a look" gains a row of weather chips: a look, never saved, and
**Now** puts it back with the season and the night.

**Scenery.** It stands in the grass border round the beds — the hedge along the back, the
fence down the sides, the brook and the stepping stones along the bottom, the birdhouse, shed
and beehive in the corners — so it can never collide with a garden item in the strip. In 3D it
is **one merged mesh**, whatever has arrived. When a piece has arrived since she last looked,
one quiet line says so under the drawing, and one line under that says what is on its way:
never a goal, never a pop-up (D-0013).

**Kindnesses.** A card under "Have a look" with three chips. Tapping one saves a single event
and the live region says what it gave; the chip then reads "💧 Watered today" and does
nothing more. The line under them is a welcome, not a task list: "Nothing here needs doing.
They are just nice to do."

# Test

Run by the developer; the tester's own run goes here.

- `pnpm test` → **Test Files 204 passed | 2 skipped (206), Tests 2556 passed | 22 skipped
  (2578)**.
- `pnpm run build` → `✓ built in 7.99s`.
- The budget test prints the fullest garden in every weather and stays inside 60 draw calls
  and 20,000 triangles; the whole scenery is one draw call in every season.

# Log

- 2026-11-26 architect: raised from Hanna's feature chat; recorded D-0083 and sized it full.
- 2026-11-26 developer: built the three parts, with tests beside each new module; `pnpm test`
  and `pnpm run build` both pass. Remaining: the tester's own run, Hanna's look at the
  preview, and one wiring change in `Dashboard.tsx` (pass the scenery arrivals to
  `waitingLine`), which this task was not allowed to touch.
