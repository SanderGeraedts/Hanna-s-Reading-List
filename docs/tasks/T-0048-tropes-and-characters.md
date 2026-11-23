---
id: T-0048
title: "Give a book tropes and characters, and use them in search, a dashboard block, Make a wish, badges and her own challenges"
description: "Two new optional fields on Book — tropes and characters with a ♥ for favourites — edited on the book panel's Notes tab, matched case-insensitively from one module, and used in the shelf search, a new Tropes & characters dashboard block, a trope wish, a trope badge family and an own-challenge rule."
status: Done
size: full
depends_on: []
decisions: [D-0042, D-0002, D-0013, D-0014, D-0020, D-0025, D-0038]
raised_on: 2026-11-23
done_on: 2026-11-23
result: ["https://github.com/SanderGeraedts/Hanna-s-Reading-List/pull/261"]
---

# Goal

Hanna reads for the tropes. She asked on 22 November 2026 to note per book which tropes it
has and who is in it, and then to be able to *use* that: find a book by its trope or a
character's name, see her most-read tropes and favourite characters on the dashboard, wish
for a trope, earn a badge for reading one trope a lot, and set herself a challenge about one.

Build exactly what D-0042 decides: two optional fields on `Book`, one module that owns how a
trope is folded and suggested, and the six places that use them. Nothing in
`src/lib/shelfMerge.ts`, `src/server/shelf.ts` or `deploy/nas/` changes — D-0042 explains
why none of it is needed. Bingo stays as it is.

Built together with T-0047 in one pull request; the fields live on the Notes tab that task
creates.

# Done when

1. `pnpm test` and `pnpm run build` pass, and `pnpm exec tsc --noEmit` is clean.
2. `git diff --name-only origin/main` lists **no** file under `.github/`, `netlify/`,
   `deploy/nas/`, and neither `src/lib/shelfMerge.ts` nor `src/server/shelf.ts`.
3. `src/lib/tropes.ts` + `tropes.test.ts` and `src/lib/characters.ts` +
   `characters.test.ts` exist, and the tests cover: folding (case, accents, extra spaces),
   `canonicalTrope` reusing the shelf's spelling and capitalising a new all-lower-case one,
   suggestions = ready list ∪ shelf tropes with no duplicates, a book with `tropes: []`
   behaving exactly like a book with no `tropes`, and a refused duplicate character name.
4. **Book panel (Notes tab):** chips for the tropes with an × each, a field that suggests
   from the ready list and the shelf, and a character list where each name has a ♥ toggle and
   an ×. A test shows a trope typed in a different case joining the existing spelling, and a
   ♥ being set and cleared.
5. **Search:** `searchShelf(books, 'enemies')` finds a book whose trope is "Enemies to
   lovers" and `searchShelf(books, 'feyre')` finds the book that has that character, both
   with a hint naming the trope or character. A book with neither is not matched.
6. **Dashboard block "Tropes & characters"** (`tropes`, in *Fun & memories*): her most-read
   tropes from finished books, biggest first, and her favourite (♥) characters with their
   book's cover, tapping one opens the book. With no tropes and no favourites anywhere the
   block hides itself (and still shows while arranging, like the other empty-aware blocks).
   A layout saved before this block exists still loads and gets the block in its place
   (`cleanLayout`, a test with a saved layout from before).
7. **Make a wish:** a Trope wish next to length, genre and language, offered only when the
   books she could read next have tropes; `wishScore` counts it, and the granted books honour
   it. The existing D-0025 rules are untouched.
8. **Badges:** a `trope-5` / `trope-10` / `trope-25` family, earned at 5, 10 and 25 different
   **finished** books sharing one trope, dated by the finish that reached it, with the trope
   in the badge's name or card. A test shows that re-reading one book does not move it on,
   and that the three steps are bronze/silver/gold by D-0038.
9. **Her own challenges:** rule kind `trope` with the label **"A trope"**, its values the
   tropes on her shelf, `challengeBooks` counting a finished non-sleep-read book of that year
   with that trope, and `ruleText` reading "… books" like the genre rule. `cleanChallenges`
   keeps a trope rule and still drops a rubbish one.
