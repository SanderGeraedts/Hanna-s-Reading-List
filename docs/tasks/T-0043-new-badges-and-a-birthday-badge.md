---
id: T-0043
title: "Add twelve badges: a 365-day streak, seasons, authors, formats and a secret Birthday book with the birthday entered once per device"
description: "src/lib/badges.ts gets 365-day streak, Spooky season, Summer reader, Winter warmer, Superfan, Wide reader, Well-read, Mix it up, Library lover, E-reader, All ears and the secret Birthday book; the birthday (day and month) is entered once per device in the Badges block and kept only in this browser (D-0039)."
status: Done
size: full
depends_on: [T-0042]
decisions: [D-0013, D-0014, D-0020, D-0022, D-0038, D-0039]
raised_on: 2026-11-23
done_on: 2026-11-23
result: [https://github.com/SanderGeraedts/Hanna-s-Reading-List/pull/251]
---

# Goal

Part 2 of "better badges", agreed by Hanna in a feature chat on 2026-11-22 (part 1, the medal
grid with bronze/silver/gold rims and the tap card, is T-0042 on branch `better-badges`).
Requester: Hanna. Night mode: she wasn't asked anything; the team's picks are under *Choices made
by the team*.

`badges()` in `src/lib/badges.ts` works out every badge from her books; nothing is saved for
them. This task adds twelve badges, and one small thing that *is* saved: her birthday, on this
device only (D-0039), for the secret Birthday book.

## The badges

Every name and id below was checked against the 60 badges on `main` (the 46 older ones and the 14
travel badges of T-0040): none clashes. Icons are new too (no icon already in use). Ids follow
D-0038's `<family>-<number>` pattern where they belong to a family, so T-0042's rule gives the
rims.

| id | icon | name | how (the text on the badge) | kind | rim (D-0038) |
| --- | --- | --- | --- | --- | --- |
| `streak-365` | 🌞 | 365-day streak | Read 365 days in a row | step, progress (longest run) | gold; `streak-100` becomes silver |
| `spooky-season` | 🎃 | Spooky season | Finish a horror, thriller or paranormal book in October | one-off | gold |
| `summer-10` | 🏖️ | Summer reader | Finish 10 books between June and August of one year | progress (best summer) | gold |
| `winter-warmer` | 🧣 | Winter warmer | Finish a book on 24, 25 or 26 December | one-off | gold |
| `author-10` | 🤩 | Superfan | Finish 10 books by the same author | progress (most by one author) | gold; the secret `author-5` Loyal fan becomes its bronze |
| `authors-25` | 👥 | Wide reader | Finish books by 25 different authors | step, progress | bronze |
| `authors-50` | 🦉 | Well-read | Finish books by 50 different authors | step, progress | gold |
| `kinds-3` | 🔀 | Mix it up | Finish a paper book, an e-book and an audiobook | progress (kinds of 3) | gold |
| `library-10` | 🪪 | Library lover | Finish 10 books from the library | progress | gold |
| `ebooks-10` | 📱 | E-reader | Finish 10 e-books | progress | gold |
| `audiobooks-10` | 👂 | All ears | Finish 10 audiobooks | progress | gold |
| `birthday` | 🎂 | Birthday book | Finish a book on your birthday | **secret**, riddle | gold |

- **Riddle** for `birthday` (in `RIDDLES`; a hint, never the name): "Turn the last page on the
  one day a year the candles are all for you."
- **Not added: "Loyal reader" (5 books by one author).** The secret **Loyal fan** (`author-5`)
  already is exactly that badge; a visible twin would give the secret away and count the same
  thing twice. Superfan (10) is its visible next step.
- **Where they go:** `streak-365` after `streak-100`; `author-10` and `authors-25/50` after the
  variety badges (Bilingual, Polyglot) and before travel; `kinds-3`, `library-10`, `ebooks-10`,
  `audiobooks-10` after the listening badges; `spooky-season`, `summer-10`, `winter-warmer` after
  Twelve months; `birthday` with the secret badges, after Home sweet home. (The block sorts by
  day and progress, so this order only breaks ties.)

## How they count

Using the existing helpers (`allFinishes`, `firstsOf`, `reachedOn`, `once`, `streakDays`) and
the existing rules; "different books" means each book once, dated by its **first** finish.

- **365-day streak:** the reading log's runs, like the other streaks (`streakDays`); progress is
  the longest run, capped at 365.
- **Spooky season:** a finish (re-reads count) with a day in October of any year, of a book with a
  genre matching `/horror|thriller|paranormal/i` (so her own genres like "Paranormal romance"
  count); the earliest such day.
- **Summer reader:** finishes (re-reads count, like the "N books" badges) with a day from 1 June
  to 31 August; earned on the 10th finish of the first summer that reaches 10; progress is the
  best single summer so far (it never goes down).
- **Winter warmer:** a finish on 24, 25 or 26 December of any year; the earliest such day.
- **Superfan:** different finished books by the same first author, compared the way `author-5`
  does (`authors[0]`, trimmed, lower case); earned on the first finish of the 10th; progress is
  the most books by one author.
- **Wide reader / Well-read:** the first time each first author (same comparison) shows up among
  her finishes (`firstsOf`), 25 and 50.
- **Mix it up:** the kinds of `bookKinds()` in `src/lib/pileHeight.ts` (paper, e-book, audio:
  the pile switch's kinds), the first time each shows up among her finishes; a book with
  paperback and audiobook counts both; Other or no format counts nothing.
- **Library lover:** different finished books with the format `library` (`formatsOf`).
- **E-reader:** different finished books with the format `ebook`.
- **All ears:** different finished books of the kind `audio` (Audiobook or Storytel).
- **Birthday book:** `badges(books, today, { birthday: 'MM-DD' })`; a finish whose day ends with
  `-MM-DD`, in any year; the earliest. No birthday given: not earned, still a hidden medal with
  its riddle.

## The birthday field (D-0039)

- In the Badges block, a way to enter her birthday: **day and month only**, no year. Where and
  how it looks is the UX designer's (D-0013: no pop-up; D-0014: no explanation under it). It
  needs to be findable while unset and quiet once set, and she can change or clear it.
- Kept by a new `src/lib/birthday.ts`: read and write `MM-DD` under `hannas-reading-list:birthday`
  in this browser's storage; a missing, invalid (`13-40`, `abc`) or blocked value reads as no
  birthday, and nothing throws.
- **All three places** that work out badges pass this device's birthday: `BadgesCard`,
  `BadgeToasts` (both in `src/components/NewBlocks.tsx`) and the "Waiting for you" line
  (`newBadges(badges(books))` in `src/components/Dashboard.tsx`). Setting it updates the block
  right away, without a reload.
- Never in a `Book`, the shelf, the account, a server function or a share image.

# Done when

- **`src/lib/badges.test.ts`** (extend it):
  - the 12 badges are present with the ids, icons and names in the table; the unique-name and
    unique-id test still passes; the total is **72** with the T-0040 travel badges; the secret
    count goes from 12 to **13**; Birthday book's riddle doesn't contain its name;
  - **365-day streak:** 365 logged days in a row → earned on the 365th; 364 → progress 364 / 365;
    a gap resets the run;
  - **Spooky season:** a Horror book finished 31 Oct 2025 → earned that day; finished 1 Nov →
    not; a Romance finished in October → not; genres "Paranormal romance" and "thriller" count;
  - **Summer reader:** 10 finishes from 1 Jun to 31 Aug 2026 → earned on the 10th's day; 31 May
    and 1 Sep don't count; 9 in summer 2025 plus 1 in summer 2026 → not earned, progress 9 / 10;
    a re-read in summer counts;
  - **Winter warmer:** 24, 25 and 26 Dec each earn it; 23 and 27 Dec don't; two years → the
    earliest day;
  - **Superfan:** 10 different books by "Sarah J. Maas" and " sarah j. maas" → earned on the
    first finish of the 10th; one book read twice counts once; 9 → progress 9 / 10;
  - **Wide reader / Well-read:** 25 different first authors → earned on the 25th new author's
    day; 24 → progress 24 / 25; the same author twice counts once;
  - **Mix it up:** a paperback, an e-book and a Storytel book → earned on the day the third kind
    first showed up; one book with paperback and audiobook plus an e-book earns it; Other counts
    nothing; two kinds → progress 2 / 3;
  - **Library lover / E-reader / All ears:** 10 different books of that format or kind → earned
    on the 10th's first finish; a re-read counts once; Storytel counts as an audiobook; 9 →
    progress 9 / 10; a want-to-read library book doesn't count;
  - **Birthday book:** with `{ birthday: '05-14' }` a finish on 14 May 2024 → earned that day,
    `secret`; a finish on 15 May → not; no birthday → not earned, secret, with its riddle;
  - **rims** (T-0042's whole-list family test covers it): `streak-365` gold and `streak-100`
    silver; `author-5` bronze and `author-10` gold; `authors-25` bronze, `authors-50` gold.
- **`src/lib/birthday.test.ts`** (new): set and read back `05-14`; clear removes it; `13-40`,
  `02-30`, `abc` and an empty value read as none (`02-29` is a valid birthday); blocked storage
  (getItem / setItem throwing) reads as none and doesn't throw.
- **`src/components/BadgesCard.test.tsx`** (extend it): without a birthday the block offers the
  birthday field; entering day and month saves `MM-DD` in this device's storage and the block
  shows it as set; rendering again remembers it; it can be changed and cleared; with a book
  finished on that day, the Birthday book medal is earned straight after setting it.
- **"Waiting for you" and the toast:** a test shows that with a birthday stored and a book
  finished on it in the last week, "Waiting for you" lists Birthday book (and the toast queue
  includes it).
- **Nowhere else:** `git grep -n -i birthday -- src/server src/routes deploy src/lib/shelfMerge.ts src/lib/library.ts`
  prints nothing.
- **The block, by eye** (the UX designer reviews): screenshots in `docs/tasks/T-0043-screens/`
  at 390 × 844 and 1280 × 800, lavender and midnight, on a local dev server with no backend
  (never a production `POCKETBASE_URL`, G-0019) and a demo shelf that earns some of the new
  badges: the birthday field unset and set, Birthday book earned, and the card of a locked new
  badge with progress.
- `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm run build` and `pnpm exec harness check` pass;
  `src/routeTree.gen.ts` is not committed.

# Notes

- **Read first:** D-0039 (the birthday stays on the device), D-0038 (ids, families, rims; on
  branch `better-badges` until T-0042 merges), T-0042 (the medal grid and tap card this block
  will have), T-0040 (how the travel badges were added and tested, and its screenshots script),
  D-0013, D-0014, D-0020, D-0022.
- **Order:** the badge logic in `badges.ts` (the 12 badges and the `birthday` option) and
  `birthday.ts` don't depend on T-0042 and can be built right away on `new-badges`. The birthday
  field in the block, its tests and the screenshots wait until T-0042 has merged; then rebase
  `new-badges` on `main` (both branches touch `badges.ts`, its test, `NewBlocks.tsx` and both
  indexes; rerun `pnpm exec harness tasks-index` after the rebase).
- **Files:** `src/lib/badges.ts`, `src/lib/badges.test.ts`, new `src/lib/birthday.ts` +
  `birthday.test.ts`, `src/components/NewBlocks.tsx`, `src/components/BadgesCard.test.tsx`,
  `src/components/Dashboard.tsx` (the `newBadges` call), `src/styles.css` if the field needs a
  rule. Reuse `bookKinds` and `formatsOf`.
- **Group 1** (guardrails): app code; the birthday stays in this browser (D-0039), so nothing for
  Sander, no change to the shelf's saving, no code-owned path.
- **Size: full.** A new control in the block (the birthday field) and something newly kept on the
  device; the UX designer designs the field first. The badges themselves need no design beyond
  the table.
- **Not doing** (from the brief): a birthday that follows her account; a celebration when a badge
  unlocks.

## Choices made by the team

Hanna wasn't asked anything (night mode). The architect took these:

1. **The names and icons** in the table. "Wide reader" for 25 authors and **Well-read** 🦉 for 50,
   since two badges can't share a name; **All ears** 👂 for 10 audiobooks; **Birthday book** 🎂
   for the secret.
2. **No visible "Loyal reader"**: the secret Loyal fan already rewards 5 books by one author.
   Superfan (10) is visible and makes Loyal fan its bronze step.
3. **Mix it up means three kinds**: a paper book, an e-book and an audiobook (the pile switch's
   kinds), not three formats like paperback, hardcover and library, which would be too easy.
4. **Re-reads count** for Summer reader, Spooky season and Winter warmer (like the "N books"
   badges); **different books** count for Superfan, Library lover, E-reader and All ears.
5. **Spooky season** counts genres with horror, thriller or paranormal in their name, including
   her own genres.
6. **Summer reader's progress** is her best summer so far, so the bar never goes back.
7. **The birthday is per device, not per account**, day and month only, and can be changed or
   cleared.
8. **A birthday of 29 February** only counts on 29 February.
9. **The riddle**: "Turn the last page on the one day a year the candles are all for you."

## Questions to re-ask Hanna in the morning

1. "Are these names all right: 365-day streak, Spooky season 🎃, Summer reader 🏖️, Winter warmer
   🧣, Superfan 🤩 (10 books by one author), Wide reader 👥 (25 authors), Well-read 🦉 (50
   authors), Mix it up 🔀, Library lover 🪪, E-reader 📱, All ears 👂 (10 audiobooks), and the
   secret Birthday book 🎂?"
2. "There's already a secret badge for 5 books by one author, so we didn't add a visible 'Loyal
   reader' for the same thing. Superfan (10 books) is visible. All right, or do you want a
   visible one for 5 as well (it would give the secret away)?"
3. "Mix it up: we read it as finishing a paper book, an e-book and an audiobook. Is that what you
   meant, or three formats like paperback, hardcover and library book?"
4. (UX designer) "The birthday is kept on each device separately. Should the Badges block say so
   next to it, for example 'Birthday (this device)', or is just 'Birthday' fine? We left the
   words out because you asked for no explanations under things."

# Design

Written by the UX designer on 2026-11-23, at night: Hanna wasn't asked; the picks are under
*Choices made by the UX designer*, and one question is added to the morning list above. Looked at
`BadgesCard` on `main` (T-0042), its 12 screenshots, the period picker's selects on the dashboard
(`.input` selects, `monthName`), the buttons and tokens at the top of `src/styles.css`, D-0013,
D-0014, D-0020, D-0022, D-0038 and D-0039.

## The twelve badges in the grid

Nothing new to draw: each one is a T-0042 medal (48 px, its emoji in the middle) and gets its
place by the block's sorting. Checked the table's rims against D-0038's family rule and the ids
on `main`:

| id | family on `main` + this task | rim when earned |
|---|---|---|
| `streak-365` 🌞 | `streak-3 … streak-100`, now 6 steps | **gold**; `streak-100` 🌠 turns **silver** |
| `author-10` 🤩 | with the secret `author-5` Loyal fan | **gold**; `author-5` turns **bronze** |
| `authors-25` 👥, `authors-50` 🦉 | a new family `authors` (not `author`) | **bronze**, **gold** |
| `summer-10` 🏖️, `kinds-3` 🔀, `library-10` 🪪, `ebooks-10` 📱, `audiobooks-10` 👂 | none: alone in their family | **gold** |
| `spooky-season` 🎃, `winter-warmer` 🧣, `birthday` 🎂 | no trailing number | **gold** |

- All 12 icons are unused on `main`; all match the table. No `library-*`, `ebooks-*`,
  `audiobooks-*`, `kinds-*` or `summer-*` id exists yet, so none joins a family by accident.
- **Locked** new badges are grey medals; the step ones show their progress in the card at 0 too
  ("0 / 365", "3 / 10"), the one-offs (Spooky season, Winter warmer) say "Locked".
- **Birthday book** is a hidden "?" medal with its riddle, like the other secrets, birthday set
  or not. Its 🎂 and name never show before it is earned (D-0038), so **the birthday row below
  uses neither**: no 🎂, no "Birthday book".
- **72 badges:** 12 rows of 6 at 390 px, 9 rows of 8 at 1280 px (T-0042 planned for this).
  13 hidden medals at the end.
- Accessible names follow T-0042 with no change: "365-day streak, locked, 41 of 365",
  "Superfan, gold, unlocked", "Hidden badge".

## The birthday row: where it goes

In T-0042's reserved spot: the **last item of the folding body** (`#badges-list`,
`.badges-body`, the vertical stack with `gap: var(--space-3)`), after the medal card's
`<section id="badges-card">`, as its sibling (never inside the card's live region). So:
grid → card (when open) → birthday row. It folds away with the grid; the head row, count and bar
don't change.

The row starts with a hairline: `border-top: 1px solid var(--border)`, `padding-top:
var(--space-3)`, so it reads as a small setting under the medals, not a badge. It is not a
card or a well: no background, no rim.

## The row's three looks

One line of controls in a `flex` row, `flex-wrap: wrap`, `align-items: center`, `gap:
var(--space-2)`. The label is always first: **"Birthday"**, `small-text`, `--muted` (like the
other field labels). No sentence under it, no placeholder sentence, no "why" (D-0014).

**1. Empty (no birthday on this device)**

> Birthday  [ Day ▾ ]  [ Month ▾ ]  ( Save )

- **Day:** a `<select class="input">`, first option **"Day"** (value `""`), then 1 … 31.
- **Month:** a `<select class="input">`, first option **"Month"** (value `""`), then January …
  December (`monthName(n)`, long), values `01` … `12`.
- Day before month, as the app writes dates ("3 Jan 2026").
- **Save:** `btn small` (secondary, not gold: gold stays for the badges).
- Nothing is saved while she picks: only **Save** stores the birthday. (On Windows a closed
  select changes value on every arrow key; saving on change would earn and un-earn the badge
  and fire its toast while she scrolls the months.)

**2. Set**

> Birthday  14 May  ( Change )  ( Clear )

- The day as text, `small-text`, `--text`: day and long month, "14 May", "2 September",
  "29 February". No year, never.
- **Change** and **Clear**: `btn quiet small`, in that order, after the date.

**3. Change** (after *Change*)

> Birthday  [ 14 ▾ ]  [ May ▾ ]  ( Save )  ( Cancel )

- The two selects as in *Empty*, already on the saved day and month. **Save** (`btn small`) and
  **Cancel** (`btn quiet small`).
- Save stores the new day and goes back to *Set*; Cancel goes back to *Set* with nothing changed.

**Clear** (from *Set*) removes the birthday from this device at once and shows *Empty*. No
"are you sure": entering it again takes two picks. If Birthday book was earned, it turns back
into a hidden "?" medal, and the count goes down by one (D-0039).

**Errors** (allowed by D-0014: they say how to fix it). Shown under the controls on their own
line, `small-text`, `--danger`; the selects get `aria-invalid="true"` and `aria-describedby`
pointing at it; it goes away on the next change of either select.

- Save with a day or month missing: **"Pick a day and a month."**
- Save with a day that month never has: **"There is no 31 April."** (the day and long month she
  picked). 29 February is fine (team choice 8).

**What changes when she saves:** the block works the badges out again at once, without a reload
(the badge toast, the grid and *Waiting for you* all read the new birthday). With a book already
finished on that day, Birthday book becomes earned: its medal moves to the front with its gold
rim, and the usual "Badge unlocked" toast shows once (the toast's shown-list keeps it from
showing again after a clear and a new save).

**Long text and sizes:** the longest row is "Birthday [Day ▾] [September ▾]" plus two buttons.
The selects are `width: auto` (not `.input`'s 100%). At 390 (inner width about 332 px) the
label and selects fit on one line and the buttons wrap onto the next, at its start; at 1280
(about 484 px) everything fits on one line. The error wraps under it.

**Touch:** under `@media (pointer: coarse)`, both selects and every button in the row get
`min-height: var(--tap)` (44 px); the buttons also `min-width: var(--tap)`. With a mouse they
keep today's small sizes.

**Midnight wallpaper:** the row sits on the walnut card, which doesn't change with the
wallpaper (D-0022), so it looks the same on lavender and midnight. The selects' dropdown lists
are the system's, dark through the app's existing `color-scheme: dark`. No new colours or
tokens: `--muted`, `--text`, `--danger` and `--border` on a card are already in
`colours.test.ts`.

**"Only on this device":** not said. A line like "kept on this device only" is an explanation
under a control, which D-0014 rules out, and D-0014's guidance is to ask Hanna rather than add
one. It's question 4 below. (On a second device she simply sees *Empty* there and enters it
again, which she agreed to in the brief.)

## The birthday row: keyboard and screen reader

- The row is `<div role="group" aria-labelledby="birthday-label">`, the label `<span
  id="birthday-label">Birthday</span>`. *Empty* and *Change* are a `<form>` whose Save is
  `type="submit"`, so Enter on Save saves (and the selects behave natively: arrows, type-ahead,
  Alt+↓ / Space to open).
- The selects are named **"Day"** and **"Month"** (`aria-label`), so she hears "Birthday, group,
  Day, combo box, Day" in *Empty* and "Day, combo box, 14" in *Change*.
- In *Set*, **Change** is "Change birthday" and **Clear** "Clear birthday" (`aria-label`; the
  visible words stay "Change" and "Clear"); Change has `aria-describedby` on the date text, so it
  reads "Change birthday, button, 14 May".
- Tab order: the grid (one stop), the card's × when open, then the row's controls left to right,
  then the next block. The arrow keys of the grid never reach the row.
- **Focus moves on purpose, never lost:**
  - Save (from *Empty* or *Change*) → *Set*, focus on **Change**;
  - Change → *Change*, focus on the **Day** select;
  - Cancel → *Set*, focus on **Change**;
  - Clear → *Empty*, focus on the **Day** select;
  - a Save with an error keeps focus on Save, and the error line is `role="alert"` so it is read
    at once.
- **Escape** in *Change* is Cancel. It's handled by the row and stops there, so it doesn't also
  close an open medal card; Escape elsewhere in the block still closes the card (T-0042). An
  Escape that closes an open native dropdown stays the browser's.
- Folding the block while in *Change* drops the unsaved picks; unfolding shows *Set*.

## Must-do T-0042 follow-ups (F11)

Small fixes to the medal grid that ship in this task's pull request.

1. **Space acts once in every browser.** Keep Enter and Space in the grid's `onKeyDown` (the
   tests and the "hold Enter toggles once" behaviour stay) and **also handle `keyup` for Space
   on the grid** (`onKeyUp` on the `<ul>`: `if (e.key === ' ') e.preventDefault()`), so a
   browser that fires a button's click on Space's keyup (Firefox) doesn't open the card and
   close it at once. Fix the code comment to say why (the keyup click), not "the same
   everywhere". A test: `keyDown` + `keyUp` Space on a medal leaves exactly one card open, and
   `keyUp` Space is `defaultPrevented`.
2. **A chosen medal that can't pass for a silver rim.** The cream ring outside the rim is the
   same light colour as a silver rim, so on silver it reads as a thicker rim (T-0042 review,
   `badges-390-lavender-earned.png`). New chosen state: **a cream ring inside the rim, set off
   by a dark gap**: `box-shadow: inset 0 0 0 2px var(--surface-solid), inset 0 0 0 4px
   var(--text)`, face `--surface-hover` as now; the outer `0 0 0 2px var(--text)` ring goes.
   - Every chosen medal then reads rim → dark → cream: two separate rings, whatever the rim's
     colour (gold, silver, bronze, grey, dashed). Unchosen medals never have two rings.
   - It stays inside the 48 px circle (the emoji, `--fs-heading`, has 34 px clear inside it),
     so nothing moves and the 8 px gap between medals stays free.
   - Keyboard focus is unchanged: the gold `outline` 3 px outside the rim, so chosen + focused
     shows the inner cream ring and the outer gold outline together.
   - `colours.test.ts`: add `--text` on `--surface-solid` at 3 : 1 (it is far above).
3. **The closed card points at no heading.** `<section id="badges-card">` gets
   `aria-labelledby="badges-card-title"` **only while a card is open**; closed, it has no
   label (and so no landmark), and the live region inside it stays in the page as before.

## Done when (added by the UX designer)

- **Birthday row** (in `BadgesCard.test.tsx`, by hand at both widths in the review):
  - it is the last thing in `#badges-list`, after `#badges-card`, and folds away with the grid;
  - *Empty*: the label "Birthday", selects named "Day" (Day, 1–31) and "Month" (Month, January –
    December) and a "Save" button; picking without Save stores nothing;
  - Save with both → `hannas-reading-list:birthday` is `MM-DD`, the row shows "Birthday 14 May"
    with "Change" and "Clear", focus is on Change;
  - Save with one missing shows "Pick a day and a month."; 31 + April shows "There is no 31
    April."; nothing is stored; 29 + February saves;
  - Change shows the selects on the saved day, Save stores the new one, Cancel and Escape keep
    the old one and focus Change; Escape in the row doesn't close an open medal card;
  - Clear removes the stored value, shows *Empty* and focuses Day; an earned Birthday book turns
    back into a "?" medal;
  - nowhere in the row: 🎂, "Birthday book", a year, or a hint sentence;
  - at 390 × 844 with touch, both selects and every button in the row are at least 44 px high.
- **Grid with 72 badges:** 6 a row at 390, 8 a row at 1280; `streak-100` silver and
  `author-5` bronze when earned.
- **F11:** a `keyUp` Space on a medal is `defaultPrevented` and keyDown + keyUp Space leaves one
  card open; a chosen medal has the inner cream ring with the dark gap and no outer ring; the
  closed `#badges-card` has no `aria-labelledby`, the open one points at its heading.

## Screenshots (`docs/tasks/T-0043-screens/`)

Copy T-0042's `screens.mjs` (demo shelf in localStorage, dev server with **no backend**, the
window as tall as the page). The demo shelf earns some new badges: a finish on 14 May (for the
birthday), books by one author (Superfan locked with progress, e.g. 4 / 10), a horror book
finished in October (Spooky season, gold), and enough authors for Wide reader to show progress.

| file | width | wallpaper | state |
|---|---|---|---|
| `badges-390-lavender-empty.png` | 390 | lavender | grid, birthday row *Empty* |
| `badges-1280-midnight-empty.png` | 1280 | midnight | grid, birthday row *Empty* |
| `badges-390-midnight-set.png` | 390 | midnight | row *Set* "14 May", Birthday book earned at the front |
| `badges-1280-lavender-set.png` | 1280 | lavender | row *Set*, Birthday book earned |
| `badges-390-lavender-change.png` | 390 | lavender | row *Change* (selects on 14 May, buttons wrapped) |
| `badges-1280-midnight-change.png` | 1280 | midnight | row *Change*, one line |
| `badges-390-midnight-error.png` | 390 | midnight | "There is no 31 April." |
| `badges-390-lavender-birthday.png` | 390 | lavender | card open on the earned Birthday book: "Gold · secret · Unlocked 14 May 2026" |
| `badges-1280-lavender-locked.png` | 1280 | lavender | card on a locked new step badge with progress (Superfan "4 / 10") |
| `badges-390-midnight-silver-chosen.png` | 390 | midnight | F11: a chosen **silver** medal, inner cream ring |
| `badges-1280-lavender-chosen-focus.png` | 1280 | lavender | F11: a medal opened with Enter, still focused: inner ring + gold outline |

The script prints the medals per row (6 / 8), the medal count (72), the row's control heights at
390 touch, and the stored `hannas-reading-list:birthday` after each step.

## Choices made by the UX designer

1. **Two selects, not a native date field.** `<input type="date">` always needs a year, and
   D-0039 says never ask one; there is no native day-and-month field. Day first, as the app
   writes dates.
2. **An explicit Save**, no saving on change, so scrolling the months never earns, un-earns or
   toasts the badge by accident.
3. **Quiet once set:** one line "Birthday 14 May · Change · Clear"; the selects only come back
   on Change.
4. **No 🎂 and no "Birthday book" in the row**, so the secret stays a secret.
5. **"Only on this device" isn't said** (D-0014); question 4 for the morning.
6. **Clear has no confirmation:** it is undone with two picks and a Save.
7. **Chosen medal (F11):** an inner cream ring with a dark gap, instead of the outer cream ring.
8. **Space (F11):** keep the key handler and also cancel Space's keyup, rather than going back
   to the button's own click, so the tests and the hold-to-repeat guard stay.

## Build notes (developer)

- **Hanna confirmed at 03:30** the four morning questions as the team had them: the names in
  the table, Mix it up = paper + e-book + audiobook, no visible Loyal reader, and no "only on
  this device" line. Built exactly that.
- `src/lib/badges.ts`: `badges(books, today, { birthday })` (new `BadgeOptions`). The twelve
  badges are added where *The badges* says, with the existing helpers: `streak-365` in the
  streak loop; `author-10` (`reachedOn` over each author's books on their first finish, the
  earliest 10th; progress the most by one author), `authors-25/50` (`firstsOf` the first author,
  trimmed, lower case) after Polyglot; `kinds-3` (`firstsOf` over `bookKinds`), `library-10`,
  `ebooks-10`, `audiobooks-10` (different finished books by `formatsOf`, audio = `AUDIO_FORMATS`,
  so Storytel counts) after the listening badges; `spooky-season`, `summer-10` (per year, the
  10th summer finish of the first summer that reaches 10; progress the best summer),
  `winter-warmer` after Twelve months; the secret `birthday` (a finish whose day ends in
  `-MM-DD`, the earliest; no or malformed birthday → not earned) after Home sweet home, with its
  riddle. The old `author-5` code now shares the `byAuthor` map with Superfan (same rule, moved
  up). Rims come from T-0042's family rule: `streak-100` silver, `author-5` bronze, `authors-25`
  bronze, the rest gold.
- `src/lib/birthday.ts` (new): `readBirthday`, `writeBirthday`, `clearBirthday`, `isBirthday`
  (`02-29` yes, `02-30` / `13-40` / `abc` / `` no), `daysInMonth`, `birthdayOf`, and
  `subscribeBirthday` (the components' listeners, plus the browser's `storage` event for other
  tabs). Every storage call is in a `try`, so blocked storage (or a `localStorage` that throws
  on access) reads as no birthday and nothing throws.
- **All three places pass this device's birthday** through one hook, `useBirthday()` in
  `NewBlocks.tsx` (`useSyncExternalStore` on `subscribeBirthday` / `readBirthday`):
  `BadgesCard`, `BadgeToasts` and "Waiting for you" in `Dashboard.tsx`. Saving or clearing
  updates all three at once, without a reload.
- **The toast's shown-list now only grows** (shown ∪ earned) instead of being overwritten with
  today's earned list, so that, as the design says, clearing and saving the birthday again
  doesn't toast Birthday book twice. Side effect: a badge lost and earned again (e.g. a book
  taken off and put back) no longer toasts a second time either.
