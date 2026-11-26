---
id: T-0116
title: "Say what happened, whether her books are safe and what she can do, every time something goes wrong"
description: "One honest line per real failure from src/lib/trouble.ts: the shelf not reaching the server at Sander's home, a shelf too big to send, the 3D shelf that can't be drawn, a Storytel refresh, and the goal and challenge saves that used to fail silently."
status: Doing
size: full
depends_on: []
decisions: [D-0088, D-0013, D-0077, D-0035]
raised_on: 2026-11-26
done_on: ""
result: []
---

# Goal

Hanna, 26 November 2026: *"what you see when the server at Sander's is unreachable, a sync
fails, or the 3D can't draw — today some of that is silent and some is a bare note."*

Every failure she can notice says, in her words: **what happened**, **whether her books are
safe**, and **what she can do** — try again, carry on without it, or tell Sander when it is
genuinely his. No pop-ups (D-0013), no stack traces, no jargon, and never an offer to repair
her books (the guardrails: that is Sander's).

The words live in one small pure module, `src/lib/trouble.ts`, so they can be tested as words
and so the same failure can never get two different lines.

# Done when

`pnpm exec vitest run --dir src` is green, including `src/lib/trouble.test.ts` (the words:
every line has its three parts, none contains jargon, Try again is offered only where it can
help, "safe on this device" is dropped when the browser isn't keeping a copy) and
`src/components/WaitingTrouble.test.tsx` (the row in "Waiting for you"), and
`pnpm run build` passes.

# Notes

## The failure paths, as found

Read first: `src/lib/library.ts` (`loadShelf`/`saveShelf`, `failed()`, `SyncStatus`,
`NOT_SIGNED_IN`), `src/server/shelf.ts` and `src/server/pocketbase.ts` (`Unreachable`,
`PocketBaseError`), `src/components/SafeBookshelf.tsx` + `src/lib/shelfDiagnosis.ts`,
`SYNC_TEXT` in `src/routes/index.tsx`, `src/components/useCreatureChoices.ts`,
`src/components/useDashboardLayout.ts`, `src/lib/useStorytelSync.ts`,
`src/server/openLibrary.ts`.

| Path | Was | Now |
| --- | --- | --- |
| Shelf can't reach / isn't taken by the server (`sync: 'offline'`) | bare: one line hidden in the account menu, a bare toast on ↻ | `shelf-not-sent` — a row in "Waiting for you" with Try again, and the account-menu line |
| Shelf too big to send (`sync: 'too-big'`) | bare, with jargon | `shelf-too-big` — the same row, no Try again (it can't help) |
| Signed out by the server (`NOT_SIGNED_IN`) | handled: the sign-in form comes back | `signed-out` line available for the menu |
| The 3D shelf can't be drawn (#181, T-0003) | a note with Try again, but "on this phone" and no way forward | `shelf-not-drawn` — same note, better words, Details kept |
| Storytel refresh fails | bare: Storytel's own message, status codes and all | `storytel-refresh` / `storytel-signed-out` |
| Reading goal doesn't reach the server | **silent** (`.catch(() => {})`) | `goal-not-sent` — a quiet line under the goal |
| Own challenge doesn't reach the server | **silent** (`.catch(() => {})`) | `challenge-not-sent` — a quiet line under the challenges |
| Open Library search / covers / book details | quiet on purpose | **left alone** (the guardrails: an outside API fails quietly, the shelf keeps working) |
| Favourites sync (`useDashboardLayout`) | quiet on purpose; unsent changes queue | **left alone** |
| Creature choices sync (`useCreatureChoices`) | quiet on purpose; the log is kept here and merged by id | **left alone** |
| Her books look wrong or missing | nothing | `books-look-wrong` — tells Sander, never repairs |

## What was checked, not assumed

`useLibrary` writes the shelf to this browser's storage on every change *before* sending, so
"safe on this device" is true — except when the browser refuses to store (private window,
storage full), which `store()` swallows. `deviceKeepsBooks()` tests it; when it fails the
line says instead that nothing is being kept here either.

## Not touched

`src/lib/library.ts`, `src/lib/shelfMerge.ts`, `src/server/shelf.ts` — the load/save/sync of
her shelf is Sander's (D-0077, the guardrails). The cost: `offline` covers both "no answer"
and "refused", so the line claims neither.

Not touched either, and wiring lines reported instead: `src/routes/index.tsx` (`SYNC_TEXT`,
the ↻ toast, the `trouble` prop), `src/components/Dashboard.tsx`. No change to
`src/styles.css`: the new row reuses `waiting-list` / `badge-icon` / `waiting-info` / `chips`.

# Design

**Shape of a line.** Three sentences, always in this order, and a button label or none:

- *what happened* — "Your latest changes haven't reached the server at Sander's home."
- *whether her books are safe* — "Your books are safe on this device; they just haven't
  reached the server at Sander's home yet."
- *what she can do* — "Carry on reading and adding books — the app keeps trying on its own.
  Try again to send them now. If it still says this tomorrow, tell Sander."

**Where each one appears.** The shelf's failures are the only ones that are still true after
she looks away, so they wait in "Waiting for you" at the top of the dashboard — the app's
place for anything waiting on her (D-0013), with ⚠️ for its icon, the three sentences (the
first bold, the other two muted) and one **Try again** chip that says *Trying…* while it
tries. Everything else is a quiet line where the thing is: under the reading goal, under her
challenges, in the 3D shelf's existing centre note, in the Storytel toast.

**Try again, or not.** The button appears only for `shelf-not-sent`, `shelf-not-drawn` and
`storytel-refresh`. For a shelf too big, a dropped Storytel login or a goal waiting to go up,
the way forward is in the words instead; offering a button that can't work teaches her not to
trust buttons.

**The 3D note** keeps its layout, its Try again, its "Show simple books" and its Details line
(T-0003, D-0035). Only the words changed: "on this screen" rather than "on this phone", and a
third line saying what to do.

# Test

To be written by the tester.

# Log

- 2026-11-26 architect: raised from Hanna's grill of 26 November 2026; recorded D-0088.
- 2026-11-26 developer: `src/lib/trouble.ts` + `trouble.test.ts`; wired into `SafeBookshelf`,
  `useStorytelSync`, `WaitingCard` (new `trouble` prop), the reading goal and her own
  challenges. `pnpm exec vitest run --dir src`: 213 files passed, 2 skipped; 2716 tests
  passed, 22 skipped. `pnpm run build` passed.
- 2026-11-26 developer: Remaining: the wiring in `src/routes/index.tsx` (`SYNC_TEXT`, the ↻
  toast and the `trouble` prop) and `src/components/Dashboard.tsx` must be added by Sander —
  those files were out of bounds for this task; the exact lines are in the pull request.
