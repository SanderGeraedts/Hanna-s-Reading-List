---
id: T-0065
title: "Show the garden on the dashboard, with what is next to unlock"
description: "A Garden block on the dashboard: a small flat drawing of this year's garden, how many plants it has and how many are in bloom, the season, what is next to unlock and how far off it is, and Open › to the Garden tab."
status: Doing
size: full
depends_on: [T-0060, T-0061, T-0063, T-0064]
decisions: [D-0013, D-0014, D-0050, D-0051]
raised_on: 2026-11-23
done_on: ""
result: []
---

# Goal

The small dashboard block Hanna agreed to: the state of the garden at a glance and what is next to
unlock, with `Open ›` to the Garden tab. It is the whole garden's delivery task: the test run for
T-0060 … T-0065 is written here.

# Done when

- `pnpm test` and `pnpm run build` pass, and `pnpm exec harness check` passes.
- The block appears on the dashboard (in *Today*, next to Creatures), shows the plant count, the
  bloom count, the season and the next unlock, and keeps out of the way when nothing has been
  finished yet.
- The performance numbers of the 3D garden and the flat garden are written in this task's *Test*
  section.
- The screenshots listed in the designs exist under the tasks' `*-screens/` folders.

# Notes

- The block is registered in `src/lib/dashboardLayout.ts` (`BLOCKS`, `DEFAULT_LAYOUT`) and rendered
  in `src/components/Dashboard.tsx`, like `creatures`.
- A block with nothing to say stays out of the way, as `creatures` does (`showing`).

# Design

A `.dash-card` headed `Garden` with `Open ›`:

- a small flat drawing of **this year's** garden, at most one bed wide, plants scaled to fit (the
  same drawing code as the tab, at a smaller size, no 3D);
- `114 plants · 12 in bloom`;
- the season: `🍂 Autumn`;
- the next unlock: `Next: a pond at 25 books (6 to go)`, or `Every garden item unlocked.` when they
  are all there;
- nothing else: no hint text (D-0014), no pop-up (D-0013).

With no finished books the block keeps out of the way entirely, like Creatures before the first
hatch.

**Review (after the build).** Reviewed on 2026-11-23 on the dashboard screenshots: heading, small
garden, counts, season chip and the next-unlock line are as designed, and the block hides itself on
an empty shelf. **Matches. Passes.**

# Test

Written by the tester.

# Log

- 2026-11-23 architect: written with T-0060; size full. This task carries the garden's test run.
- 2026-11-23 ux-designer: designed the block.