- **The birthday row** (`BirthdayRow` in `NewBlocks.tsx`): the last child of `#badges-list`,
  after `#badges-card`; `role="group" aria-labelledby="birthday-label"`. *Empty* and *Change*
  are a `<form>` (Day select 1–31, Month select January–December with values `01`–`12`, Save
  `type="submit"`, Cancel in *Change*); *Set* shows "14 May" with Change / Clear (`aria-label`
  "Change birthday" / "Clear birthday", Change `aria-describedby` the date). Only Save stores.
  Errors "Pick a day and a month." and "There is no 31 April." in a `role="alert"` line under
  the controls, with `aria-invalid` and `aria-describedby` on both selects, gone on the next
  change. Focus moves as designed (Save / Cancel → Change, Change / Clear → Day). Escape in
  *Change* cancels and `stopPropagation`s, so an open medal card stays open. The row is
  remounted on folding (`key`), which drops unsaved picks. No 🎂, no "Birthday book", no year,
  no hint text.
- `src/styles.css`: `.birthday-row` (hairline `border-top`, `padding-top: var(--space-3)`),
  `.birthday-controls` (wrapping flex row, `gap: var(--space-2)`, selects `width: auto`),
  `.birthday-error` (`--danger`), and 44 px selects and buttons under `@media (pointer: coarse)`.
