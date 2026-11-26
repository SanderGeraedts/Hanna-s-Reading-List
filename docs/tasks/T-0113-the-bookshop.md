---
id: T-0113
title: "Build Hanna's bookshop: an idle shop that trades while she is away, stocked by her reading"
description: "A dashboard block and a shop behind Open ›: her reading prints copies, customers turn them into coins while she is away, and coins buy eight things that change the numbers and the picture."
status: Doing
size: full
depends_on: []
decisions: [D-0084, D-0033, D-0034, D-0051, D-0067]
raised_on: 2026-11-26
done_on: ""
result: []
---

# Goal

Hanna asked for a cosy little bookshop that gets on with trading while she is not looking, and
that is about the books she has actually read. D-0084 settles what it is; this task builds it.

In her words: her reading stocks the shelves, customers buy while she is away, a full shop
trades for days and a bare one trickles, and the coins buy things she can see standing in the
shop afterwards. Away a week, she comes back to a week of trade. Nothing to collect, nothing
lost by not opening it.

Nothing new is saved on the server: coins and stock are worked out from her reading log and
the clock, and the eight things she can buy ride in the creatures choice log under `s:` keys
(D-0084 §5). No change in `deploy/nas/`, no new field on `Book`, nothing that waits for Sander.

# Done when

`pnpm test` and `pnpm run build` pass and `pnpm exec harness check` is green, with new tests
beside the new logic in `src/lib/bookshop/` that read the promises of D-0084 back in her words:
a week away is a week of trade, a bare shop trickles, the same moment always gives the same
shop, and the shop never spends a cookie or disturbs the garden or bingo.

# Notes

- New logic in `src/lib/bookshop/` with `*.test.ts` beside it; components in
  `src/components/bookshop/`.
- `src/styles.css` gets one block at the very end, under a comment naming D-0084.
- `BookshopCard` is self-contained: `{ books, log, record, accountId?, onOpen? }`. Registering
  it on the dashboard (`dashboardLayout.ts`, `Dashboard.tsx`, `routes/index.tsx`) is done by
  whoever owns those files — they were being worked on in parallel and are not touched here.
- `Cover` and `monthName` were not needed: the shop is drawn, so the spines are shapes in her
  books' own colours and there are no cover images and no month names in it.

# Design

**The block.** "Bookshop", with the small flat drawing of the shop as it stands, one sentence
of what sold while she was away ("3 copies of Babel sold while you were away."), the coins in
the till with what is on the shelves, and what she is saving up for. "Open ›" in the header,
like the Garden and My year blocks.

**The shop.** Opens over the dashboard as a modal, closed with Escape or ×, because her tab row
is full (D-0084 §8). The same drawing, larger; the till and what the shop draws and charges;
*While you were away* with the last seven days of trade, day by day, naming the titles; *On the
shelves* listing titles with their copies; *The shop* with the eight things, what each one does
and a Buy button that is disabled until she can afford it; and a short plain-English note
saying how the shop works and that there is nothing to collect.

**The drawing.** One inline SVG, 120 × 72, of plain shapes: wall, floorboards, a window on to
the street, shelf boards with the real copies as spines in her books' own colours, a counter,
and the customers the shop draws, browsing. Every bought thing stands in it — the sign over the
door, the till on the counter, the second shelf board, the reading chair, the window display,
the cat asleep on the counter, the lamp's glow, the tea counter with its cups. The customers
drift and the cat breathes; both stop with reduce motion. A shop with nothing on the shelves is
drawn bare, because it is.

# Test

The check as run, by the tester.

# Log

- 2026-11-26 architect: raised from the feature chat of 26 November; D-0084 records the design.
- 2026-11-26 developer: built `src/lib/bookshop/` (numbers, stock, upgrades, shop, words) with
  tests beside each, and `src/components/bookshop/` (ShopFlat, BookshopCard, BookshopShop,
  useBookshop) with a component test. `pnpm test` and `pnpm run build` pass.
- 2026-11-26 developer: Remaining: the block is not registered on the dashboard yet —
  `src/lib/dashboardLayout.ts`, `src/components/Dashboard.tsx` and `src/routes/index.tsx` are
  owned by work going on in parallel, and the three lines they need are in the hand-over.
