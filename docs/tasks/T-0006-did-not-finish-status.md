---
id: T-0006
title: "Add a \"Did not finish\" reading status, and a dashboard block that brings one back now and then"
description: "#187: books Hanna gave up on can be marked DNF; a dashboard block shows one of them at a time as a reminder to try again."
status: Done
depends_on: [T-0001]
decisions: [D-0002]
raised_on: 2026-11-21
done_on: 2026-11-21
result: ["https://github.com/SanderGeraedts/Hanna-s-Reading-List/pull/199"]
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
- In the book panel a DNF book with progress shows "Stopped at N%" instead of the progress
  slider; setting it back to *Reading* shows the slider at the same place.
- Searching "dnf" finds the DNF books.
- With no DNF books the block shows only its title and "No books put aside."; after *Try
  again* it shows "“<title>” is back in Currently reading.", and the book is under *Currently
  reading*.
- A book with reading days that is then marked DNF keeps those days in the Calendar (the
  streak counts them as before). This replaces "left out of … the streak" above unless the
  architect decides otherwise (see *Design*, *What counts where*).

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

## Design (2026-11-21, before the build)

The app's words are English (British spelling), short and plain. The status uses the same
words everywhere: **"Did not finish"**. "DNF" is what Hanna calls it, so search finds it by
that too.

### The status

- **Label:** "Did not finish", in `STATUS_LABELS`. In the book panel's *Status* list it comes
  last: Want to read, Reading, Paused, Read, Did not finish.
