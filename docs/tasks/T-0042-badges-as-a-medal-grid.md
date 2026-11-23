---
id: T-0042
title: "Show the badges as a grid of round medals with bronze, silver and gold rims, and a card under the grid when one is tapped"
description: "The Badges block (BadgesCard) becomes a compact grid of round medals with the emoji in the middle, earned then locked then hidden, with a bronze/silver/gold rim worked out per family in badges.ts (D-0038), grey locked and dark hidden medals, one inline card under the grid with the tapped medal's name, how, day or progress (a hidden one's riddle), the head row kept, and the Europe postcard's icon 🗼 replaced by 🏰."
status: Open
size: full
depends_on: [T-0040]
decisions: [D-0013, D-0014, D-0020, D-0022, D-0038]
raised_on: 2026-11-23
done_on: ""
result: []
---

# Goal

Part 1 of "better badges", agreed by Hanna in a feature chat on 2026-11-22 (part 2, the new
badges and the secret birthday badge, is T-0043 on its own branch). Requester: Hanna. Night
mode: she wasn't asked anything; the team's picks are under *Choices made by the team*.

The **Badges** block on the dashboard (`BadgesCard` in `src/components/NewBlocks.tsx`) is a
long list of wide tiles: 60 badges today, 72 after T-0043. Hanna wants it compact and nicer to
look at:

1. **A grid of round medals** instead of the list, with the badge's emoji in the middle. Order:
   earned (newest first), then locked (closest to done first), then hidden. The sort the block
   uses today stays; hidden medals move into the same grid, at the end.
2. **Tiers** (D-0038): an earned medal has a **bronze, silver or gold rim**. In a family of step
   badges (ids that differ only in their last number, like `books-1` … `books-250`) the lowest
   step is bronze, the highest gold and the ones between silver; a badge on its own (one-off,
   like Full bingo card or a Postcard) is gold. Worked out in `badges.ts` as a new
   `Badge.tier: 'bronze' | 'silver' | 'gold'`, never hand-listed per id.
3. **Locked** medals are grey (no rim colour); **hidden** medals are a dark medal with "?".
4. **Tap a medal → one small card under the grid**, inline like the bingo suggestion card
   (T-0017), not a pop-up (D-0013): the name, what it takes ("how"), and "Unlocked 3 Jan 2026"
   (or "Unlocked" with no day), or the progress ("4 / 5" with its bar) for a locked step badge.
   A **hidden** medal's card shows its riddle, never its name or emoji (as now). Tapping the same
   medal again closes the card; tapping another switches to it. One card at a time.
5. **The head row stays** as it is: the "Badges" title that folds the block (remembered on this
   device), "N of M unlocked (P%)" and the bar; folded, the count and the bar stay.
6. **Both wallpapers** (lavender and midnight, D-0022), with the rim colours as design-system
   tokens (D-0020).
