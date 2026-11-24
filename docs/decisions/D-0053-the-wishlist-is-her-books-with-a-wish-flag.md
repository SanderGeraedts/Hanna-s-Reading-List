---
id: D-0053
title: "The wishlist is her own books with a wish flag, kept out of everything the shelf counts by one filter"
description: "A wish is a normal Book with wish: true, so it rides along with the shelf and syncs with no change to how a shelf is saved or merged; the page filters the library once into shelf books and wishes, and everything that counts (the shelf, the pile, stats, suggestions, the map, challenges, badges, creatures and the garden) is given the shelf books only; I bought it clears the flag and re-dates the book to today."
status: Accepted
date: 2026-11-23
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [data, dashboard, add-book, wishlist]
---

# Context

In a feature chat on 22 November 2026 Hanna asked for a wishlist: books she wants to buy,
with a cover, a title, a price and a link to buy them, in a dashboard block and in **+ Add**,
**not** on the shelf and not counted in anything. Backlog item AD3 records the brief,
including "Stored with her books and synced (an optional field or flag, D-0002), unless that
needs a server change: then flag it for Sander, or pick another way."

There are three ways to keep a wishlist:

1. **A second collection on the account server at Sander's home.** It would need a new
   collection, a migration in `deploy/nas/pb_migrations/` and new server functions in
   `src/server/`. That is the guardrails' *Needs Sander* group and a path only he may
   approve (`.github/CODEOWNERS`).
2. **Its own store in the browser only.** No server work, but the wishlist would not follow
   her from her phone to her computer, which is the whole point of a list she shops from.
3. **A flag on a `Book`.** `Book.wish?: true`. A wish is a book in the same JSON shelf, so
   it is saved, merged and synced by exactly the code that is there now
   (`src/lib/shelfMerge.ts`, `src/server/shelf.ts` — neither changes). D-0002 already says
   new fields on `Book` are optional, and D-0042 did the same for tropes and characters.

The risk of (3) is not storage, it is **counting**: a wish must not appear in the TBR pile,
the statistics, the suggestions, the world map, the challenges, the badges, the creatures or
the Reading Garden. About thirty blocks and pages read `books`. Filtering in each of them
would be thirty chances to forget one, now and in every feature after this.

# Decision

- **A wish is a `Book` with `wish: true`** and otherwise normal fields; `price` is what she
  expects to pay and `buyUrl` is where to buy it (an `https://` or `http://` link, checked
  like `ebookUrl`, D-0002 / #185). No new collection, no migration, no change to
  `shelfMerge.ts`, `src/server/shelf.ts` or the load/save/sync part of `library.ts`. This
  stays in guardrail group 1.
- **The library is split once, at the top of the page** (`src/routes/index.tsx`), into
  `books` (everything without the flag) and `wishes` (everything with it). Everything that
  counts, draws or suggests is given `books`. Only the Wishlist block, the + Add dialog's
  duplicate check and the sync hooks see the whole library.
- **The split is a named helper** (`shelfBooks` / `wishBooks` in `src/lib/wishlist.ts`), not
  an inline `filter`, so a future feature has one obvious thing to call and one test to read.
- **"I bought it ›" clears the flag and re-dates the book:** `wish: undefined` and
  `addedAt: Date.now()`, so the book joins the shelf *today* — the "Newly added" block, the
  pile's 14-day wait and the buying jar all count from the day it arrived, not from the day
  she wished for it. Her wish price is carried into the follow-up's price field, where she
  can change it; the buying jar then spends it under D-0024's rules.
- **A wish never spends from the 📚 buying jar** and never earns a coin, because the jar is
  worked out from `books`.

# Rationale

A flag is the only one of the three that both syncs and needs nothing from Sander. The
counting risk is real but it is a *one-place* risk: one filter at the top of the page is
easier to get right, and far easier to test, than thirty filters at the bottom. It is also
the cheapest to reverse — a wish is already a book, so dropping the wishlist means dropping
a flag, not moving data out of a collection.

# Consequences

- One optional field (`wish`) and one more (`buyUrl`) on `Book`; older shelves load unchanged
  (D-0002).
- A new block, feature or page added after this gets `books` and therefore excludes wishes by
  default. A feature that *wants* the wishes must ask for them.
- Merging two copies of a book (`merge.ts`, D-0009) takes **the kept copy's `wish`**, full
  stop — not "else the other's" — so merging a wish into a shelf book never drags the flag
  back on, while merging two wishes stays a wish. `buyUrl` is ordinary information and is
  the kept copy's, else the other's. Both are covered by a test.
- A wish counts towards the 5.5 MB sync limit like any book, so an uploaded wish cover is as
  expensive as an uploaded book cover.
- If the wishlist ever has to hold something a `Book` cannot (several shops per wish, a price
  history), that is a new decision and probably a question for Sander.

# Guidance for agents

- Never read the library straight out of `useLibrary` for anything that counts. Take `books`
  from the page, which is already `shelfBooks(allBooks)`.
- A new dashboard block, challenge, badge, statistic or 3D scene needs no wishlist code: it
  is given `books` and is already right. Don't add a `.filter((b) => !b.wish)` of your own.
- When you add a feature that must see the wishes (an export, a second wishlist view), take
  `wishes` from the page, don't re-filter `allBooks`.
- `buyUrl` goes through `cleanBuyLink` / `buyHref` on the way in **and** on every render, like
  `ebookUrl`: a link from another device is never put in an `href` unchecked.
- Don't reuse the name "wish" for *Make a wish* (`src/lib/wish.ts`, the ⭐ button). The
  wishlist is `wishlist.ts`.
