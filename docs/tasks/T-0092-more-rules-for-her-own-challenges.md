---
id: T-0092
title: "Let her own challenges count pages or hours, go by author, decade, trope or 4+ stars, and combine two rules with AND"
description: "The New challenge form gains a unit next to the number (books, pages or hours), the rule list gains By author, By decade, Rated 4+ (next to the existing A trope) and an 'and also' row that adds a second rule both of which must hold; everything is encoded in optional fields that cleanChallenges keeps, so src/server/shelf.ts is untouched and challenges saved before this read unchanged."
status: Done
size: full
depends_on: [T-0090]
decisions: [D-0002, D-0008, D-0014, D-0020, D-0025, D-0042, D-0064, D-0066]
raised_on: 2026-11-23
done_on: 2026-11-23
result: ["https://github.com/SanderGeraedts/Hanna-s-Reading-List/pull/267"]
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
**D-0066** records that, the exact saved shape, and the limits.

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
  book, not a second code path (D-0066).
- The unit affects only how much a fitting book contributes, never which books fit.
- Don't touch the page tab row: a sibling branch adds a **Stats** tab.

# Choices made while Hanna was at work

1. **The goal unit is a small select next to the number** (Books / Pages / Hours), not three
   separate kinds of challenge. One challenge, one goal, one unit.
2. **The limits:** 500 books as before, and up to 100,000 pages or hours, so "2000 pages" works
   and a slip of the finger cannot make a ten-million-page goal.
3. **An AND is exactly two rules, and both must hold.** No OR, no third rule. She asked for
   "mixing two rules (both must hold)".
4. **A second rule may not be *Any book* or *Finish a series*,** and may not repeat the first
   rule with the same value: both would say nothing.
5. **By author uses the first author only,** matched however it is capitalised, exactly as the
   bingo squares already do.
6. **A decade comes from the published year** (`1990` means 1990–1999); a book with no year
   counts for no decade.
7. **An hours goal counts listening minutes only** and shows whole hours, rounded down — `9 of
   20 hours`, never `9.4`.
8. **When two rules cannot be folded into one phrase** the line reads `Books on your shelf
   before 2026 · and fantasy books`. The common pairs do fold: `Fantasy books by Sarah J.
   Maas`, `Fantasy books you rated 4+`.
9. **A format challenge still reads "Audiobook books"** when it stands alone. That is what it
   said before this task; changing it is a small follow-up if it annoys her.

# Design

Written by the UX designer, 2026-11-23, before the build.

## 1. The form, at 390

The form is the existing `.own-challenge-form`: two-field rows that stack on a phone. It grows
from three rows to four.

```
┌──────────────────────────────────────┐
│ New challenge for 2026               │
│ Name        [ Fantasy year        ]  │
│ How many    [ 2000 ] [ Pages    ▾ ]  │  ← the unit, new
│ What counts [ A genre   ▾ ]          │
│ Which       [ Fantasy   ▾ ]          │
│ ＋ and also                          │  ← a link-looking button, new
│ Sleep reads don't count.             │
│              [ Cancel ]  [ Save ]    │
└──────────────────────────────────────┘
```

With the second rule open:

```
│ ＋ and also                          │ →
│ And also     [ By author  ▾ ] [ ✕ ]  │
│ Which        [ Sarah J. Maas ▾ ]     │
```

- **How many** keeps its number input and gains a unit `select` beside it: **Books** (default),
  **Pages**, **Hours**. The number's `max` follows the unit (500 books, 100000 pages or hours),
  so the browser itself refuses a typo.
- **What counts** gains three entries, in this order after the ones that are there:
  `Any book`, `From my pile`, `A genre`, `A trope`, `By author`, `From a decade`,
  `Rated 4+`, `A language`, `A format`, `A series`, `Finish a series`.
  `Rated 4+` needs no **Which**; `By author` and `From a decade` show one.