- **F11:** (1) the grid's `<ul>` cancels Space on `keyup`, and the comment says why (Firefox
  clicks a button on Space's keyup); (2) `.medal.chosen` is now `box-shadow: inset 0 0 0 2px
  var(--surface-solid), inset 0 0 0 4px var(--text)`, the outer ring is gone; (3)
  `#badges-card` has `aria-labelledby="badges-card-title"` only while a card is open.
- **Tests:** `badges.test.ts` (12 new cases: the table, 72 / 13, the order, each badge's rules
  from *Done when*, Birthday book with and without a birthday, "Waiting for you", the rims);
  `birthday.test.ts` (new: set / read / clear, invalid values, blocked storage and storage that
  throws on access, subscribers, and **the "nowhere else" search as a test**: no `birthday` in
  `src/server`, `src/routes`, `deploy`, `shelfMerge.ts`, `library.ts` or `shareImage.ts`);
  `BadgesCard.test.tsx` (the row's states, errors, focus, Escape, Clear, folding, earning
  Birthday book on Save; F11's Space keyup and the card's label); `colours.test.ts` (`--text` on
  `--surface-solid` at 3 : 1, and the chosen rule is the two inset rings and nothing else); new
  `BirthdayBadge.waiting.test.tsx` (the Dashboard lists "New badge: Birthday book!" once a
  birthday is stored, straight away; the toast queues it once, not again after Clear + Save).
  Existing tests moved with the count: 60 → 72 medals, 11 → 12 hidden on the demo shelf, 5 % →
  4 %, the last hidden medal's riddle is now Birthday book's, Home sweet home is second to last,
  Polyglot → Wide reader before the travel badges, `streak-100` / `author-5` no longer gold. The
  tester's break tests (`BadgesCard.break.test.tsx`) now count 72 (12 full rows of 6), add four
  badges at 8 a row to keep a short last row, and try 87 instead of 75; its `badges` mock passes
  the birthday option through.