- **Colour:** none of its own. No status has a colour in this app (the status list is plain
  text, and the nooks get their scene from the books' genre), so a colour only for this one
  would stand out as a warning. That's not what she means: it is a book put aside, not a
  failure.
- **Header count:** last in the line: "24 books · 2 reading · 1 paused · 8 want to read ·
  12 read · 1 did not finish".
- **Search:** typing "did not finish" or "dnf" finds these books, with "Did not finish" as the
  hint under the title, the way the other statuses show.

**In the book panel, when the status is Did not finish:**

- The progress slider and the three progress fields are replaced by one quiet line under
  *Status*: "Stopped at 42%", and when the page count is known "Stopped at 42% · page 99 of
  237" (for a book she only listens to: "Stopped at 42% · 3:10 of 10:25"). With no progress
  (0%) the line isn't shown. The progress itself is kept, so it is all there again when she
  sets the book back to *Reading*.
- *Started on* stays, as for every status except *Want to read*. Rating, spice, times read and
  *Finished on* show only when it was read before, as now.
- Nothing else in the panel changes.

**On the shelf:** a DNF book has no bookmark and no medal. The medal follows Reading and
Paused, which show no medal even when the book was read before; the times read stay in the
panel. (The Goal says "no medal unless it was read before"; I chose to match Reading and
Paused so the three behave the same. If Hanna wants the medal, it's one condition in
`BookMesh.tsx`.) The spine itself doesn't change.

**The nook sign** (*Arrange by → Reading status*): the same hanging walnut sign as the other
status groups, with "Did not finish" in its italic serif. The sign already shrinks long names
to fit, and "Did not finish" is about as long as "Want to read". The scene inside the nook
comes from the books' genre, as for every group. On the shelf the group comes last, after
*Read* (the order is Reading, Paused, Want to read, Read, Did not finish).

### The dashboard block "Give it another try"

**Where:** in *Today*, at the bottom of the left column (after *Lent out*). There it's a
gentle reminder, not the first thing she sees. On a phone the columns are shown as one, so it
comes near the end of *Today*. Saved layouts get it added there by `cleanLayout`; she can move,
star or hide it like any block. The block name in the Arrange list is "Give it another try".

**With DNF books** (reuses the *What next?* layout, `.next-book`):

```
Give it another try
[cover]  Circe
         Madeline Miller
         Stopped at 42%
         [ Try again ]  [ Show on the shelf ]
3 books put aside. Another one tomorrow.
```

- The large cover (as in *What next?*); a book without a cover shows its coloured stand-in, as
  everywhere.
- The title, the author(s) in helper text, then "Stopped at 42%" in helper text (left out at
  0%).
- **"Try again"** (main, gold button): sets the book to *Reading*, keeping its progress, so it
  shows up under *Currently reading* and gets its bookmark back on the shelf. The block then
  says, in one helper-text line at the top, "“Circe” is back in Currently reading." (announced
  with `role="status"`), and shows the next DNF book, or the empty line.
- **"Show on the shelf"** (secondary button): opens the book on the shelf, like everywhere on
  the dashboard. Tapping the cover or the title does the same.
- The last line, only with two or more DNF books: "3 books put aside. Another one tomorrow."
  It tells her the book changes by itself, so there is no "another" button.

**How often it changes:** a different book each day, every DNF book once before any comes back
(the Goal's assumption). It sits at the bottom of *Today* and doesn't badge, pop up or move up,
so a daily change is a reminder, not nagging. Hiding the block is the way to make it stop.

**Empty (no DNF books):** only the title and one helper-text line: "No books put aside." The
block stays small and stays in place, so she knows where DNF books will appear.

**Loading and errors:** none. Everything comes from the shelf on the device, like *What
next?*.

**Phone and long text:** at 390 px and at 320 px the cover stays on the left and the text
beside it. The two buttons wrap onto two lines when they don't fit, each at least 44 px high.
Long titles wrap; they aren't cut off.

**Keyboard and screen reader:** the block is a `section` labelled by its heading. The order is
cover button, title button, "Try again", "Show on the shelf". After "Try again", focus goes to
the next book's "Try again", or to the block's heading when it is empty, so focus isn't lost.

### What counts where

- As the Goal says, a DNF book isn't counted as read or as being read: not in *Books read*,
  goals, challenges, bingo, badges, *Currently reading*, the strip at the top of the Dashboard,
  *Finish by*, or *What next?*.
- **The days she did read it stay**, in the Calendar, *A year of reading* and the streak. They
  happened, and taking them away would break a streak the day she puts a book aside. So "left
  out of the streak" should mean that a DNF book adds no new days (it can't: there's no
  progress to log while it's DNF). It shouldn't mean that its past days are removed. This
  differs from the literal *Done when* line; see the Log.

**Where to look (added 2026-11-21):** the deploy previews show the sign-in screen, so they may
have the production account server's address. Until the Engineer has confirmed they don't, the
review and the tester's screenshots come from a local dev server with no backend (shelf in the
browser) or a local PocketBase, never from signing in or adding books on a deploy preview.

## Review after building (2026-11-21)

Looked at the developer's screens from a local dev server with no backend, at 320 px and
1280 px (shelf by reading status, search "dnf", the panel, the block with a book, the block
after *Try again*, the dashboard), and read the texts in `AgainCard.tsx`, `didNotFinish.ts`
and `BookPanel.tsx` on the branch. The app has one look (D-0020), no light/dark switch.

**Matches the Design:**

- "Did not finish" is the label everywhere: last in the panel's *Status* list, last in the
  header line ("5 books · 1 reading · 1 want to read · 1 read · 2 did not finish"), and as the
  hint under the title in search. Searching "dnf" finds both DNF books ("2 books"). No colour of
  its own.
- The panel replaces the slider with one quiet line, "Stopped at 42% · page 100 of 237";
  *Started on* stays; nothing else changes.
- The nook sign is the usual walnut sign with "Did not finish" in the italic serif, fully
  readable at 320 px, and the group comes last on the shelf. No bookmark on DNF spines.
- The block "Give it another try" sits at the bottom of *Today*'s left column, after *Lent
  out*. Large cover (the stand-in colour when there's no cover), title, author, "Stopped at
  10%", gold *Try again* and secondary *Show on the shelf*. At 320 px the cover stays left, a
  very long title wraps without being cut, and the two buttons wrap onto two lines, each at
  least 44 px high. After *Try again*: "“Circe” is back in Currently reading." at the top,
  then the next book or "No books put aside.", and the block stays small.

**Differs, all accepted (no fix needed):**

- *No "3 books put aside. Another one tomorrow."* It explained how the block works, which
  D-0014 rules out; the decision wins over my Design. The remaining texts pass D-0014: "No books
  put aside." is an empty-block message, the "is back in Currently reading" line is feedback on
  her own action, and "Stopped at N%" is her own data. Nothing opens by itself, so D-0013 holds.
- *"page 100 of 237"* instead of the Design's example "page 99", and the listening time as
  "3 h 10 min" instead of "3:10": the app's own rounding and duration format (`percentText`,
  `formatDuration`), so it reads the same as the rest of the panel. Better than my example. The
  listening case I checked in the code only; there's no screen of a listen-only DNF book, so the
  tester should look at one.
- *Medal:* a DNF spine has a medal when the book was read before, as the Goal says and the
  orchestrator confirmed in the Log, not my "like Reading and Paused".

**Verdict: passes.** On to the tester.

# Test

Tester, 2026-11-21, on a fresh worktree of `t-0006-did-not-finish` (head `4374d24`), then
again after merging `origin/main` (T-0003, #198; the only conflict was the generated task
index, regenerated). The deploy-preview items were done on a local dev server instead (issue
#193): with no backend (shelf in the browser), and for saving with a throwaway local
PocketBase 0.40.6 on port 8511 with the repo's migrations and hooks.

**Commands**

- `npm ci`: `added 654 packages, and audited 655 packages in 1m`.
- `npm test` on the branch: `Test Files 49 passed (49)`, `Tests 338 passed (338)`. After the
  merge with main: `Test Files 52 passed (52)`, `Tests 349 passed (349)`.
- `npm run build`: `✓ built in 1.42s` (after the merge: `✓ built in 1.68s` / `1.26s`).
- Code-owned paths in `git diff origin/main...HEAD`: none (`shelfMerge.ts`, `server/shelf.ts`,
  `deploy/nas/`, `.github/`, `netlify*`, `CLAUDE.md`, `.claude/`, the guardrails untouched).

**Saving with a real PocketBase** (two and three browser contexts, one account):

```
1 server after sign-up:        x1:reading:0.42 y1:want z1:read
3 A panel stopped line:        Stopped at 42% · page 100 of 237
4 server after A marks DNF:    x1:dnf:0.42 (log=2) y1:want z1:read
5 B (second browser) signs in: x1:dnf:0.42 y1:want z1:read; panel "dnf | Stopped at 42% · page 100 of 237"
6 C local before (stale):      x1:reading:0.42 y1:want z1:read
7 server after stale C saves Piranesi: x1:dnf:0.42 (log=2) y1:reading z1:read
7b C after its save (took the server copy): x1:dnf:0.42 y1:reading z1:read
8b B after a reload:           x1:dnf:0.42 y1:reading z1:read
9 B dashboard block:           Give it another try / Circe / Madeline Miller / Stopped at 42% / Try again / Show on the shelf
```

The status survives a save and a load in a second browser, and a stale device saving another
book neither undoes it nor loses its reading log. No request left localhost except Google Fonts.

**The tests for the nightly sync and the ↻ refresh:** `didNotFinish.test.ts` runs the nightly
path through `syncedShelf` (what `server/nightly.ts` calls) and the refresh through
`importStorytelBooks` (what `useStorytelSync.ts` and Add book call). They cover: stays DNF when
Storytel says reading (same progress) or want; becomes Reading on new progress; becomes Read
on finished; the nightly sync leaves a DNF book and a paused book equal to what they were. I
also read the "other edition of a merged book" branch: `keepPaused` runs first, so the
edition's "reading" becomes `dnf` and the rank comparison doesn't move it. Sound; the only gap
is that "listened on" and "finished" are tested on the refresh only, not through
`syncedShelf`, which uses the same function.

**Screens, local dev server with no backend (1280 px and 320 px):**

- Header: before "5 books · 3 reading · 1 want to read · 1 read", after marking Circe
  "5 books · 2 reading · 1 want to read · 1 read · 1 did not finish".
- Panel: "Stopped at 42% · page 100 of 237", no progress slider (0 sliders). **The designer's
  ask, a book she only listens to** (Storytel, 625 min, 30.45%): "Stopped at 30.5% · 3 h 10 min
  of 10 h 25 min". The block shows "Stopped at 30.5%" for it.
- *Arrange by → Reading status* chosen in the menu: order Reading, Want to read, Did not finish;
  the walnut "Did not finish" sign; no bookmark on the DNF spines, a medal only on the one read
  before. (The developer's screenshot had the DNF nook before *Read* because its test shelf
  was never sorted through the menu, only given the arrangement; sorted, DNF comes last, as
  the unit test also says.)
- Search: "dnf", "DNF", "did not", "Did not finish" and "finish" each give "2 books".
- Streak and Calendar: strip before "🔥 2 days in a row · 1 read", after marking DNF the same;
  Calendar 20 and 21 November still say "Circe, you started it and read 47 pages" / "Circe, you
  read 52 pages".
- Block after *Try again*: "“The Hobbit audio” is back in Currently reading." then the next
  book, focus on its *Try again*; *Currently reading* lists the book.
- 320 px: very long title wraps, buttons 44 px and 44 px, page scroll width 320.
- A shelf saved before the change: the localStorage copy is byte-for-byte the same after load
  (`true`).

**Tried to break it**

- Every book "Did not finish": header line, block shows one, *Currently reading* "Nothing on
  the go right now.", *What next?* "No unread books waiting on the shelf.", streak kept;
  pressing *Try again* until none are left ends with "No books put aside." and focus on the
  heading. No errors.
- No DNF book: only the title and "No books put aside.", block 102 px high.
- *Try again* then undo (set it back to *Did not finish* in the panel): status, progress,
  times read, *Started on* and the reading log are exactly as before (`true`).
- Double-click on *Try again*: only one book moved back to Reading.
- The daily pick (device clock faked): 21 Nov noon and evening "Book two", 22 Nov "Book one".
  Across midnight with the page open, the block keeps the evening's book until the dashboard
  is shown again (going to the shelf and back shows the new day's book). Acceptable: it never
  changes under her hand.
- The only console error was the dev server's missing `/favicon.ico` (404), unrelated.

**Verdict: passed.**

# Log

- 2026-11-21 architect: Task written from #187, with the assumptions in the Goal.
- 2026-11-21 ux-designer: design written. "Did not finish", no colour of its own, "Stopped at
  42%" in the panel, the usual walnut nook sign, last on the shelf. The block "Give it another
  try" goes at the bottom of Today, changes daily, and has "Try again" and "Show on the shelf".
  Two choices for the architect to confirm: no medal on a DNF spine (like Reading and Paused),
  and the days already read stay in the streak and Calendar (the *Done when* line on the streak
  reads as removing them).
- 2026-11-21 orchestrator (recorded by the developer): the two open points. **Streak:** the days
  she already read a book stay in the streak and the Calendar after it is marked *Did not
  finish*; the designer's added *Done when* line replaces "left out of … the streak".
  **Medal:** none on a *Did not finish* spine unless the book was read before, as the Goal
  says (not the designer's "like Reading and Paused").
- 2026-11-21 developer: built on branch `t-0006-did-not-finish`. `'dnf'` in `ReadingStatus`
  ("Did not finish", last in the panel's list, the header line and *Arrange by → Reading
  status*, where its walnut sign comes from the existing status grouping); search finds it by
  "dnf" too; the panel shows "Stopped at N% · page X of Y" (or the listening time) instead of
  the slider; no bookmark, a medal only when read before (`hasMedal`, used by the spine and the
  3D medal). Storytel and the reading log treat it like *Paused* (`keepPaused`,
  `progressPatch`). New block "Give it another try" (`AgainCard.tsx`, `didNotFinish.ts`) at the
  bottom of Today's left column, one book a day in a fixed rotation. `shelfMerge.ts` and
  `server/shelf.ts` are unchanged: the status is a value of the book's existing `status`
  field, which the merge carries whole; tests prove the save merge, the nightly sync and the
  Storytel refresh keep it without changing other books. `npm test`: 45 files, 309 tests
  passed (27 new in `didNotFinish.test.ts` and `AgainCard.test.tsx`); `npm run build`: built.
- 2026-11-21 developer: draft PR #199. Screens from a local dev server with no backend at 320 px
  and 1280 px: header "5 books · 1 reading · 1 want to read · 1 read · 2 did not finish", the
  *Did not finish* nook last on the shelf, no bookmark, a medal only on the one read before;
  panel "Stopped at 42% · page 100 of 237" with no slider; the block shows one book, *Try
  again* moves it to *Currently reading* with its 42% and shows the next, then "No books put
  aside."; buttons 44 px high; no horizontal scroll. No code-owned path touched. Next: the UX
  designer's review.
- 2026-11-21 developer: checked the block against D-0013 (no pop-ups) and D-0014 (no
  explanatory hint texts), recorded on main in #204. No pop-up: the block sits on the dashboard
  and opens nothing by itself. The Design's last line "3 books put aside. Another one
  tomorrow." explains how the block works, which D-0014 rules out, so it is **left out**
  (decision over Design). Kept: "No books put aside." (an empty-block message, allowed), the
  "“…” is back in Currently reading." confirmation after *Try again* (feedback on her own
  action, not an explanation), and "Stopped at N%" (her data).
- 2026-11-21 ux-designer: reviewed: passes. Status, nook sign, panel line and block match the
  Design at 320 px and 1280 px; the dropped explanation line (D-0014), the app's page and time
  format, and the medal when read before are accepted. Next: the tester.
- 2026-11-21 tester: passed. Done-when items run locally (no backend, and a throwaway
  PocketBase for saving): the status survives a second browser and a stale device; listening
  line "3 h 10 min of 10 h 25 min"; 349 tests pass after merging main. Merged #199.
