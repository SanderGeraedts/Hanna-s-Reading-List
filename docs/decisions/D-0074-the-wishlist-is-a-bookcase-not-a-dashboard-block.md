---
id: D-0074
title: "The wishlist is a fifth bookcase on the shelf, not a dashboard block"
description: "BOOKCASES gains Wishlist, inBookcase keeps wishes out of the other four and lets only wishes into that one, the shelf page hands the wishes to the shelf for that bookcase alone, the book panel grows a Wishlist row with the price, Buy and I bought it, and the WishlistCard dashboard block is removed with its id, which cleanLayout drops from a saved layout."
status: Accepted
date: 2026-11-24
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [wishlist, bookshelf, book-panel, dashboard]
---

# Context

Hanna asked (24 November 2026) for "a case for the wishlist instead of a dashboard block". The
wishlist arrived as one dashboard block (T-0072, D-0053): a wish is an ordinary `Book` with
`wish: true`, and the page splits the library once — `shelfBooks()` to everything that counts,
`wishBooks()` to the block — which is what keeps a wish out of the statistics, the challenges,
the garden and the creatures without a line of code in any of them.

A bookcase is where she already switches between All · Read · To read · Digital (D-0046), and
wishes are books she wants to see as books, with covers and spines. The risk is the split: if
the wishes simply joined the shelf, every count in the app would be wrong.

# Decision

1. **A fifth bookcase, `wish`, labelled "Wishlist"**, last in `BOOKCASES`.

2. **`inBookcase` is the only gate.** It answers `false` for a wish in `all`, `read`, `want` and
   `digital`, and `true` **only** for a wish in `wish`. So even a page that hands it the whole
   library can never put a wish on the shelf by accident.

3. **The split stays exactly where it is.** The page still computes `shelfBooks()` and
   `wishBooks()` once, and still gives the shelf books to everything that counts, draws or
   suggests. The one thing that changes: the books the shelf *draws* are taken from the whole
   library, which `inBookcase` then narrows. The wishes reach the shelf and nothing else.

4. **The count line is the wishlist's own.** With the Wishlist bookcase on, the header line
   reads `wishCountText` — "3 books · €41.48" — instead of counting her shelf.

5. **What the block could do, the book panel can do.** When the open book is a wish, the panel
   shows one **Wishlist** row at the top of Details: its price, **Buy ›** (the same
   https/http-only `buyHref`, D-0053), **I bought it ›** (`boughtPatch`: it joins the shelf
   today and the follow-up opens, as the block did) and **Remove from the wishlist**. Nothing
   she could do with a wish is lost with the block.

6. **The `wishlist` block and `WishlistCard` are removed**, block id and all, the way D-0016
   removed four blocks. A saved layout or a starred favourite that still names `wishlist` is
   dropped by `cleanLayout` — it keeps working, the block is simply gone — so no migration and
   nothing new is saved.

7. **A wish is still not on the pile.** It is in no sort, no search result for the shelf, no
   suggestion and no challenge; `readNextChoices`, the badges, the garden and the creatures see
   `shelfBooks()` as they always did.

# Rationale

Putting the gate in `inBookcase` rather than in the page is what makes this safe: the dangerous
version of this feature is one where some other page forgets to filter. Here forgetting is
impossible — the only way onto the shelf is through `inBookcase`, and it says no.

Moving the wish's buttons into the panel is what lets the block go. The panel is already where a
book's details are changed, and a wish opened from the Wishlist bookcase is a book being looked
at.

# Consequences

- The shelf page's `selected` is looked up in the whole library, so a wish can open its panel.
- A reorder from the shelf is mapped against the whole library instead of the shelf books, which
  also stops wishes being pushed to the end of the library on every rearrange.
- `WishlistCard.tsx` and its tests go; `Wishlist.bought.test.tsx` moves to the panel.
- Her wishlist is one tap further from the dashboard, and one tap closer to her books.
