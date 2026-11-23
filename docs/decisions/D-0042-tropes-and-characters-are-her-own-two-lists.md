---
id: D-0042
title: "Tropes and characters are two optional lists on a book, matched case-insensitively, and her own words join the ready list"
description: "A book gets optional tropes?: string[] and characters?: Array<{ name, fav? }>; a trope is stored once in the spelling it first got, a trope she types herself joins the suggestions for every other book, characters are per book with a ♥ for favourites, and both ride along with the shelf like genres without any change to how a shelf is saved or merged."
status: Accepted
date: 2026-11-23
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [book, tropes, characters, search, badges, challenges]
---

# Context

Hanna asked on 22 November 2026 for tropes and characters per book: tropes as chips from a
ready list plus her own words, characters as names with a ♥ for her favourites, and both used
in the shelf search, a new dashboard block, Make a wish, badges and her own challenges.

Two things had to be settled before anything is built.

**Does this need Sander?** No. A shelf is saved as whole books: `saveShelf` hands the books
to `mergeIntoServer`, which compares whole book objects and never looks at single fields, and
PocketBase's `books` field is plain JSON. So a new optional field rides along with the shelf
by itself, and nothing in `src/lib/shelfMerge.ts` or `src/server/shelf.ts` — the two paths
only Sander may approve — has to change. The same is true for her own challenges: the server
validates them with `cleanChallenges` from `src/lib/ownChallenges.ts`, which is not a
code-owner path, so a new rule kind is an app-side change.

**How do two spellings of one trope meet?** "enemies to lovers", "Enemies to Lovers" and
"Enemies to lovers" are one trope to her and three to a computer. Genres already solved this
(`addGenre` in the book panel reuses an existing spelling), and tropes need the same, but
harder: tropes are also counted for badges, the dashboard block and a challenge rule, so the
comparison must live in one place and not in the panel.

# Decision

1. **Two new optional fields on `Book`** (D-0002, so older shelves still load):
   ```ts
   /** story tropes, hers and from the ready list; one spelling per trope, see tropes.ts */
   tropes?: string[]
   /** the characters of this book; `fav` marks a favourite (♥) */
   characters?: Array<{ name: string; fav?: boolean }>
   ```
   Both are left out entirely when empty — never `[]` — so a book she has not tagged is
   byte-for-byte what it was.
2. **They sync like genres: not at all, specially.** They are part of the book, so they go up
   and down with the shelf, merge book-by-book on `editedAt` like every other field, and need
   no change to `shelfMerge.ts`, `server/shelf.ts` or `deploy/nas/`.
3. **A trope is matched folded** — trimmed, inner whitespace collapsed to one space, compared
   lower case and accent-free — everywhere: in the book panel, in search, in the dashboard
   block, in the badges, in Make a wish and in the challenge rule. The folding lives in one
   module, `src/lib/tropes.ts`, and nothing compares trope strings by itself.
4. **The spelling that is kept is the one it first got on her shelf.** When she types a trope
   that folds to one already used on another book (or one from the ready list), the book gets
   that existing spelling, not what she typed. So "ENEMIES TO LOVERS" on a new book is saved
   as "Enemies to lovers". A trope that is new to the shelf keeps her capitalisation, with
   only the first letter made a capital when she typed it all lower case.
5. **The ready list is a constant** (`READY_TROPES` in `tropes.ts`), long enough to be useful
   on day one and short enough to read: enemies to lovers, found family, slow burn, chosen
   one, fake dating, grumpy/sunshine, morally grey, forced proximity, friends to lovers,
   second chance, love triangle, one bed, secret identity, redemption arc, coming of age,
   quest, heist, time loop, unreliable narrator, dual timeline, locked room, academic rivals,
   marriage of convenience, touch her and you die. **Her own words join the list** by being
   on a book: the suggestions under the field are the ready list plus every trope in use on
   the shelf, exactly as genres already work (`genreSuggestions`).
6. **Characters are per book and plain.** A name and a ♥; no list shared between books, no
   merging of characters across books, no roles or notes. The same name twice on one book is
   refused (folded the same way); the same name on two books is simply two entries, and the
   dashboard block counts the ♥ ones across books by the folded name.
7. **Where they are used** — all of it app-side:
   - **Shelf search:** a trope or a character name matches its book, with the matched trope or
     character as the hit's hint.
   - **A new dashboard block "Tropes & characters"** (`tropes`), in *Fun & memories*: her
     most-read tropes (from finished books) and her favourite characters with their book's
     cover. It hides itself while she has neither, like the other empty-aware blocks.
   - **Make a wish:** a trope is a fourth wish next to length, genre and language, offered
     only when the books she could read next have tropes.
   - **Badges:** one family, `trope-5` / `trope-10` / `trope-25`, earned when 5, 10 or 25
     **different finished books share one and the same trope**; the card names the trope she
     earned it with. Deliberately *not* one badge per trope: that would put two dozen
     permanently locked medals in the grid, and it would mean the badge list changed every
     time she invents a word.
   - **Her own challenges:** a new rule kind `trope`, picked from the tropes on her shelf,
     counting like the genre rule does.
   - **Bingo stays as it is.**
8. **Nothing looks a trope or a character up anywhere.** No Open Library, no Storytel, no
   guessing from the back text. They are hers, typed by her, like Set in once she edits it
   (D-0023) and unlike genres.

# Guidance for agents

- `src/lib/tropes.ts` owns: `READY_TROPES`, `foldTrope(s)`, `tropeSuggestions(books)`,
  `canonicalTrope(typed, books)` (point 4), `addTrope` / `removeTrope` patches, `hasTrope`,
  and `tropeCounts(books)`. Anything that needs to compare, count or suggest a trope calls
  into it. Characters get `src/lib/characters.ts` with the same shape for names.
- A book with no `tropes` and one with `tropes: []` must behave identically everywhere; write
  the test for the second one too, because a shelf saved mid-feature can hold it.
- The challenge rule kind goes in `RULE_LABELS` as **"A trope"**, and `cleanChallenges` keeps
  it. The server imports that same function, so an older app sending an older list stays
  valid and a newer list is accepted by the server with no deploy of its own.
- The badge family counts **different books**, by their first finish day, so re-reads of one
  book never move it on; use `finishedBooks` in `badges.ts`, not `finishes`.
