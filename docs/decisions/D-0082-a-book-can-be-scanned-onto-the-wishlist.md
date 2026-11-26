---
id: D-0082
title: "A book can be scanned straight onto the wishlist, in the shop, without being bought"
description: "The Add to wishlist tab gains the same scanner the shelf uses, in a wishlist mode: a scanned book is added with `wish: true`, it is never asked how she has it, and the wording says where the books are going."
status: Accepted
date: 2026-11-26
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [wishlist, adding, phone]
---

# Context

Hanna, 26 November 2026: *"being able to scan for wishlist books. Like when I am in the bookshop
and seeing one I want to read but not buy at that moment that I can put it there."*

The scanner existed but only ever added to the **shelf**: `BatchScan` (T-0071) scans a pile,
asks **How I have it** and what each cost, and puts them on the shelf as books she owns. The
**Add to wishlist** tab (T-0072) had a search and a small *By hand* form and no camera at all.
So the one moment she most needs a barcode — standing in a shop with a book she isn't buying —
was the one the scanner didn't cover.

# Decision

1. **The scanner gets a wishlist mode.** `BatchScan` takes `mode: 'shelf' | 'wish'`; in `wish`
   mode every book it adds carries `wish: true`. The same camera, the same lookups, the same
   list, the same rules — one flag, not a second scanner.

2. **A wish is never asked how she has it.** A wish is not owned, so the **How I have it** chips
   are not shown and no format is written. The price field goes with them: in a shop she wants
   the book on the list, not a form. She can add the price afterwards, where the wishlist
   already shows and adds it up.

3. **The wording says where they are going**: "Add all 3 books to the wishlist", and afterwards
   "Added 3 books to your wishlist."

4. **Where it is**: the first thing on the **Add to wishlist** tab, a full-width
   *📷 Scan a book in a shop*, because that is where she is standing when she needs it. It opens
   the scanner in place with *‹ Search instead* to go back.

# Rationale

Reusing `BatchScan` keeps one scanner with one set of rules and tests; a second one would drift.
Leaving out the formats and the price is what makes it quick enough to use while holding the
book in a shop, and neither is lost — a wish's price lives on the wishlist already.

# Consequences

- `addAllLabel` and `addedText` take the mode; called without it they say exactly what they said.
- Nothing is saved differently: a scanned wish is an ordinary `Book` with `wish: true` (D-0053),
  so it is in the Wishlist bookcase (D-0074) and counted nowhere.