10. The UX designer has reviewed what was built (book panel fields, the dashboard block
    empty and full, the wish, a trope badge) at 390 px and 1280 px on both wallpapers, and
    written the review in *Design*.

# Notes

- **Why this does not need Sander:** a shelf is saved as whole books and merged whole-book in
  `mergeIntoServer`; the `books` field in PocketBase is plain JSON. New optional fields ride
  along. The server validates her challenges with `cleanChallenges` from
  `src/lib/ownChallenges.ts`, which is not a code-owner path. If any part of the build turns
  out to need `shelfMerge.ts` or `server/shelf.ts` after all, **stop and report** instead of
  editing them.
- Files to touch: `src/lib/library.ts` (the two fields), new `src/lib/tropes.ts` and
  `src/lib/characters.ts`, `src/lib/search.ts`, `src/lib/wish.ts`, `src/lib/badges.ts`,
  `src/lib/ownChallenges.ts`, `src/lib/dashboardLayout.ts` (the block id), the book panel,
  `WishCard.tsx`, `OwnChallenges.tsx`, a new dashboard card, `Dashboard.tsx`, `styles.css`.
- Keep the fields out of the book when empty (D-0042 §1): `undefined`, never `[]`.
- `src/styles.css` is checked by `colours.test.ts` for contrast on both wallpapers (D-0020).

# Design

Written by the UX designer, 2026-11-23, before the build.

## 1. Book panel → Notes tab

The two new fields sit between the journal and "Lent to a friend" (T-0047's
Notes tab), Tropes first.

### Tropes

Built exactly like the Genres field, so it is a pattern she already knows:

```
Tropes
[Enemies to lovers ×] [Found family ×] [ Add a trope… ]
```

- Label `Tropes` (a plain `.field` label, no hint text — D-0014).
- The tropes she has given this book are `.chip`s in the order she added them,
  each with an `×` whose label is `Remove <trope>`.
- A `.chip-input` after them: placeholder `Add a trope…` when the book has
  none, `Add…` once it has some. `aria-label="Add a trope"`.
- While the field has focus, the existing `Suggestions` row shows under it:
  the ready list plus every trope already on her shelf, filtered by what she
  has typed, leaving out the ones this book already has. Same `.chips.suggestions`
  listbox as Genres, so tapping one keeps the field focused.
  With an empty field it shows the first handful of the ready list, so she can
  tap without typing — this is the "chips from a ready list" she asked for.
- Enter or leaving the field adds what she typed. A trope that folds to one
  already in use takes that spelling (D-0042 §4), silently: she types
  `enemies to lovers`, the chip reads **Enemies to lovers**. A trope she types
  that is new keeps her capitals, with the first letter capitalised when she
  typed it all lower case.
- Adding a trope the book already has does nothing at all (no error, no
  duplicate chip).
- A very long trope (she can type anything) wraps inside its chip rather than
  pushing the panel wide: the chips row wraps, and a chip's text wraps with
  `overflow-wrap: anywhere`. Cap what is stored at 60 characters.

### Characters

```
Characters
♥ Feyre            ×
♡ Rhysand          ×
[ Add a character… ]
```

- Label `Characters`.
- A list (`<ul class="character-list">`), one row per character, in the order
  she added them. Each row is:
  - a **♥ button** at the left: filled `♥` in `--accent` when `fav`, outline
    `♡` in `--muted` when not. Its label is `Favourite: <name>` when off and
    `Not a favourite any more: <name>` when on, so a screen reader hears what
    pressing it does; `aria-pressed` carries the state.
  - the name as plain text (wrapping, never truncated);
  - an `×` at the right, label `Remove <name>`.
- Under the list a `.chip-input`, placeholder `Add a character…` / `Add…`,
  `aria-label="Add a character"`. Enter or blur adds. A name that folds to one
  already on this book is refused silently (no second row).
- No suggestions under this field: character names are per book, and
  suggesting other books' characters would be noise.
- Tap targets are 44 px on a touch screen (♥ and ×).

## 2. Shelf search

