---
id: T-0111
title: "Stop the cookie balance going below zero, and let a book be scanned onto the wishlist"
description: "The highest total of cookies ever earned rides in the choice log as one `place` event keyed `c:earned` and `earned` is never less than it, so correcting a past day cannot confiscate cookies she has spent; and BatchScan gains a wishlist mode, offered as 'Scan a book in a shop' on the Add to wishlist tab."
status: Doing
size: full
depends_on: []
decisions: [D-0033, D-0034, D-0053, D-0067, D-0079, D-0081, D-0082]
raised_on: 2026-11-26
done_on: ""
result: []
---

# Goal

Two things Hanna asked for on 26 November 2026, while the loading work (T-0098) was being built.

**"Have a look at how I got into negative cookies a few days ago."** Cookies are worked out from
her reading log and never stored, but what she spends is stored. So correcting a past day down to
nothing (T-0045), sliding a book's progress back, removing a book or merging two copies lowers
what she has earned beneath what she has already spent, and the balance goes below zero.
`creature.ts` had said so for weeks: *"may be below zero after a fix to a past day"*. It is the
same shape as the fact that came round twice (D-0079).

**"Being able to scan for wishlist books. Like when I am in the bookshop and seeing one I want to
read but not buy at that moment."** The scanner only ever added to the shelf, asking how she has
each book and what it cost; the Add to wishlist tab had no camera at all.

# Done when

- `pnpm test` and `pnpm run build` pass.
- A shelf whose log is lowered after spending keeps its balance: proved in
  `src/lib/creatures/cookieMark.test.ts` with the arithmetic that used to go negative.
- Scanning on the wishlist tab adds `wish: true`, asks nothing about formats, and says where the
  books are going: proved in `src/components/BatchScan.test.tsx`.
- On the preview: Hanna scans a book in a shop onto her wishlist, and her cookie balance does not
  move when she corrects a past day.

# Notes

- `src/lib/creatures/cookieMark.ts` (new), used by `deriveCreatures`; `src/components/useCookieMark.ts`
  keeps it up to date from the page, like `useFactMark` (D-0079 §4).
- `src/components/BatchScan.tsx` + `src/lib/batchScan.ts` gain `mode`; `src/components/AddBookDialog.tsx`
  offers it on the Wish tab.
- Nothing new is saved on the server: both ride the choice log's existing `place` route.

# Design

Nothing new to see about the cookies — the point is that a number stops moving when it shouldn't.
On **Add to wishlist**, a full-width *📷 Scan a book in a shop* above the search, opening the
scanner in place with *‹ Search instead* to go back; no "How I have it" chips, and the buttons
say "to the wishlist".

# Test

`pnpm test`: all green (counts in the pull request). `pnpm run build`: built.

- `src/lib/creatures/cookieMark.test.ts` — the mark is nothing on a fresh log; the **highest**
  wins, not the newest; the facts' mark and the other features' `place` events are left alone;
  nonsense counts are ignored; `mergeLogs` keeps it at one event after three moves; and the
  arithmetic that used to go negative (earned 120, spent 80, a day worth 50 corrected away) now
  comes out at 40 instead of −10.
- `src/components/BatchScan.test.tsx` — "scanning onto the wishlist": what it scans is added as a
  wish and never given a format, the How I have it group is not there, the button and the summary
  say "to the wishlist", and the ordinary shelf mode is untouched.

Remaining: Hanna confirms on the preview, with a book in a shop and a corrected day.

# Log

- 2026-11-26 architect: raised by Hanna mid-build; same root cause as D-0079 for the cookies.
- 2026-11-26 developer: cookieMark + useCookieMark; BatchScan `mode`, the Wish tab's scanner.
- 2026-11-26 tester: ran the suite and the build; the negative-balance arithmetic is a test now.
- 2026-11-26 tester: Remaining: Hanna confirms both on the preview.