- **Screenshots:** `docs/tasks/T-0043-screens/screens.mjs` (after T-0042's), on `vite dev
  --port 3159` with no `POCKETBASE_URL` and no Netlify link, a demo shelf in localStorage. It
  also earns Dusty pile (added 1 Sept 2025, finished 15 Sept 2026), which the chosen-focus shot
  happens to open. Output, shortened:

  ```
  badges-390-lavender-empty.png | 72 medals, 6 a row | Birthday Day Month Save (1 line) | heights: Day 44, Month 44, Save 44 | stored null; picked 14/05: stored null; after Save: stored 05-14, row "Birthday 14 May Change Clear", medal "Birthday book, gold, unlocked, secret badge"
  badges-1280-midnight-empty.png | 72 medals, 8 a row | (1 line) | heights: Day 39, Month 39, Save 25 | stored null
  badges-390-midnight-set.png | 72 medals, 6 a row | Birthday 14 May Change Clear | heights: 44, 44 | stored 05-14
  badges-1280-lavender-set.png | 72 medals, 8 a row | Birthday 14 May Change Clear | stored 05-14
  badges-390-lavender-change.png | 6 a row | Day Month Save Cancel (2 lines) | heights: 44, 44, 44, 44 | stored 05-14
  badges-1280-midnight-change.png | 8 a row | Day Month Save Cancel (1 line) | stored 05-14
  badges-390-midnight-error.png | "There is no 31 April." | picked 31/04: stored null; after Save: stored null
  badges-390-lavender-birthday.png | card: 🎂 Birthday book · Gold · secret · Unlocked 14 May 2026 | chosen ring: rgb(38,29,23) 2px inset, rgb(244,234,217) 4px inset
  badges-1280-lavender-locked.png | card: 🤩 Superfan · Finish 10 books by the same author · 4 / 10
  badges-390-midnight-silver-chosen.png | card: 🔖 5 books · Silver · Unlocked 14 May 2026 | the same two inset rings
  badges-1280-lavender-chosen-focus.png | focus: Dusty pile, gold, unlocked, secret badge (focus-visible true) | the same two inset rings
  ```

  All 11 with 0 page errors.
- **For the architect, not fixed here:** a native dropdown's own Escape can't be told apart from
  an Escape on a closed select in every browser; the row treats an Escape that reaches it as
  Cancel (in Chromium an open dropdown's Escape doesn't reach the page).

## Review after building (2026-11-23)

By the UX designer, from `git diff origin/main...HEAD -- src` (`NewBlocks.tsx`, `Dashboard.tsx`,
`styles.css`, `birthday.ts`) and the 11 screenshots in `docs/tasks/T-0043-screens/`, each looked
at. **Verdict: matches the design. No must-fix.** Handed to the tester.

**The checks, state by state**

- ✓ **Twelve medals and rims.** 72 medals, 6 a row at 390 (12 rows) and 8 at 1280 (9 rows);
  12 "?" medals at the end (13 secrets minus the earned Dusty pile), 11 once Birthday book is
  earned. Mix it up 🔀 and Spooky season 🎃 earned with gold rims, 5 books 🔖 silver; Superfan
  🤩, Wide reader 👥, Well-read 🦉, All ears 👂, E-reader 📱, Library lover 🪪, Summer reader
  🏖️, Winter warmer 🧣 and 365-day streak 🌞 locked and grey. Superfan's card: "Finish 10 books
  by the same author", bar, "4 / 10" (`badges-1280-lavender-locked.png`).
- ✓ **Where the row is.** The last child of `#badges-list`, after `#badges-card` and outside its
  live region, hairline above, no background or rim; folds with the grid, and remounts on
  folding so unsaved picks drop.
- ✓ **Empty.** "Birthday" muted, Day select (Day, 1–31), Month select (Month, January–December,
  values 01–12), Save `btn small`. Only Save stores (script: "picked 14/05: stored null").
  At 390 and 1280 it fits on one line.
- ✓ **Set.** "Birthday 14 May Change Clear", the date in `--text`, Change and Clear `btn quiet
  small`; no year, no 🎂, no "Birthday book", no hint sentence. Stored `05-14`.
- ✓ **Change.** Selects on 14 and May, Save + Cancel; at 390 Cancel wraps to the start of the
  next line, at 1280 one line. The Day select is focused after Change (focus ring in both shots).
- ✓ **Error.** "There is no 31 April." under the controls in `--danger`, `role="alert"`, both
  selects `aria-invalid` + `aria-describedby`, cleared on the next pick; nothing stored. "Pick
  a day and a month." in code; 29 February passes (`daysInMonth` gives February 29).
- ✓ **Birthday book earned.** Gold medal at the front after Save, count 5 → 6; its card "Finish a
  book on your birthday · Gold · secret · Unlocked 14 May 2026". Clear recomputes it back to "?".
- ✓ **Keyboard and screen reader.** `role="group"` labelled "Birthday"; selects "Day"/"Month";
  "Change birthday" described by the date, "Clear birthday"; Save `type="submit"`; focus Save /
  Cancel → Change, Change / Clear → Day, an error leaves focus on Save; Escape only while
  editing, and it stops there.
- ✓ **Touch.** Day, Month and Save 44 px at 390 touch, Change and Clear 44 px in *Set* (script);
  1280 with a mouse keeps the small sizes (Save 25 px).
- ✓ **Midnight and lavender** look the same on the walnut card; no new colours or tokens.
- ✓ **F11.** (1) `onKeyUp` on the grid cancels Space, and the comment now says why (Firefox's
  keyup click). (2) A chosen medal reads rim → dark → cream on silver
  (`…silver-chosen.png`: clearly two rings, no longer a thick silver rim), gold (`…birthday.png`)
  and gold + focus (`…chosen-focus.png`: the inner rings plus the gold outline outside the rim);
  no outer ring left. (3) `#badges-card` has `aria-labelledby` only while a card is open.
- ✓ All 12 icons on the medals match the table; every word in the row matches the design.

**The two notes**

1. **The toast's "already shown" list now only grows** (shown ∪ earned). Accepted, and needed:
   the design asks that clearing and saving the birthday again doesn't toast Birthday book a
   second time, and the old list (overwritten with today's earned badges) forgot it on Clear.
   The side effect, a badge lost and earned again (a book removed and put back) not toasting
   again, is the better behaviour anyway: "Badge unlocked" should mean new to her, not new
   again. The list can't run away: at most 72 ids. For the tester: the first visit (no list
   yet) must still toast nothing and only seed the list.
2. **The Dusty pile card in the focus shot.** Fine. The shot's job is F11's chosen + focused
   look, and any earned medal shows it; Dusty pile is simply the second earned medal on the demo
   shelf. It is an earned secret, so its name and emoji are rightly shown (D-0038), with "Gold ·
   secret · Unlocked 15 Sept 2026". It shows a gold rim with the inner rings, which the silver
   shot can't. No new shot needed.

**Not for this task:** the *Build notes* say Hanna confirmed the four morning questions at
03:30, in a night-mode task; *Questions to re-ask Hanna in the morning* still lists them. If
that confirmation isn't on record from her, the questions stand; the design doesn't change
either way.

# Test

By the tester on 2026-11-23 (night mode; Hanna not asked). **Verdict: passed.**

**CI's run** (`gh run view 45101631136`, head `7f1cf63`, attempt 1, no retries): `checks / checks`
green in 55 s: `harness check` all ✓, typecheck, `Test Files 103 passed | 1 skipped (104)`,
`Tests 1289 passed | 9 skipped (1298)` (the 9 are the PocketBase-only `favourites.pocketbase`
tests, skipped on every run), build ✓; Netlify preview ready. `shards` and `e2e` are skipped
because this project has no e2e suite (the same on #249).

**The task's checks, run here** (after `pnpm install --frozen-lockfile`):

```
$ git grep -n -i birthday -- src/server src/routes deploy src/lib/shelfMerge.ts src/lib/library.ts
(nothing; exit 1)
$ pnpm exec tsc --noEmit
(exit 0)
$ pnpm exec harness check
✓ tasks: 42 tasks, index in step
✓ decisions: 42 records, index complete, 3 overrules valid
✓ engineers: 2 listed
✓ generated files: current
$ for i in 1..5: pnpm exec vitest run badges.test.ts birthday.test.ts BadgesCard.test.tsx \
    BadgesCard.break.test.tsx BirthdayBadge.waiting.test.tsx colours.test.ts
Test Files  6 passed (6)   Tests  130 passed (130)      (5 of 5 runs)
```

**Trying to break the twelve badges** (new `describe('… trying to break them (T-0043 tester)')`
in `src/lib/badges.test.ts`, 9 tests, all passed first time, so no bug found):

- *Spooky season:* 30 Sept and 1 Nov never count, 1 Oct does; October 2024 beats October 2026;
  "Psychological Thrillers" counts; an October re-read of a book first read in March counts;
  no genres, or a horror finish with no day: nothing, no throw.
- *Winter warmer:* 23 and 27 Dec, 31 Dec, 1 Jan, 24 and 25 **January** and 26 November never
  count; 24–26 Dec over three years gives the earliest (2024-12-25).
- *Summer reader:* 27–31 Aug 2025 + 1–5 June 2026 stay apart (5 / 10, not 10); two summers that
  both reach 10 give the first one's 10th day, a later bigger summer doesn't move it; finishes
  with no day count for no summer.
- *Authors and co-authors:* only the first author counts. 9 Pratchett + Good Omens with Gaiman
  first stays 9 / 10; with Pratchett first it earns Superfan that day. 24 solo authors + one
  book by two new co-authors = 25 first authors (Wide reader earned, Well-read 25 / 50), not 26.
  An empty author list or a blank first author counts for nobody and doesn't throw.
- *Mix it up:* library and borrowed count as paper, an old single `format: 'ebook'` and a
  `storytelId` alone (Storytel) count; Other never does; a want-to-read audiobook doesn't.
- *Library lover:* want-to-read and did-not-finish library books and a borrowed book don't count;
  a library book read three times counts once (on its first finish); an old `format: 'library'`
  counts.
- *365-day streak:* a run from 1 June 2027 through 29 Feb 2028, split over two books with an
  overlapping third (days counted once) and a 0-amount day elsewhere, earns it on day 365; a 0
  amount inside the run is a gap (300 / 365); a 400-day run earns it on its 365th day.

**Trying to break the birthday:**

- *29 February:* finishes on 28 Feb and 1 March of 2025–2027 don't earn it; 29 Feb 2028 does
  (team choice 8). In Chrome, Day 29 + February saves as `02-29` and reads "Birthday 29 February".
- *Invalid dates:* "There is no 30 February." and "There is no 31 April / June / September /
  November." with nothing stored, `aria-invalid` on the selects, gone on the next pick; month
  only gives "Pick a day and a month."; a bad option passed to `badges()` (`''`, `13-40`, `abc`,
  `5-14`, `05/14`, `2026-05-14`, `' 05-14'`) earns nothing and doesn't throw; `02-30` written by
  another tab reads as none.
- *Blocked storage* (the birthday key throwing on get / set / remove; in Chrome via
  `Storage.prototype`, in a new jsdom test via a stubbed storage): the page loads with no
  errors, Save doesn't throw, nothing is stored, the row stays *Empty* and Birthday book stays
  hidden. (Nothing tells her it wasn't kept; the design has no state for it, and D-0039 asks
  only that it reads as none and nothing throws.)
- *Clearing removes the badge:* Clear (click, Enter or Space) → the stored value is gone and the
  medal is "Hidden badge" again; another tab removing the key (or `clear()`, key `null`)
  hides it at once without a reload and shows *Empty*; another tab setting it earns it at once;
  removed by hand and reloaded: hidden. New jsdom test for the other-tab cases.
- *Never leaves the device:* the grep above prints nothing, and the same search runs as a test
  in `birthday.test.ts`; nothing in `src` walks every localStorage key (searched for
  `Object.keys(localStorage)`, `localStorage.key(`, `.length`, `for … in`: none). In Chrome every
  request during Save, Change and Clear was checked: none outside the dev server's own module
  files carried "birthday", `05-14` or `02-29`.

**F11 in Chrome with real keys** (`playwright-core`, Chrome headless, dev server with no backend
on port 3161, no `POCKETBASE_URL`, no Netlify link; stopped afterwards): Space (key down + up) on
a medal opens exactly one card, Space again closes it, Space doesn't scroll the page; Enter opens
and closes; holding Enter (three keydowns, one keyup) and holding Space each toggle once; the
open card has `aria-labelledby="badges-card-title"`, the closed one none; chosen + focused is
`:focus-visible` with `rgb(38,29,23) 2px inset, rgb(244,234,217) 4px inset`. Birthday row by
keyboard: typing "14", Tab, "May" into the closed selects stores nothing; Tab to Save, Enter
stores `05-14`, focus on "Change birthday", Birthday book earned at once, row "Birthday 14 May
Change Clear"; Space on Change → selects, focus on Day; Escape → *Set*, focus on Change; Tab to
Clear, Space → cleared, focus on Day.

**One thing seen, not reproduced:** in 4 of the first 8 runs of the Chrome script, in the
dev server's first minutes, focus fell to the page after Save (or once after Clear): the row was
right and the value stored, but the focus effect never called `focus()` (instrumented). It did not
happen again in 40 more runs, among them 6× CPU throttling and four runs in parallel, and an
instrumented build never showed a commit that used up the focus request without the target
being there. Not a fail, since it can't be shown again. A follow-up for the developer: let the
effect in `BirthdayRow` clear `focusNext` only once the element it names exists, so a commit in
between can't use it up.

**Record:** status, `result` (#251) and Log current; D-0038 and D-0039 exist; the UX designer's
review is above (matches, no must-fix). Tests added: 9 in `badges.test.ts`, 3 in
`BadgesCard.test.tsx`.

# Log

- 2026-11-23 architect: wrote the task from Hanna's agreed brief ("better badges", item 3); the
  medal grid is T-0042, which this depends on for the block's look. Checked every new name, id
  and icon against the 60 badges on main (incl. the 14 travel badges): no clash; "Loyal reader"
  left out as a twin of the secret Loyal fan. Recorded D-0039 (the birthday stays on the device).
  Follows D-0013, D-0014, D-0020, D-0022, D-0038, D-0039. Night mode: nine choices under *Choices
  made by the team*, three questions for the morning. Size: **full**. Handed to the **UX
  designer** for the birthday field; the developer may build the badge logic and `birthday.ts`
  in the meantime, the field after T-0042 merges.
- 2026-11-23 ux-designer: designed (the birthday row at the end of the badge block: "Birthday"
  with Day and Month selects and Save, then "Birthday 14 May" with Change and Clear, 44 px on
  touch, errors only, no hint text and no 🎂; the 12 new medals and rims checked; F11 as must-dos:
  Space keyup cancelled, an inner cream ring with a dark gap for a chosen medal, the closed card
  unlabelled; 11 screenshots). Night mode: eight picks under *Choices made by the UX designer*,
  question 4 added to the morning list. Handed to the **developer**.
- 2026-11-23 developer: Hanna confirmed at 03:30 the names, Mix it up = paper + e-book +
  audiobook, no visible Loyal reader and no "only on this device" line. Built the twelve badges
  in `badges.ts` (`badges(books, today, { birthday })`), `birthday.ts` (MM-DD on this device,
  never throws), the birthday row (Empty / Set / Change, both errors, focus, Escape, 44 px on
  touch), the birthday passed by `BadgesCard`, `BadgeToasts` and "Waiting for you" through one
  `useBirthday()` hook, and F11 (Space keyup cancelled, inner cream ring with a dark gap, the
  closed card unlabelled); see *Build notes*. Checks: `git grep -n -i birthday -- src/server
  src/routes deploy src/lib/shelfMerge.ts src/lib/library.ts` printed nothing (exit 1), and the
  same search runs as a test in `birthday.test.ts`; `pnpm test` 100 files passed, 1 skipped,
  1117 tests passed, 9 skipped; `pnpm exec tsc --noEmit` clean; `pnpm run build` built;
  `pnpm exec harness check` all ✓; 11 screenshots in `docs/tasks/T-0043-screens/` (72 medals,
  6 a row at 390, 8 at 1280, row controls 44 px at 390 touch, 0 page errors);
  `src/routeTree.gen.ts` not committed. Merged main (#241) in and regenerated the index; after
  the merge `pnpm test` ran 103 files, 1289 tests passed. Draft PR #251. Handed to the **UX
  designer** for the review.
- 2026-11-23 ux-designer: reviewed: matches, no must-fix (the diff and all 11 screenshots: 72
  medals at 6 / 8 a row, the birthday row's Empty / Set / Change / error looks and words, 44 px
  on touch, Birthday book earned and its card, F11's keyup, inner rings on silver and gold, the
  unlabelled closed card). The growing toast list is accepted (the design needs it); the Dusty
  pile focus shot is fine. Handed to the **tester**.
- 2026-11-23 tester: passed (CI green on attempt 1; the grep check empty, tsc, harness check;
  130 new and affected tests 5 of 5 runs; the twelve badges' edges, 29 February, invalid dates,
  blocked storage, clearing here and in another tab, no request carrying the birthday, and F11
  with real Space and Enter in Chrome; 12 tests added). Seen once early, not reproduced: focus
  falling to the page after Save; a hardening for the developer is under *Test*. Merged main in,
  regenerated the index, marked #251 ready.