No new interface. A book matches on a trope or a character name like it already
matches on a genre, and the hit's **hint** line under the title reads the
matched trope (`Enemies to lovers`) or `Character: Feyre`. Tropes weigh the
same as genres (2), characters a little less (1.5) so a title or author still
wins.

## 3. Dashboard block "Tropes & characters"

A new block in **Fun & memories**, `BLOCKS.tropes = 'Tropes & characters'`,
placed after `Badges` in the left column of that section by default.

```
Tropes & characters

Most-read tropes
Enemies to lovers ████████████ 12
Found family      ███████  7
Slow burn         ████  4
Morally grey      ██  2
Fake dating       █  1

Favourites
[cover] [cover] [cover] [cover]
 Feyre   Rhys    Nesta   Cass
```

- **Most-read tropes:** the tropes of her **finished** books (status read, or
  read at least once), biggest first, at most **six** rows. Each row is the
  trope's name, a bar whose width is the share of the biggest, and the count at
  the end. The bar is the accent gold on the card's own background, like the
  existing count bars. Ties sort alphabetically.
- **Favourites:** every ♥ character, in a horizontal row of covers of the book
  they are from, the name under the cover. At most **eight**, newest book first
  (`editedAt`, then `addedAt`); the row scrolls sideways when there are more.
  Tapping one opens that book, as every cover in the dashboard does
  (`onShowBook`).
- The same name ♥'d on two books shows twice, once per book — they are two
  characters as far as the app knows, and showing one of the two covers would
  be a lie.
- **Headings** inside the block: `Most-read tropes` and `Favourites`, in the
  project's small muted block-heading style.
- **Empty halves:** with tropes but no ♥ characters, only the tropes half is
  shown (no "Favourites" heading, no empty text). With ♥ characters but no
  finished book with a trope, only the Favourites half.
- **Completely empty** (no tropes on any book and no ♥ at all): the block hides
  itself, exactly like `waiting` and `creatures` do, and is still shown while
  arranging so she can place it.
- **A saved layout from before the block existed** gets it in its default spot
  through `cleanLayout`'s existing "blocks added later" step; nothing she
  arranged moves.

## 4. Make a wish

A fourth row in the wish form, under **Genre** and above **Language**:

```
Trope   [ Any trope ▾ ]
```

- A `select` like Genre, first option `Any trope`, then the tropes of the books
  she could read next, most common first.
- The row is only there when those books have at least one trope — the same
  rule the Genre row follows today.
- Nothing else about Make a wish changes: the same three books, the same
  "No book matches all your wishes. These come closest:" line when nothing
  matches everything.

## 5. Badges

One family of three, in the medal grid like every other badge (D-0038: bronze,
silver, gold by step):

| id | icon | name | how |
| --- | --- | --- | --- |
| `trope-5` | `💘` | Trope lover | Finish 5 books with the same trope |
| `trope-10` | `🫶` | Trope devotee | Finish 10 books with the same trope |
| `trope-25` | `💝` | Trope queen | Finish 25 books with the same trope |

(`💞` is taken by `reread-5`, Old favourite, so it is not used here.)

- Not secret, so they show their progress while locked: `3 of 5`, counted on
  her **best** trope.
