---
id: T-0043
title: "Add twelve badges: a 365-day streak, seasons, authors, formats and a secret Birthday book with the birthday entered once per device"
description: "src/lib/badges.ts gets 365-day streak, Spooky season, Summer reader, Winter warmer, Superfan, Wide reader, Well-read, Mix it up, Library lover, E-reader, All ears and the secret Birthday book; the birthday (day and month) is entered once per device in the Badges block and kept only in this browser (D-0039)."
status: Open
size: full
depends_on: [T-0042]
decisions: [D-0013, D-0014, D-0020, D-0022, D-0038, D-0039]
raised_on: 2026-11-23
done_on: ""
result: []
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

# Design

To be written by the UX designer before the build (the birthday field; the badges follow the
table and T-0042's medals).

# Test

To be written by the tester.

# Log

- 2026-11-23 architect: wrote the task from Hanna's agreed brief ("better badges", item 3); the
  medal grid is T-0042, which this depends on for the block's look. Checked every new name, id
  and icon against the 60 badges on main (incl. the 14 travel badges): no clash; "Loyal reader"
  left out as a twin of the secret Loyal fan. Recorded D-0039 (the birthday stays on the device).
  Follows D-0013, D-0014, D-0020, D-0022, D-0038, D-0039. Night mode: nine choices under *Choices
  made by the team*, three questions for the morning. Size: **full**. Handed to the **UX
  designer** for the birthday field; the developer may build the badge logic and `birthday.ts`
  in the meantime, the field after T-0042 merges.
