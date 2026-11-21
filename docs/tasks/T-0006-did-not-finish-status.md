---
id: T-0006
title: "Add a \"Did not finish\" reading status, and a dashboard block that brings one back now and then"
description: "#187: books Hanna gave up on can be marked DNF; a dashboard block shows one of them at a time as a reminder to try again."
status: Open
depends_on: [T-0001]
decisions: [D-0002]
raised_on: 2026-11-21
done_on: ""
result: []
---

# Goal

Hanna asked in #187: "Some books are hard to go through, so you will not finish them. I want to
be able to add them a DNF as reading status. Also a block on the dashboard where they can pop up
from time to time as a reminder to try again."

1. **A new reading status, "Did not finish" (DNF)**, next to *Want to read*, *Reading*, *Paused*
   and *Read* in the book panel, in *Arrange by → reading status* (its own group with its own
   nook sign), and in search. `ReadingStatus` in `src/lib/library.ts` gains `'dnf'`.
2. **A dashboard block "Give it another try"** that shows one DNF book (cover, title, author,
   how far she got) with a button that sets it back to *Reading*. It shows a different DNF book
   each day, chosen so the same one doesn't come back until the others have had a turn. With no
   DNF books it shows a short line ("No books put aside") and takes little room.

**Assumptions, stated because the request leaves them open:**

- "From time to time" means a different book each day, in the dashboard's *Today* section by
  default; Hanna can move or hide the block like the others. The UX designer may make it
  appear less often (e.g. only some days) if every day feels like nagging.
- A DNF book keeps its progress (bookmark position) and counts nowhere as read or as
  currently reading: not in Books read, goals, streaks, challenges, bingo or badges. It shows
  no bookmark on the shelf, and no medal unless it was read before (times read stays).
- DNF behaves like *Paused* towards Storytel: a Storytel refresh or the nightly sync never turns
  DNF into Storytel's status (Storytel has no DNF), except that new listening progress makes it
  *Reading* and Storytel's "finished" makes it *Read*, exactly as for *Paused*
  (`src/lib/storytelImport.ts`, `src/lib/readingLog.ts`).

Keep the change small: the status and the block. Nothing about how the shelf is saved changes;
the status is a value in a field that already exists, and older shelves load as before.

# Done when

- Unit tests (Vitest) pass for: `statusPatch` to and from `'dnf'` (times read kept); the
  Storytel merge keeping `'dnf'` when Storytel says reading or want, and moving it to reading on
  new progress and to read on finished; DNF books left out of the read count, the
  currently-reading list and the streak; the block's daily choice (deterministic for a given
  day, every DNF book shown once before any repeats, empty when there are none).
- On the pull request's deploy preview (shelf in the browser, no account): mark a book *Did not
  finish* in the book panel; it gets no bookmark on the shelf, *Arrange by → reading status*
  shows it in its own group, and the dashboard shows it in "Give it another try"; *Try again*
  sets it to *Reading* and the block shows "No books put aside". With two DNF books, changing
  the device's date to the next day shows the other one.
- A shelf saved before this change (e.g. the `localStorage` copy from `main`'s preview) still
  loads unchanged.
- `pnpm test` and `pnpm run build` pass; CI is green.
- The UX designer has reviewed the status control, the nook sign and the block on a phone and a
  desktop.

# Notes

- `src/lib/library.ts` (`ReadingStatus`, `statusPatch`, labels), `src/components/BookPanel.tsx`,
  `src/routes/index.tsx` (status list around line 380), `src/lib/insights.ts` and the other
  places that filter on status (`grep -rn "status ===" src`), `src/lib/dashboardLayout.ts`
  (`BLOCKS`, `DEFAULT_LAYOUT`), `src/components/Dashboard*.tsx`, `src/lib/storytelImport.ts`,
  `src/server/nightly.ts` (check it uses the same merge), `src/components/BookMesh.tsx`
  (bookmark for reading/paused).
- `src/lib/shelfMerge.ts` and `src/server/shelf.ts` should need no change; if they seem to, stop
  and ask the architect (they are code-owner paths, Q-003).
- Close #187 from the pull request.

# Design

UX designer, before it is built: the label and colour of the status, its nook sign, and the
block (what it shows, the button, the empty state, how often it changes). Review after.

# Test

# Log

- 2026-11-21 architect: Task written from #187, with the assumptions in the Goal.