- Earned, the card's *how* line names the trope: `Finish 5 books with the same
  trope · Enemies to lovers`. The badge's **name** stays the same for everyone,
  so the grid does not change shape when she invents a word.
- The day is the finish that brought the fifth (tenth, twenty-fifth) different
  book of that trope.

## 6. Her own challenges

A new rule in the rule picker, after `A genre`:

- Label **`A trope`**, its values the tropes on her shelf, alphabetically.
- `ruleText` reads `Enemies to lovers books`, matching `Fantasy books`.
- An empty shelf-trope list means the rule is simply not offered yet.

## Keyboard and screen reader

- Trope chips, the ♥ and the `×` are all real buttons, reachable with Tab in
  reading order, with the labels given above.
- The trope suggestions are the existing `role="listbox"` / `role="option"`
  row, so nothing new is needed.
- The dashboard block's trope bars are a list; each row's accessible text is
  `<trope>, <n> books` (the bar itself is `aria-hidden`). The favourites are
  buttons labelled `<name>, from <book title>`.
- The trope `select` in Make a wish is a plain labelled `select`.

## Wording

New words: `Tropes`, `Add a trope…`, `Characters`, `Add a character…`,
`Tropes & characters`, `Most-read tropes`, `Favourites`, `Any trope`,
`A trope`, `Trope lover`, `Trope devotee`, `Trope queen`,
`Finish 5 books with the same trope` (10, 25), `Character: <name>`.

## Screenshots the developer takes

1. `tropes-notes-390.png` — the Notes tab with tropes and characters filled in, 390 px, lavender
2. `tropes-suggest-390.png` — the trope field focused, the ready-list suggestions open, 390 px
3. `tropes-notes-1280.png` — the Notes tab, 1280 px, lavender
4. `tropes-block-1280.png` — the dashboard block full, 1280 px, lavender
5. `tropes-block-390.png` — the dashboard block full, 390 px, lavender
6. `tropes-block-empty-390.png` — the block while arranging with nothing in it, 390 px
7. `tropes-wish-390.png` — Make a wish with the Trope row, 390 px
8. `tropes-badge-1280.png` — a trope badge's card under the grid, 1280 px
9. `tropes-block-midnight-1280.png` — the block on the midnight-blue wallpaper, 1280 px

## Review after the build, 2026-11-23

Looked at the nine screenshots in [`T-0048-screens/`](T-0048-screens/) (taken as `.jpg`,
with `tropes-wish-1280` added), against the design above.

**Matches**

- **Tropes** on the Notes tab are gold chips with an × each and an `Add…` field, exactly the
  Genres pattern (`tropes-notes-390`, `tropes-notes-1280`). A long chip wraps with the row
  instead of widening the panel.
- Focusing the field shows the ready list to tap straight away, before she types anything
  (`tropes-suggest-390`: Academic rivals, Chosen one, Coming of age …).
- **Characters** are one row each: ♥ in gold for a favourite, ♡ muted for the rest, the name,
  and an × (`tropes-notes-1280`: Rhysand ♥, Mor ♡).
- The **dashboard block** is the title, `Most-read tropes` with gold bars and a count, then
  `Favourites` with the covers and names (`tropes-block-1280`, `tropes-block-390`). At 390 px
  the bars keep their shape and the favourites row scrolls sideways. On the midnight-blue
  wallpaper the card and the bars read the same (`tropes-block-midnight-1280`).
- **Make a wish** has `Trope · Any trope` between Genre and Language, as a plain select
  (`tropes-wish-390`, `tropes-wish-1280`).
- A **trope badge**'s card names the trope she earned it with: "Finish 5 books with the same
  trope · Enemies to lovers", with its bronze rim (`tropes-badge-1280`).

**Differences, none blocking**

- The ♥ is gold rather than red. That is the project's one accent colour (D-0020); gold is
  right here.
- The block's trope rows put the name in a fixed column, so a very long trope wraps within
  it instead of pushing the bar. Fine, and better than a shrinking bar.

**Verdict: pass.** Handed to the tester.

# Test

Written by the tester, 2026-11-23.

## The checks, as run

```
$ pnpm exec tsc --noEmit
(no output)

$ pnpm test
 Test Files  132 passed | 2 skipped (134)
      Tests  1693 passed | 22 skipped (1715)

$ pnpm run build
✓ built in 941ms (client) · ✓ built in 817ms (server)

$ pnpm exec harness check
✓ tasks: 48 tasks, index in step
✓ decisions: 45 records, index complete, 3 overrules valid
✓ engineers: 2 listed
✓ generated files: current

