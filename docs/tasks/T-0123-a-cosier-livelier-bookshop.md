---
id: T-0123
title: "A cosier, livelier bookshop that shows off her books"
description: "The bookshop's second edition (D-0091): a quicker start, sixteen things to buy, staff picks, best sellers and a book of the week, a board of kind customer notes, and a moving room that turns to evening, shows the garden's weather and decorates for the season."
status: Doing
size: full
depends_on: []
decisions: [D-0033, D-0039, D-0083, D-0084, D-0091]
raised_on: 2026-11-27
done_on: ""
result: [https://github.com/SanderGeraedts/Hanna-s-Reading-List/pull/281]
---

# Goal

Hanna asked for more of the bookshop: a quicker start, more to save up for, a way to show off
the books she loves, and a shop that feels alive. Everything she chose is in D-0091, which adds
to D-0084:

- 4 coins a copy and cheaper first buys, counted from opening day;
- eight more things to buy (sixteen in all), each visible in the picture;
- up to three staff picks in the window, +1 coin per copy sold while picked;
- best sellers with a ribbon and a book of the week;
- kind, made-up customer notes on a board, every note kept, newest first;
- a wider room where customers come and go, evening from 19:00 to 07:00, the garden's weather
  in the window, and decorations for Sinterklaas, Christmas, autumn and her birthday;
- tap a shelf to zoom in, tap a book to see copies left;
- the dashboard block stays still and adds one note and the book of the week.

# Done when

- `pnpm exec vitest run src/lib/bookshop` passes, and `pnpm test` and `pnpm run build` pass.
- Picking, unpicking and re-picking a book never lowers her coins.
- Hanna opens her shop on the preview or the live site and it is what she asked for.

# Notes

- Logic: `src/lib/bookshop/numbers.ts`, `picks.ts`, `shop.ts`, `season.ts`, `words.ts`.
- Picture: `src/components/bookshop/ShopFlat.tsx`, `BookshopShop.tsx`, `useShopScene.ts`.
- Only `s:` keys in the creatures choice log are written; nothing needs Sander.

# Design

Agreed with Hanna in a feature chat on 27 November 2026; see D-0091 §6 and §7 for the room,
the evening, the weather and the decorations.

# Test

The bookshop tests, the full suite and the build run locally; see *Log*.

# Log

- 2026-11-28 developer: shop logic built on `fix/unfinished-bits` (quicker start, eight more things, staff picks, best sellers, the notes board); D-0091 recorded.
- 2026-11-28 developer: the moving picture, evening and decorations built.
- 2026-11-28 tester: `pnpm test`: 220 files passed, 2 skipped; 2809 tests passed, 22 skipped. `tsc --noEmit` clean, `harness check` all ✓, `pnpm run build` ✓. Screenshots of every page at phone and computer size, 13:00 and 21:00, full and empty shelf, looked at. An independent review found three bugs (a pick taken out lost the day's extra coins; More › Bookshop could open the shop later by itself; old layouts kept lone section headings); all three fixed with tests.
- 2026-11-28 developer: merged in #281 and live on the site.
- 2026-11-28 developer: Remaining: Hanna checks it on the preview/live site.
