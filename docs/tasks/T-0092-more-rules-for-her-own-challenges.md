---
id: T-0092
title: "Let her own challenges count pages or hours, go by author, decade, trope or 4+ stars, and combine two rules with AND"
description: "The New challenge form gains a unit next to the number (books, pages or hours), the rule list gains By author, By decade, Rated 4+ (next to the existing A trope) and an 'and also' row that adds a second rule both of which must hold; everything is encoded in optional fields that cleanChallenges keeps, so src/server/shelf.ts is untouched and challenges saved before this read unchanged."
status: Open
size: full
depends_on: [T-0090]
decisions: [D-0002, D-0008, D-0014, D-0020, D-0025, D-0042, D-0060, D-0062]
raised_on: 2026-11-23
done_on: ""
result: []
---

# Goal

Backlog item **CH3**, agreed with Hanna on 22 November 2026: her own challenges should also be
able to ask for

- a goal in **pages or hours** instead of books,
- books **by one author**,
- books from one **decade published**,
- books with one **trope** (already there, D-0042),
- books she **rated 4 or more**,
- and **two rules at once**, both of which must hold.

The backlog warned that this might need the shelf server function, which only Sander may
approve. It does not: the server's only check is `cleanChallenges`, which lives in
`src/lib/ownChallenges.ts` — not a code-owner path — and `src/server/shelf.ts` imports it.
**D-0062** records that, the exact saved shape, and the limits.

# Done when

1. `pnpm test`, `pnpm run build` and `pnpm exec tsc --noEmit` pass, and `pnpm exec harness check`
   passes.
2. **`src/server/shelf.ts` is not changed by this task** (`git diff --stat` in the pull request
   shows it untouched), and neither is `src/lib/shelfMerge.ts`, `deploy/nas/`, `.github/` or
   `netlify/`.
3. New tests in `src/lib/ownChallenges.test.ts` for the saved shape:
   - **a challenge saved before the new rules** — `{ id, name, target, year, rule: 'genre',
     value: 'Fantasy' }` with no `unit`, no `and` — survives `cleanChallenges` unchanged, byte
     for byte, and counts exactly as it did;
   - a challenge with `unit: 'pages'` and one with `unit: 'hours'` survive; `unit: 'books'`
     and `unit: 'nonsense'` are **left out** (books is the default and is never written);
   - `and: 'author'` with `andValue` survives; `and: 'any'`, `and` equal to `rule` with the
     same value, `and: 'finishseries'`, and `and` needing a value with none are all **dropped**
     (the challenge stays, its `and` goes);
   - `target` up to 500 for books and up to 100000 for pages and hours; 0, -1, 1.5 and
     1000001 are refused;
   - round-tripping a challenge through `JSON.parse(JSON.stringify(cleanChallenges(...)))`
     gives the same object.
4. New tests in `src/lib/ownChallenges.rules.test.ts` for the counting:
   - **by author**: `Sarah J. Maas` and ` sarah j. maas ` are one author; only the first author
     counts; a book with no authors counts for none;
   - **by decade**: `1990` counts a book published 1990 and 1999 and not 1989 or 2000; a book
     with no year counts for none; `b.year` wins over `b.published` exactly as `pubYear` says;
   - **rated 4+**: 4 and 5 count, 3 does not, no rating does not, and a rating of 6 from a
     broken shelf is cleaned first;
   - **a trope** still counts as D-0042 says, folded;
   - **AND**: `genre: Fantasy` and `author: Sarah J. Maas` counts only the books that are both;
     an AND where **nothing matches** gives `0 of 5` with an empty book list and no crash;
   - **a pages goal of 1** is complete as soon as one fitting book with any pages is finished,
     and its bar is full, not 300 % wide;
   - **a pages goal** adds `thicknessPages` (a book she only listens to brings its minutes,
     D-0008), and an **hours goal** adds `minutes / 60` and ignores a fitting book with no
     minutes;
   - sleep reads never count, in any unit, with or without an AND (D-0025's neighbour rule for
     challenges).
5. New tests in `src/components/OwnChallenges.test.tsx`:
   - the form has **Name**, **How many** + a **unit** `select` (Books / Pages / Hours), **What
     counts** and, when the rule needs one, **Which**;
   - choosing **and also** adds a second rule row with its own **Which**, and **Remove** takes
     it away; the second row's rule list leaves out *Any book* and *Finish a series*;
   - **Save** is disabled while a chosen rule has no value, including the second rule;
   - saving writes no `unit` for Books and no `and` when the row is empty;
   - changing the first rule to the same as the second clears the second (no rule twice);
   - the card's line reads `Fantasy books by Sarah J. Maas`, `Books from the 1990s`,
     `Books you rated 4+`, `Fantasy books you rated 4+`, and the count line reads
     `1,250 of 2,000 pages` / `9 of 20 hours` / `3 of 5`;
   - a **saved challenge from before the new rules** opens in **Change** with Books selected
     and no second rule, and saving it again does not add either field.
6. A trope she later **renames**: a `trope` challenge keeps the spelling it was saved with, and
   because tropes are matched folded (D-0042 §3) it keeps counting the books whose trope folds
   the same; a test covers a challenge saved as `enemies to lovers` counting a book tagged
   `Enemies to Lovers`. If she renames a trope to something genuinely different, the challenge
   counts 0 and says so, rather than silently following the rename — a test asserts that too.
7. Keyboard and screen reader: every field has a `<label>`; the **and also** row is announced
   as part of the form (`aria-label="What else counts"`); **Save** states why it is disabled
   through the field's own validity, not a hint text (D-0014).
8. The UX designer has reviewed the built form and cards at 390 px and 1280 px on both
   wallpapers and written the review in *Design*.

# Notes

- Files: `src/lib/ownChallenges.ts` (the shape, the rules, the units, `ruleText`),
  `src/components/OwnChallenges.tsx` (the form and the card), `src/styles.css`. **Not**
  `src/server/shelf.ts`.
- Reuse: `authorKey` and `pubYear` from `src/lib/bingo.ts`, `cleanRating` from
  `src/lib/ratings.ts`, `thicknessPages` from `src/lib/listening.ts`, `hasTrope` /
  `shelfTropes` from `src/lib/tropes.ts`.
- `needsValue` becomes a per-rule table, because `rating4` needs none while `author`,
  `decade`, `genre`, `trope`, `language`, `format`, `series` and `finishseries` do.
- `fits()` keeps one `case` per rule kind; the AND is `fits(rule) && fits(and)` over the same
  book, not a second code path (D-0062).
- The unit affects only how much a fitting book contributes, never which books fit.
- Don't touch the page tab row: a sibling branch adds a **Stats** tab.

# Design

To be written by the UX designer.

# Test

To be written by the tester.

# Log

- 2026-11-23 architect: wrote CH3 as a full task; recorded D-0062 (the saved shape, the five rules, the AND and the limits, all app-side: src/server/shelf.ts is untouched, so nothing waits for Sander). Hand to the UX designer.