$ git diff --name-only origin/main | grep -E '^\.github/|^netlify|^deploy/nas/|shelfMerge|server/shelf'
(nothing: no code-owner path is touched)
```

## What was tried to break it

In `src/lib/tropes.break.test.ts` (17 gap tests):

- **A shelf saved before these fields.** Books with no `tropes` and no `characters` go
  through the dashboard block, the search, the wish options, the badges, the challenge rule
  and the suggestions without a change in behaviour.
- **No empty list ever grows on a book.** Adding a trope and taking it off again leaves the
  saved JSON byte-for-byte what it was, with no `tropes` key — so a book she tags and untags
  is not "edited" as far as the shelf merge is concerned.
- **A shelf saved mid-feature** (`tropes: []`, `characters: []`) behaves exactly like one
  with neither.
- **Rubbish input:** spaces, tabs and newlines are refused; a 200-character trope is kept to
  60 and still matches in search, counts in the block and can be removed again; an empty
  string that somehow sits in a saved list is counted as nothing.
- **A trope typed with odd case:** "enemies to lovers", "Enemies To Lovers" and
  "ENEMIES  TO  LOVERS" are one trope with one count, a fourth book gets the shelf's first
  spelling, and the badge counts all three.
- **Accents:** "Café romance" is found by "cafe", and typing "cafe romance" on the same book
  is refused as a duplicate.
- **Duplicate characters:** the same name in four spellings (including accented) is refused
  on one book; a ♥ or a removal leaves the other characters alone; a name that is not on the
  book changes nothing.
- **The badge family:** a want-to-read book with the trope does not count; with two tropes
  reaching five, the earliest wins and names itself; with no finish days known at all it is
  earned without a day.
- **The wish and the challenge rule:** a wish for a trope nothing has scores 0 of 1 (so the
  "closest ones" path runs); a challenge whose trope has left the shelf still reads
  "Heist books".
- **The empty block:** a want-to-read book with a trope and a book with a character but no ♥
  give `{ tropes: [], favourites: [], empty: true }`, so the block hides itself.

Plus, in the files the developer wrote: `tropes.test.ts` and `characters.test.ts` (folding,
canonical spelling, suggestions, patches), `tropes.use.test.ts` (search hints, wish options
and granting, the three badge steps and their tiers, the challenge rule and `cleanChallenges`,
and a dashboard layout saved before the block existed), `TropesField.test.tsx` (the chips,
the ♥, the ready list on focus, refused duplicates) and `TropesCard.test.tsx` (the order, the
caps of six and eight, opening a book from a favourite, each half on its own).

**Migration checked:** `cleanLayout` on a layout saved before the block puts `tropes` after
`badges` in her Fun & memories column and moves nothing she arranged.

**Regression noticed:** `src/routeTree.gen.ts` is rewritten by `pnpm run build`; it is not in
this pull request.

**Verdict: passed.** Nothing remains for a human.

# Log

- 2026-11-23 architect: wrote the task from the backlog item "Tropes & characters" agreed with Hanna on 22 November 2026; recorded D-0042 (two optional fields, folded matching in one module, her words join the ready list, one trope badge family instead of one badge per trope); checked that nothing under CODEOWNERS is needed and wrote why in Notes; size full. Built together with T-0047 in one pull request. Handed to the UX designer.
- 2026-11-23 ux-designer: designed the trope chips, the character list with ♥, the dashboard block, the trope wish, the badge family and the challenge rule, with the wording and the screenshot list.
- 2026-11-23 developer: added the optional `tropes` and `characters` fields on Book, src/lib/tropes.ts and src/lib/characters.ts, the Notes-tab fields (TropesField.tsx), the search fields, the Trope wish, the trope-5/10/25 badge family, the `trope` challenge rule and the Tropes & characters dashboard block (TropesCard.tsx), with CSS. Nothing under CODEOWNERS was touched: `git diff --name-only origin/main` holds no `.github/`, `netlify/`, `deploy/nas/`, `shelfMerge.ts` or `server/shelf.ts`. Checks: `pnpm exec tsc --noEmit` clean; `pnpm test` 130 passed, 2 skipped (1671 tests); `pnpm run build` ✓; `pnpm exec harness check` all ✓. Screenshots in T-0048-screens/.
- 2026-11-23 ux-designer: reviewed the built fields, block, wish and badge at 390 and 1280 on both wallpapers — pass, no blocking differences.
- 2026-11-23 tester: passed; 17 gap tests (a shelf saved before the fields, rubbish and long input, odd case and accents, duplicate characters, the badge family's edges, the empty block), the checks re-run, no code-owner path touched, Done.
