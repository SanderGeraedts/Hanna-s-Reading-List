---
id: T-0029
title: "Hatch her first book creature from a welcome egg, earn cookies by reading, and let it grow, with a Creatures tab and a dashboard block"
description: "CR1 of the book creatures (D-0033): cookies worked out from the reading log, a welcome egg (no starting cookies) from which she chooses her first creature among the five commons, with a name, feeding and growing by itself on reading days, baby/young/grown-up stages, a missing-you look; a Creatures tab (home) and a dashboard block; hatches and level-ups in Waiting for you; her choices kept on the device and sent to the account once T-0028 is live (D-0034)."
status: Open
size: full
depends_on: [T-0027]
decisions: [D-0002, D-0003, D-0008, D-0013, D-0014, D-0020, D-0022, D-0025, D-0030, D-0033, D-0034]
raised_on: 2026-11-22
done_on: ""
result: []
---

# Goal

The first playable step of the book creatures ([brief](../book-creatures-brief.md), D-0033). After
this Hanna has one creature that grows as she reads.

1. **Cookies** (`src/lib/creatures/cookies.ts`), worked out from her books from `CREATURES_START`
   (the day this goes live, a constant): 1 🍪 per 5 minutes read or listened, +10 per finished book,
   sleep reads half, exactly as D-0033 §2. The balance = earned − spent (spent comes from her
   choices); it starts at 0 on the start day. Below zero after a fixed past day: shown as is,
   feeding waits.
2. **Welcome egg**: on the start day a common egg waits in Waiting for you, with **no starting
   cookies** (D-0033 §3). Tapping **Hatch** opens, in the Creatures tab (not a pop-up), the five
   commons to **choose** from (house cat, red fox, capybara, red squirrel, Adélie penguin), each
   shown with its name; she picks one, the egg cracks (short, on her tap) and her first creature
   appears with a suggested cute name she can keep or change; she can rename later. Whether it is
   shiny follows D-0033 §7. Her pick is saved as the `hatch` choice.
3. **Growing**: **Feed** gives the creature cookies (the food bowl); each feed gives growth; on days
   she reads it also grows a little by itself, skipped days pause (D-0033 §10). Level, and visible
   stages baby → young → grown-up (D-0033 §11) made from Fable's base model by scaling its parts as
   the model file says (T-0027): no new Fable work. A level-up waits in Waiting for you.
4. **Missing you**: after 3 days without reading the creature looks a bit sad and sleepy (droopy
   eyes, slower idle); the first reading day it cheers up. Never hungry, never lost.
5. **Creatures tab**: a new page tab next to Calendar (`?view=creatures`), showing the creature in
   its home (a simple den), its name, level, stage and the cookie balance, with Feed and Rename.
   Album, shop and tricks come later; leave room for them.
6. **Dashboard block "Creatures"**: the current creature (still, small), its food bowl with the
   balance and a Feed button, and the next unlock ("Next egg: 7-day streak"; until T-0030 only the
   next level). Open › goes to the tab. It can be starred, moved and hidden like every block.
7. **Her choices** (hatch, name, feed) are events in a choices log (D-0034): kept in localStorage,
   and sent to the account through a new server function `src/server/creatures.ts` when the server
   keeps them (T-0028). Until then, or if the server answers 404, the device keeps its own log and
   everything works.

# Done when

1. `pnpm test` passes and includes tests for: cookies from a reading log (pages, listen-only
   minutes, a book without length as 280 pages, a sleep read at half, a finished-book treat, nothing
   before the start, fixing a past day lowers the total, rounding on the total); the welcome egg
   (one common egg on the start day, no cookies; balance 0 before any reading); the first hatch
   (only the five commons can be picked; the picked one is the creature on every device; shiny or
   not is the same for the same egg every time); growth by itself only on reading days; stages by level; missing-you after 3 days without
   reading and gone on the next reading day; the choices log merge (union by id, newest setting per
   key, nothing doubled) and that the app keeps working when the server answers 404 (like
   `favouritesSync.test.ts`).
2. On `pnpm run dev` with demo data: the welcome egg waits in Waiting for you; Hatch shows the five
   commons to pick from, and the picked one hatches with a suggested name; renaming works and stays after a reload; Feed lowers the balance
   and raises growth; the dashboard block and the Creatures tab show the same creature, level and
   balance; at 390 × 844 and 1280 × 800, both wallpapers. Screenshots in
   `docs/tasks/T-0029-screens/`.
3. On the phone size the creature only makes small idle movements, and rendering stops when the tab
   isn't visible or the book panel is over it (frame loop paused; checked by a test or the
   performance panel, noted in *Test*).
4. `pnpm run build` and `pnpm exec harness check` pass.
5. **Hanna** confirms on the live site that her first creature hatched and grows when she reads.

# Notes

- **Order:** after the harness v0.9.0 upgrade and T-0026; before the better world map. T-0028 may be
  merged before or after this; this task doesn't wait for it.
- **Models:** use the base models from T-0027 (`src/components/creatures/models/`). Stages and
  expressions (sad/sleepy eyes) are built here from those designs on the normal model; **don't start
  a Fable agent** (D-0033 §14). If a creature's base look itself must change, that goes back to a
  Fable agent for that creature, as T-0027 describes.
- **Minutes per day:** `readingLog[day]` is the share of the book read that day; × the book's length
  in minutes (`minutes` for listen-only, `listenOnly` in `src/lib/listening.ts`; otherwise pages ×
  1.5). Finishes: `allFinishes` in `src/lib/stats.ts`. Sleep reads: `sleepReadIds` in
  `src/lib/sleepSeries.ts`. Streak (for later eggs): `readingStreak` in `src/lib/insights.ts`.
- **Waiting for you:** `src/components/WaitingCard.tsx` (D-0013): add the egg and level-up lines.
- **Page tabs:** `src/routes/index.tsx` (the `view` search param and the tab list near the
  bottom). Dashboard blocks: `src/lib/dashboardLayout.ts` (a new block id; saved layouts and
  favourites must still load).
- **Account sync:** follow `src/server/favourites.ts` / `favouritesStore.ts` and
  `src/lib/favourites.ts`: a read with `fields=id,creatures`, a post to the route, `kept: false` on
  404. Never PATCH the field (D-0034). Nothing in `src/server/shelf.ts`, `src/lib/shelfMerge.ts` or
  `deploy/nas/` changes in this task (code owners).
- **No hint texts** (D-0014); colours from the design system on both wallpapers (D-0020, D-0022).
- Every number (rates, caps, levels) in one file, `src/lib/creatures/numbers.ts`.

# Design

For the UX designer, before the build: the Creatures tab (home), the dashboard block, the Waiting
for you lines and the hatch moment, phone and computer, both wallpapers.

# Test

# Log

- 2026-11-22 architect: wrote CR1 from Hanna's brief; earned things are derived from the reading
  log, choices kept on the device and synced once T-0028 is live; no Fable work in this task. Size:
  full (new tab, new block, new data).
- 2026-11-22 architect: Hanna's answers: the welcome egg comes without cookies, and she chooses her
  first creature from the five commons (not a surprise). Size unchanged: full.
