---
id: D-0062
title: "Her own challenges get a goal unit, five more rules and one AND combination, all inside the shape the server already accepts"
description: "A challenge keeps its id, name, target, year, rule and value and gains three optional fields — unit (books, pages or hours), and (a second rule that must hold too) and andValue — all kept by cleanChallenges in src/lib/ownChallenges.ts, which the server function imports, so src/server/shelf.ts and deploy/nas/ are untouched; a challenge saved before this reads as unit books with no second rule."
status: Accepted
date: 2026-11-23
decided_by: architect
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [challenges, server, sync]
---

# Context

Hanna agreed CH3 on 22 November 2026: her own challenges should also be able to ask for a
goal in **pages or hours** instead of books, and to count by **author**, by **decade
published**, by **trope**, **rated 4 or more**, and to **combine two rules** (both must hold).
The trope rule already exists (D-0042 §7).

The backlog warned that `saveChallenges` lives in `src/server/shelf.ts`, which is a
code-owner path (only Sander may approve it), and asked whether the server checks rule kinds.
It does — but it checks them by calling `cleanChallenges` **from
`src/lib/ownChallenges.ts`**, which is not a code-owner path:

```ts
// src/server/shelf.ts
import { MAX_CHALLENGES, cleanChallenges, type OwnChallenge } from '#/lib/ownChallenges'
```

`src/server/shelf.ts` is a TanStack Start **server function**, deployed with the app on
Netlify, not code on the server at Sander's home. PocketBase's `challenges` field is plain
JSON and no hook in `deploy/nas/` looks inside it. So a new rule kind or a new optional field
on a challenge rides along the moment the app deploys: **nothing in this needs Sander, and
`src/server/shelf.ts` is not touched.** D-0042's *Context* found the same thing for the
`trope` rule, and that is live.

# Decision

1. **The saved shape keeps every field it has** and gains three optional ones:
   ```ts
   export interface OwnChallenge {
     id: string
     name: string
     target: number          // how many books, pages or hours
     year: number
     rule: RuleKind
     value?: string
     /** what the target counts; left out means 'books' */
     unit?: 'pages' | 'hours'
     /** a second rule that must hold as well (AND) */
     and?: RuleKind
     /** the second rule's value, when it needs one */
     andValue?: string
   }
   ```
   Every new field is **left out when it is the default**, so a challenge she made before
   this is byte-for-byte what it was, and a challenge made now is a plain books challenge
   unless she chose otherwise (the same rule as D-0042 §1).
2. **Five more rule kinds:** `author`, `decade`, `rating4`, plus the existing `trope`, and
   `finishseries` (D-0061 §4). `rating4` needs no value; `author` and `decade` pick from the
   shelf like `genre` does.
   - `author` matches the book's **first** author, trimmed and lower case, as
     `authorKey` in `bingo.ts` already does, so two spellings of one name are one author.
   - `decade` is the published decade from `pubYear(book)` (`bingo.ts`): `1990` means
     1990–1999. A book with no year counts for no decade.
   - `rating4` is `cleanRating(book.rating) >= 4`.
3. **The AND combination is exactly two rules.** `and` may not be `any` (that would say
   nothing), may not equal `rule` with the same value, and may not be `finishseries`
   (a series challenge is its own card, D-0061 §4). A book counts only when **both** rules
   fit it. There is no OR and no third rule.
4. **Units.** `books` counts the books that fit, as today. `pages` adds up `thicknessPages`
   of each fitting book (a book she only listens to contributes its minutes as pages, as
   everywhere else on the shelf, D-0008). `hours` adds up listening time only
   (`book.minutes / 60`) for the fitting books that have minutes; a book without minutes adds
   nothing. The limits stay: `target` 1…500 for books, and up to `MAX_TARGET_BIG = 100000`
   for pages and hours, so "1000 pages" is possible and a typo cannot make a 10-million-page
   goal.
5. **A saved challenge whose rule this version does not know is dropped**, exactly as today —
   `cleanChallenges` keeps only known kinds. A newer device therefore never makes an older
   one crash; it makes a challenge disappear from the older device until it updates, which is
   the behaviour the list already had.
6. **Nothing in `src/lib/shelfMerge.ts`, `src/server/shelf.ts`, `deploy/nas/`, `.github/` or
   `netlify/` changes.** This stays in the guardrails' group 1.

# Rationale

The server's only check is a function in the app, so the cheapest correct encoding is the
honest one: add the fields, keep them optional, keep them out when they are the default. No
packing of several things into one string, no second store, nothing for Sander to review, and
an old shelf keeps reading exactly as it did.

# Consequences

- The challenge form grows a **unit** picker next to the number and an **and also** row;
  `ruleText` has to read well for a combination ("Fantasy books by Sarah J. Maas").
- A challenge's progress bar is `done / target` in its unit, so the own-challenge card shows
  pages and hours, not only a book count.

# Guidance for agents

- Never change `src/server/shelf.ts` for a challenge rule. If a rule ever needs the server to
  know something, that is a new decision and a `needs-sander` task.
- Keep new fields optional and omitted when default; write the test for a challenge saved
  before them.
- `fits()` stays one function per rule kind; the AND is one `&&` over two `fits()` calls, not
  a second code path.