- **＋ and also** is a `.btn.small` that reveals the second rule row. It is absent while the
  first rule is `Any book` (anything *and* a rule is just that rule) and while the first rule
  is `Finish a series` (that is the Read the series card's own thing, D-0065 §4).
- The second rule's list leaves out `Any book` and `Finish a series`, and leaves out the first
  rule when it would mean the same rule twice with the same value.
- `✕` next to the second rule removes it, named `Remove the second rule`.
- The existing line `Sleep reads don't count.` stays where it is. It is not new hint text; it
  states a rule of the feature, and it was already approved.
- **Save** stays disabled until the name is filled, the number is a whole number in range, and
  every chosen rule has its value. No sentence explains why — the empty `Which` is the answer
  (D-0014).

At 1280 the rows are two fields wide as they already are: **Name** + **How many/unit**,
**What counts** + **Which**, **And also** + **Which**.

## 2. The decade picker

**Which** for `From a decade` lists only the decades her shelf actually has, newest first:
`2020s`, `2010s`, `1990s`, `1950s`. The value saved is the number (`1990`); the label is
`1990s`. A shelf with no published years shows `Pick one…` alone and **Save** stays disabled —
the honest state, rather than inventing decades.

## 3. The author picker

**Which** for `By author` lists every first author on her shelf, alphabetically by the name as
written, deduplicated by the folded key, showing the spelling that is on the most books. The
saved value is that spelling; the counting is folded, so a second spelling on a later book
still counts.

## 4. The card

```
┌──────────────────────────────────────┐
│ Fantasy year         Change   ✕      │
│ Fantasy books by Sarah J. Maas       │
│ 1,250 of 2,000 pages                 │
│ ██████░░░░░░░░░░░░░                   │
│ [cover][cover][cover]                │
└──────────────────────────────────────┘
```

- The rule line (`ruleText`) reads as one sentence:
  - `Any book you finish`, `Books on your shelf before 2026` (unchanged)
  - `Fantasy books`, `Enemies to lovers books` (unchanged)
  - `Books by Sarah J. Maas`
  - `Books from the 1990s`
  - `Books you rated 4+`
  - `Books from The Lord of the Rings`, `Every book of The Lord of the Rings`
  - **with an AND**, the second rule is folded into the same sentence rather than bolted on:
    `Fantasy books by Sarah J. Maas`, `Fantasy books you rated 4+`,
    `Books from the 1990s in Dutch`, `Audiobooks you rated 4+`.
    When two rules cannot be folded into one readable phrase the fallback is
    `<first> · and <second rule's phrase>`, e.g. `Books on your shelf before 2026 · and Fantasy
    books`.
- The count line carries the unit: `3 of 5` (books, unchanged), `1,250 of 2,000 pages`,
  `9 of 20 hours`. Numbers use `toLocaleString('en')`, as the page badges already do. Hours are
  rounded down to a whole hour; a part hour shows as the whole below it, never `9.4`.
- The bar never exceeds full (`Math.min(1, done / target)`), so a goal of 1 page finished by a
  400-page book is a full bar, not four bars' worth.
- The covers underneath are the books that counted, newest first, exactly as today.
- An AND where **nothing matches**: `0 of 5`, an empty bar, no covers, and no extra sentence.
  An empty challenge is allowed to look empty.

## 5. Both wallpapers, both widths

Nothing new in colour: the form uses `.input` and `.btn`, the card `.dash-card` and
`.progress-bar`, all already checked on both wallpapers by `colours.test.ts`. The only risk is
width — the unit `select` next to a number at 390. It is laid out as a `grid-template-columns:
1fr auto` inside the one label row, with the select at a fixed 6.5rem, so the number keeps at
least 44 px of tappable width on a 320 px phone.

## 6. Keyboard and screen reader

- Every control has a real `<label>`: `Name`, `How many`, `Unit`, `What counts`, `Which`,
  `And also`, `Which` (the second one is `aria-label`-disambiguated as `Which, second rule`, so
  two "Which" selects are never confused).
- The second rule lives in a `<fieldset aria-label="What else counts">` so a screen reader can
  tell the two rules apart.
- `＋ and also` moves focus to the new rule's `select`; `✕` moves it back to `＋ and also`.
- **Save** is a disabled `<button>`, which is announced as dimmed; the first invalid field is
  the one Tab reaches.

## 7. Screenshots the developer must take

1. `own-form-390-lavender.jpg` — the form with the unit select, no second rule.
2. `own-form-390-and.jpg` — the second rule open, with its Which.
3. `own-form-1280-midnight.jpg` — the same at 1280 on midnight.
4. `own-card-pages-390.jpg` — a pages challenge part way.
5. `own-card-hours-1280.jpg` — an hours challenge.
6. `own-card-and-390.jpg` — an AND challenge with its one-sentence rule line.
7. `own-card-nothing-390.jpg` — an AND where nothing matches.
8. `own-card-old-390.jpg` — a challenge saved before this, opened in Change.

## Review after the build

Written by the UX designer, 2026-11-23, from the screenshots in `T-0092-screens/`.

**Verdict: passes, with one change already made and two notes.**

| what | result |
|---|---|
| **How many** + a unit select beside it | matches (`own-form-390-lavender.jpg`): the number keeps its width at 390 and the unit is 6.5rem |
| the rule list in the agreed order, with By author, From a decade, Rated 4+ and Finish a series | matches |
| **＋ and also** reveals a bordered second-rule row with its own **Which** and a `✕` | matches (`own-form-390-and.jpg`, `own-form-1280-and.jpg`) |
| the card's rule line reads as one sentence | matches: `Fantasy books by Sarah J. Maas` (`own-card-and-390.jpg`) |
| the count line carries the unit | matches: `1,200 of 2,000 pages` (`own-card-pages-390.jpg`) |
| an AND that nothing matches looks empty | matches: `0 of 5`, an empty bar, no covers, no extra sentence (`own-card-nothing-390.jpg`) |
| a challenge saved before this opens with Books and no second rule | matches (`own-card-old-390.jpg`) |

**Changed during the build, with my agreement:** the number and the unit were going to live
inside one `<label>`. Two controls under one label are one name to a screen reader, so the
number now has its own `<label for>` (**How many**) and the unit its own name (**Unit**). The
layout is exactly as drawn.

**Notes, not blockers:**

1. **A format rule reads `Audiobook books`** when it stands alone. That is what it already
   said before this task, so it is not a regression, and an AND with a format falls back to
   the `· and` form, which reads fine. Worth a small follow-up if it annoys her.
2. **The second rule starts at `From my pile`,** the first entry of its list, rather than at an
   empty "pick a rule". Picking a rule from a select she has to open anyway is one tap either
   way, and **Save** stays disabled until its value is chosen.

Nothing must be fixed before this passes. To the tester.

# Test

Written by the tester, 2026-11-23.

## The checks, as run

```
$ pnpm exec tsc --noEmit
(no output: clean)

$ pnpm test
 Test Files  182 passed | 2 skipped (184)
      Tests  2308 passed | 22 skipped (2330)

$ pnpm run build
✓ built in 879ms

$ pnpm exec harness check
✓ tasks: 65 tasks, index in step
✓ decisions: 57 records, index complete, 3 overrules valid
✓ engineers: 2 listed
✓ generated files: current
```

**The code-owner check, the point of this task:**

```
$ git diff --stat origin/main...HEAD -- src/server/shelf.ts src/lib/shelfMerge.ts deploy .github netlify netlify.toml
(no output: not one of those paths is touched)
```

## What was tried to break it

**The saved shape**

| tried | result |
|---|---|
| **a challenge saved before the new rules** | survives byte for byte; its keys are still `id, name, target, year, rule, value` and it counts exactly as it did |
| the same one opened in **Change** and saved again | comes back identical: no `unit`, no `and` written |
| `unit: 'pages'` / `'hours'` | kept |
| `unit: 'books'` / `'nonsense'` | left out (books is the default and is never written) |
| `and: 'author'` + `andValue` | kept |
| `and: 'any'`, `and: 'finishseries'`, the same rule with the same value, `and` needing a value with none, `and: 'nonsense'` | the `and` is dropped, **the challenge stays** |
| a rule this version does not know | the challenge is dropped, as it always was |
| `target` 500 / 501 books, 100000 / 100001 pages, 0, −1, 1.5 | kept / refused, per unit |
| 60 challenges | capped at 50 |
| a round trip through `JSON.stringify`/`parse` | unchanged |

**The counting**

| tried | result |
|---|---|
| `Sarah J. Maas` and ` sarah j. maas ` | one author; the picker offers each author once, in the spelling most of her books use |
| a book whose second author matches | does not count (only the first author) |
| a book with no authors | counts for none |
| decade `1990` against 1990, 1999, 1989, 2000, no year, a `published` date, and `year` winning over `published` | all as `pubYear` says |
| the decade picker on a shelf with no published years | empty, and **Save** stays disabled |
| rated 4+: 4, 5, 3, none, and a broken 6 | 4, 5 and the 6 (cleaned to 5 stars) count; 3 and none do not |
| **a trope she renames** | the saved spelling keeps counting a book tagged `Enemies to Lovers` (folded, D-0042); renamed to `Rivals to lovers` it counts 0 and says so |
| **an AND where nothing matches** | `0 of 5`, an empty bar, no covers, no extra sentence — in books, pages and hours |
| a pages goal, with a listen-only book | its minutes count as pages (D-0008) |
| an hours goal, with a book with no minutes | adds nothing |
| **a pages goal of 1** | met by one book, and the bar is exactly full, not 300 % wide |
| sleep reads, in every unit, with and without an AND | never count |
| a value that is no longer on the shelf | the rule line still reads (`A Genre She Deleted books`, `Books by Gone Writer`) |

**The form**

| tried | result |
|---|---|
| the unit next to the number | two controls with two names (**How many**, **Unit**), `max` follows the unit (500 ↔ 100000) |
| the rule list | the eleven rules in the agreed order |
| **＋ and also** | absent for *Any book* and *Finish a series*; the second list leaves out *Any book*, *Finish a series* and the first rule |
| changing the first rule to the second's | the second rule is cleared |
| **Save** | disabled until the name, the number and **every** chosen rule's value are there |
| the card's rule line | `Fantasy books by Sarah J. Maas`, `Books from the 1990s`, `Books you rated 4+`, `Fantasy books you rated 4+`, and `Books on your shelf before 2026 · and fantasy books` when the halves cannot share one "books" |
| the count line | `3 of 5`, `1,250 of 2,000 pages`, `9 of 20 hours` |

## After main landed the Stats page

`main` gained the Stats page and the year wrap-up (#266) while this was being built, so it
was merged in here and everything was run again on the merge:

```
$ pnpm exec tsc --noEmit
(no output: clean)

$ pnpm test
 Test Files  190 passed | 2 skipped (192)
      Tests  2378 passed | 22 skipped (2400)

$ pnpm run build
✓ built in 828ms

$ pnpm exec harness check
✓ tasks: 67 tasks, index in step
✓ decisions: 59 records, index complete, 3 overrules valid
✓ engineers: 2 listed
✓ generated files: current
```

The conflicts were `docs/backlog.md` (both items taken off the queue), `docs/decisions/index.md`,
`docs/lessons.md`, `docs/tasks/index.md` (regenerated) and `src/styles.css`. The stylesheet's
two blocks both ended inside an unclosed `@media`, which is the trap T-0080's own lesson
records: the resolved file was counted brace by brace (`depth at end: 0`, lowest depth 0) and
the Challenges page was looked at again in the browser at 390 px and 1280 px. **The page tab
row was not touched** — Stats is their tab and it is there.

## Verdict

**Passed.** The *Done when* checks all ran with the output above, including the one that
matters most — `src/server/shelf.ts`, `src/lib/shelfMerge.ts`, `deploy/`, `.github/` and
`netlify/` are untouched, so **nothing in this waits for Sander**. The UX designer's review is
in *Design* and D-0066 is recorded. Nothing is left for a human.

# Log

- 2026-11-23 architect: wrote CH3 as a full task; recorded D-0066 (the saved shape, the five rules, the AND and the limits, all app-side: src/server/shelf.ts is untouched, so nothing waits for Sander). Hand to the UX designer.
- 2026-11-23 ux-designer: designed (the ring row and confetti, the four cards, the extra rule fields and the swap flow, each for 390 and 1280 on both wallpapers). Hand to the developer.
- 2026-11-23 developer: built the unit, the five rules and the AND in `src/lib/ownChallenges.ts` and `src/components/OwnChallenges.tsx`. **`src/server/shelf.ts` is untouched** (`git diff --stat src/server/shelf.ts src/lib/shelfMerge.ts deploy .github netlify netlify.toml` is empty), so nothing waits for Sander. Checks: `pnpm exec tsc --noEmit` clean; `pnpm test` 2284 passed; `pnpm run build` ✓; `pnpm exec harness check` all ✓. Screenshots in `T-0092-screens/`.
- 2026-11-23 ux-designer: reviewed: passes (one change agreed during the build, notes recorded). Hand to the tester.
- 2026-11-23 tester: passed (sent the confetti back once; see the lesson). Every Done when check ran; the output is in Test.
