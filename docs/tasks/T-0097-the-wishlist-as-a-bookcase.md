---
id: T-0097
title: "Make the wishlist a bookcase on the shelf and take its dashboard block away"
description: "BOOKCASES gains Wishlist, inBookcase keeps wishes out of the other four and lets only wishes into that one, the header counts the wishlist in its own words, the book panel grows a Wishlist row with the price, Buy and I bought it, and the WishlistCard block and its id are removed."
status: Doing
size: full
depends_on: []
decisions: [D-0046, D-0053, D-0074]
raised_on: 2026-11-24
done_on: ""
result: []
---

# Goal

Hanna asked for "a case for the wishlist instead of a dashboard block". Her wishes are ordinary
books with `wish: true` that the page keeps away from everything that counts by splitting the
library once (D-0053). They should stand on the shelf as books, in a bookcase of their own,
without ever leaking into a count.

# Done when

- `pnpm test` passes, with new cases in `src/lib/shelfFilter.test.ts` that a wish is in no
  bookcase but `wish`, and that no shelf book is in `wish`.
- A panel test that a wish shows Buy, I bought it and Remove, and that "I bought it" moves the
  book to the shelf today.
- On the preview: the Wishlist bookcase shows her wishes with their covers and the line
  "3 books · €41.48"; the dashboard has no Wishlist block; All shows no wish.

# Notes

- `src/lib/shelfFilter.ts` (`BOOKCASES`, `inBookcase`), `src/routes/index.tsx` (what the shelf is
  given, `selected`, `reorderShelf`, the count line, the bought follow-up),
  `src/components/BookPanel.tsx`, `src/lib/dashboardLayout.ts`, `src/components/Dashboard.tsx`.
- `WishlistCard.tsx`, `WishlistCard.test.tsx` and `Wishlist.bought.test.tsx` go or move.

# Design

The switch gains **Wishlist** at the end. With it on, the shelf is her wishes and the header line
is `wishCountText`. The panel of a wish opens with a **Wishlist** row at the top of Details: the
price, **Buy ›**, **I bought it ›** and **Remove from the wishlist**.

# Test

`pnpm test`: 197 files, 2456 tests passed (22 skipped). The new cases:

- `src/lib/shelfFilter.test.ts` — "the Wishlist bookcase": it is last on the switch; it holds
  her wishes and nothing else; a wish is in **no** other bookcase whatever its status or format;
  the whole library narrows correctly for All and for Wishlist; and the filters still narrow the
  wishlist.
- `src/components/Wishlist.bought.test.tsx` — the same nine checks the block had, now against
  the panel's wish row, plus the row itself: the price line, a Buy link that is http(s) only
  (`javascript:` gives no button), Remove, and focus coming back to the open book's title when
  the follow-up closes.
- `src/lib/dashboardLayout.test.ts` — the block id is gone, and a layout or a star that still
  names `wishlist` loads with everything else of hers kept.

Tried to break it: a wish set to `status: 'read'` with an `ebook` format is still in no
bookcase but Wishlist, which is the one thing that must never go wrong. Seen on the running app:
the Wishlist bookcase shows the wishes with the line "3 books · €41.48", and All shows none of
them.

Remaining: Hanna confirms on the preview that her wishlist is right, and that she does not miss
the block on the dashboard.

# Log

- 2026-11-24 architect: raised by Hanna with #271/#272, sized full, D-0074 recorded.
- 2026-11-24 ux-designer: Wishlist last on the switch, the wishlist’s own count line, and the wish row at the top of Details.
- 2026-11-24 developer: inBookcase as the only gate, the whole library to the shelf, WishRow in the panel, the block and its id removed.
- 2026-11-24 tester: ran pnpm test and pnpm run build, both pass; the bookcase and its count line checked on a screenshot.
- 2026-11-24 tester: Remaining: Hanna checks on the preview that her wishlist is right and that she does not miss the block.