7. **F10:** the Postcard from Europe's icon 🗼 is officially Tokyo Tower; it becomes **🏰**
   (whose official name is "European castle", a pair with Asia's 🏯 "Japanese castle").

# Done when

- **`src/lib/badges.test.ts`** (extend it):
  - every badge has a `tier`;
  - **the family rule, checked over the whole list** (so it still holds when T-0043 adds
    badges): group the badges by their id without a final `-<number>`; in every group of two or
    more, sorted by that number, the first is `bronze`, the last `gold`, the rest `silver`; every
    badge in a group of one is `gold`;
  - spot checks: `books-1` bronze, `books-5` … `books-100` silver, `books-250` gold; `genres-5`
    bronze, `genres-10` gold (no silver in a family of two); `listen-10` / `listen-100` /
    `listen-1000` bronze / silver / gold; `series-1` bronze, `series-10` gold; `streak-3` bronze,
    `streak-100` gold; `reread-3` (secret) bronze, `reread-5` gold; `continent-europe`,
    `continents-6`, `bingo`, `author-5` and `home-sweet-home` gold;
  - the T-0040 table test now expects `continent-europe` with **🏰**;
  - the existing tests (sorting inputs, unique names and ids, 12 secrets, riddles) still pass.
- **`src/components/BadgesCard.test.tsx`** (extend it; the fold test stays):
  - the block shows one medal button per badge (earned + locked + hidden = the "M" in the head
    row), in the order earned newest first, then locked closest first, then hidden;
  - each medal has an accessible name that says what it is and whether it is earned (a hidden
    one says it is a hidden badge, never its name); an earned medal carries its tier (e.g.
    `data-tier="gold"`), a locked one is marked locked and carries no tier colour;
  - tapping an earned medal opens one card under the grid with its name, how and
    "Unlocked <day>"; tapping a locked step medal shows "4 / 5"; tapping a hidden medal shows its
    riddle and not its name; tapping the same medal again closes it; tapping another switches;
    the medal says whether its card is open (`aria-expanded`), and the card is announced to a
    screen reader;
  - works with the keyboard (Enter and Space on a medal);
  - the head row: "N of M unlocked (P%)" and the bar are there, folded or not.
- **Colours:** the rim colours (and anything new for locked and hidden medals) are tokens in
  `src/styles.css` for both wallpapers; if any of them colours text, `src/lib/colours.test.ts`
  covers it. Every medal is at least the 44 px tap size (D-0020).
- **The block, by eye** (the UX designer reviews): screenshots in `docs/tasks/T-0042-screens/`
  at 390 × 844 and 1280 × 800, lavender and midnight, on a local dev server with no backend
  (never a production `POCKETBASE_URL`, G-0019) and a demo shelf that earns badges of all three
  tiers: the grid closed, the card open on an earned medal, on a locked step medal with progress,
  and on a hidden medal with its riddle; one shot folded.
- `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm run build` and `pnpm exec harness check` pass;
  `src/routeTree.gen.ts` is not committed.

# Notes

- **Read first:** D-0038 (the grid, the card, the tier rule), D-0013 (no pop-ups), D-0014 (no
  explanatory hint texts), D-0020 and D-0022 (tokens, both wallpapers, 44 px), T-0040 (the travel
  badges and their screenshots script `docs/tasks/T-0040-screens/screens.mjs`, which can be
  reused), T-0017 (the bingo suggestion card, the inline card to echo).
- **Files:** `src/lib/badges.ts` (+ `tier`, the 🏰), `src/lib/badges.test.ts`,
  `src/components/NewBlocks.tsx` (`BadgesCard`), `src/components/BadgesCard.test.tsx`,
  `src/styles.css` (the `.badge*` rules around "badges, the cover wall"). `BadgeToasts` and the
  "Waiting for you" line don't change.
- **The "N hidden badges. Tap one for a riddle." line** under today's list: whether it stays now
  that hidden medals sit in the grid is the UX designer's call (D-0014 leans to dropping it).
- **T-0043** (branch `new-badges`) adds 12 badges and a birthday field in this block, and
  depends on this task for the look: its ids follow the `<family>-<number>` pattern, so they get
  their tiers from the rule here without a change. The two branches both touch
  `docs/tasks/index.md`, `docs/decisions/index.md`, `badges.ts` and its test: whoever merges
  second rebases and reruns `pnpm exec harness tasks-index`.
- **Group 1** (guardrails): app code and styles, nothing saved (the fold already uses this
  device's storage), no code-owned path.
- **Size: full.** A new look and a new way to use the block (grid + tap card), so the UX designer
  designs it first.
- **Not doing:** a celebration when a badge unlocks; changes to the toast; new badges (T-0043).

## Choices made by the team

Hanna wasn't asked anything (night mode). The architect took these:

1. **Families come from the ids** (`books-1` … `books-250`), secret badges included, so the
   secret Old friend (read one book 3 times) is the bronze step under Old favourite (5 times),
   and the secret Loyal fan (5 books by one author) is gold until T-0043's Superfan (10) makes it
   bronze.
2. **A family of two has no silver:** Explorer bronze, Globetrotter gold; Bilingual bronze,
   Polyglot gold; Critic / Head critic, Diarist / Storyteller, Dreamwalker / Realm hopper the same.
3. **Locked medals are plain grey**, without a hint of the rim they will get; only earned medals
   show bronze, silver or gold.
4. **World tour** (all six continents) is gold, being one badge on its own; the six Postcards are
   gold too (one-off).
5. **The Europe postcard gets 🏰** ("European castle") instead of 🗼.
6. **One card at a time, under the whole grid**, not under the medal's row, as the brief says.

## Questions to re-ask Hanna in the morning

1. "The Postcard from Europe had a tower that is really the Tokyo Tower. It's now a castle 🏰
   (its official name is 'European castle'). Do you like that, or would you rather have another
   picture?"
2. "Medals you haven't earned yet are plain grey, so you can't see yet whether they'll be
   bronze, silver or gold. All right, or would you like a faint hint of their colour?"

# Design

To be written by the UX designer before the build.

# Test

To be written by the tester.

# Log

- 2026-11-23 architect: wrote the task from Hanna's agreed brief ("better badges", items 1 and
  2, plus F10 from the T-0040 review); the new badges and the birthday badge are T-0043.
  Recorded D-0038 (the medal grid, the card, bronze/silver/gold by family). Follows D-0013,
  D-0014, D-0020, D-0022, D-0038. Night mode: six choices under *Choices made by the team*, two
  questions for the morning. Size: **full**. Handed to the **UX designer** for the design.
