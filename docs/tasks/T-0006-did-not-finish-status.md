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

# Test

# Log

- 2026-11-21 architect: Task written from #187, with the assumptions in the Goal.
- 2026-11-21 ux-designer: design written. "Did not finish", no colour of its own, "Stopped at
  42%" in the panel, the usual walnut nook sign, last on the shelf. The block "Give it another
  try" goes at the bottom of Today, changes daily, and has "Try again" and "Show on the shelf".
  Two choices for the architect to confirm: no medal on a DNF spine (like Reading and Paused),
  and the days already read stay in the streak and Calendar (the *Done when* line on the streak
  reads as removing them).
