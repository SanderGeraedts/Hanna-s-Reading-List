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
3. *(added by the UX designer)* "The line 'N hidden badges. Tap one for a riddle.' is gone: the
   hidden badges are now the dark '?' medals at the end of the grid. Do you miss that line?"

# Design

Written by the UX designer on 2026-11-23, at night: Hanna wasn't asked; the picks are under
*Choices made by the UX designer*, and one question is added to the morning list above. Looked
at today's block (`BadgesCard`), the bingo suggestion card (T-0017, `.bingo-suggest`), the
T-0040 screenshots and the tokens at the top of `src/styles.css`.

## The block, top to bottom

1. **Head row: unchanged.** The "Badges ▾" title button that folds the block (remembered on
   this device), "N of M unlocked (P%)" and the gold bar under it. M counts every badge,
   hidden ones included, as now. Folded, the count and the bar stay.
2. **The medal grid**, inside `#badges-list` (still what the fold button controls).
3. **The medal card**, only while a medal is chosen.
4. **A free spot for T-0043:** nothing is drawn here now. The unfolded body (`#badges-list`) is
   one vertical stack (`display: grid; gap: var(--space-3)`): grid → card → *(T-0043's birthday
   row)*. T-0043 only appends its row at the end, and it folds away with the rest. Keep the
   card's live region (below) a sibling of that spot, never its parent.

**Dropped:** the "🔒 N hidden badges. Tap one for a riddle." line and the separate list of
hidden tiles. The dark "?" medals at the end of the grid say it themselves (D-0014).

## The grid

- A `<ul>` of medals, each `<li>` holding one `<button>`. Order as D-0038: earned (newest day
  first, undated last), locked (closest to done first), hidden. Today's sorting stays.
- **Medal size: 48 px** round (`calc(var(--tap) + var(--space-1))`): the whole circle is the
  tap target, above the 44 px minimum. No new size token.
- **Columns:** `grid-template-columns: repeat(auto-fill, minmax(48px, 1fr))`, each medal
  centred in its column (`justify-items: center`), **gap `var(--space-2)`** (8 px) both ways.
  - **390 px wide** (the card's inner width is about 332 px): **6 per row**, 10 rows for 60
    badges (12 for 72), about 560 px tall instead of today's long list.
  - **1280 px wide** (the block in a half-width column, inner width about 484 px): **8 per
    row**, 8 rows for 60 badges (9 for 72).
  - Wider (the one-column layout up to 860 px) simply fits more per row.
- `title` on each button: the badge's name (a hover hint on a computer); "Hidden badge" for a
  hidden one.

## The medal look

Every medal: a circle (`--radius-pill`), the emoji centred at `--fs-heading` (as today's
icons), `line-height: 1`. Three states:

| state | face | rim | middle |
|---|---|---|---|
| **earned** | `--surface-raised` | **3 px solid** in its tier colour | the emoji, full colour |
| **locked** | `--surface-sunken` | 2 px solid `--border-strong` | the emoji, grey: `filter: grayscale(1)`, `opacity: 0.5` |
| **hidden** | new `--medal-hidden` | 2 px **dashed** `--border-strong` (today's secret-tile dash) | a **"?"**: `--serif`, bold, `--fs-large`, colour `--muted` |

A locked or hidden medal has the same outer size as an earned one (the thinner rim sits
inside), so nothing shifts when a badge is earned.

**New tokens** in the colours part of `:root` (D-0020). The card is walnut on both wallpapers
and the midnight block changes only wallpaper tokens (D-0022), so one value each works on both:

| token | value | on a card, lavender (top / bottom) | on a card, midnight (top / bottom) |
|---|---|---|---|
| `--medal-gold` | `var(--accent)` (#d9a85b) | 5.5 / 5.8 : 1 | 7.4 / 7.6 : 1 |
| `--medal-silver` | `#c3c9d4` | 7.2 / 7.6 : 1 | 9.6 / 9.8 : 1 |
| `--medal-bronze` | `#c8814f` | 3.8 / 4.0 : 1 | 5.1 / 5.2 : 1 |
| `--medal-hidden` | `rgba(0, 0, 0, 0.45)` | the "?" (`--muted`) on it: 7.3 : 1 | 8.2 : 1 |

Rims are outlines, so they need 3 : 1 (WCAG 1.4.11): add the three rims to `colours.test.ts`
at 3 : 1 against `cardsOnWall` and `midCards`, and the "?" (`--muted` over `--medal-hidden`
over a card) at 4.5 : 1, both wallpapers. Against the earned face (`--surface-raised` over a
card) the rims also stay above 3 : 1 (bronze 3.2 at worst).

The tiers differ by hue (warm gold, cool silver-white, copper), so **the tier is also said in
words**: in the medal's accessible name and in the card.

## Hover, chosen, focus

- **Hover** (mouse): the face turns `--surface-hover`; `cursor: pointer`. Nothing moves.
- **Chosen** (its card is open): face `--surface-hover` and a **cream ring** right outside the
  rim, `box-shadow: 0 0 0 2px var(--text)`. Cream, not gold, so it is never mistaken for a gold
  rim. A chosen locked medal keeps its grey emoji.
- **Keyboard focus** (`:focus-visible` only): the house ring, `outline: 2px solid
  var(--accent); outline-offset: 3px`, outside the cream ring, so chosen and focused show
  together; it fits in the 8 px gap. No ring after a tap or a click.
- No animation, so nothing to switch off for reduced motion.

## The medal card

The bingo suggestion card's box (T-0017), reusing its classes or sharing them: sunken well,
`--accent-line` border, `--radius-card`, `--space-3` padding (no `margin-top`: the stack's gap
does it), the heading row with the **×** top right (44 px on touch, last in tab order). One
card, under the whole grid (team choice 6).

**Earned**
- Heading (h3, serif, `--fs-body`): the emoji (`aria-hidden`) and the name: "📚 Bookworm".
- What it takes, `muted small-text`: "Finish 25 books".
- In gold (`badge-on small-text`, as now): **"Gold · Unlocked 3 Jan 2026"**; without a day
  "Gold · Unlocked"; an earned secret one "Bronze · secret · Unlocked 3 Jan 2026" ("secret"
  italic, as now).

**Locked**
- Heading: the emoji, grey like its medal, and the name.
- What it takes, `muted small-text`.
- A step badge (with `progress`): the bar and **"4 / 5"**, today's `.badge-progress` row, with
  `toLocaleString('en')` ("230 / 1,000"). Shown at 0 too ("0 / 5", empty bar): the card is now
  the only place the number lives.
- A one-off badge (no `progress`): **"Locked"**, `muted small-text`.

**Hidden**
- Heading: "? Hidden badge" (the "?" styled like the medal's, `aria-hidden`).
- The riddle, `small-text`, `--text`, italic, as today's open secret tile. Never the name, the
  emoji or what it takes.

**Long text:** names and riddles wrap (`overflow-wrap: anywhere`); the heading leaves room for
the × as the bingo card does.

**Opening and closing**
- Tap, click, Enter or Space on a medal opens its card; on the chosen medal it closes it; on
  another medal it switches. One card at a time.
- **×** closes it; focus goes back to the medal that was chosen.
- **Escape** anywhere in the block while a card is open closes it; focus back to its medal.
- **Folding** the block closes the card, so unfolding shows the plain grid.
- **The shelf changes while a card is open** (she finishes a book on another device): the card
  follows the same badge by id and updates in place; a medal that becomes earned shows its
  tier and day and moves to the front, keeping focus if it had it. If the badge is gone, the
  card closes.
- **Focus stays on the medal** when the card opens (the bingo card moves focus to its heading
  because it has buttons to use; this one only has ×), so she can go medal by medal with the
  arrows and Enter. The card is read out instead (below). On a phone the card is brought into
  view with `scrollIntoView({ block: 'nearest' })`, smooth only without reduced motion, as the
  bingo card does.

## Keyboard

- The grid is **one Tab stop** (roving `tabindex`): the chosen medal, or else the last focused
  one, or else the first, has `tabIndex={0}`, the rest `-1`. 60–72 Tab presses is too many.
- **← / →**: previous / next medal in grid order, running on into the next or previous row;
  they stop at the first and last medal.
- **↑ / ↓**: the medal straight above / below. The step is the number of columns shown right
  now, read from the layout (e.g. by comparing `offsetTop`s), so it is right at 6, 8 or 13 per
  row. From the last full row, ↓ goes to the last medal when the row below is shorter; in the
  last row it stays.
- **Home / End**: first / last medal.
- **Enter / Space**: open, close or switch the card. **Escape**: close it.
- **Tab** from the grid goes to the card's × (when open), then on to the next block.

## What a screen reader hears

- The head row as now: "Badges, button, expanded", "8 of 60 unlocked (13%)", "Badges
  unlocked, progress bar".
- The grid: `<ul aria-label="Badges">`: "Badges, list, 60 items".
- Each medal button: the emoji is `aria-hidden`; it has `aria-expanded` and
  `aria-controls="badges-card"`, and this accessible name:
  - earned: **"Bookworm, gold, unlocked"**; an earned secret one: "Old friend, bronze,
    unlocked, secret badge";
  - locked step: **"Bookworm, locked, 4 of 5"**; locked one-off: "Postcard from Oceania,
    locked";
  - hidden: **"Hidden badge"**, never its name.

  So she hears "Bookworm, gold, unlocked, button, collapsed, 1 of 60".
- The card: `<section id="badges-card" aria-labelledby="badges-card-title">`. Its contents sit
  in one `<div aria-live="polite" aria-atomic="true">` that is **always in the page** (empty
  while closed), so opening or switching reads the card out: "Bookworm. Finish 25 books. Gold,
  unlocked 3 Jan 2026." or "Hidden badge. No passport needed: a story set among the tulips,
  windmills and canals." The × is "Close, button". Closing says nothing more (the medal's
  "collapsed" says it).
- The toast and *Waiting for you* don't change.

## Done when (added by the UX designer)

- At 390 × 844 the grid shows **6 medals per row**, at 1280 × 800 **8 per row**; every medal is
  a 48 × 48 px circle.
- `--medal-gold`, `--medal-silver`, `--medal-bronze` and `--medal-hidden` are tokens in
  `:root`; `colours.test.ts` checks the three rims at 3 : 1 on a card and the "?" at 4.5 : 1 on
  the hidden face, on both wallpapers.
- The "Tap one for a riddle" line and the separate hidden list are gone; hidden medals are the
  last ones in the grid.
- **Keyboard** (in `BadgesCard.test.tsx` where jsdom can, by hand in the review otherwise): the
  grid is one Tab stop; → and ← move between medals, Home and End go to the first and last;
  Escape and × close the card and put focus back on its medal; focus stays on the medal when
  the card opens.
- The card's text is in a live region that is in the page before the card opens; the medals'
  accessible names follow the patterns above ("Bookworm, gold, unlocked", "Bookworm, locked,
  4 of 5", "Hidden badge").
- A chosen medal has the cream ring; a keyboard-focused one the gold outline outside it; a
  chosen, focused medal shows both.
- The card shows the tier in words ("Gold · Unlocked 3 Jan 2026").

## Screenshots (`docs/tasks/T-0042-screens/`)

Reuse T-0040's `screens.mjs` (a demo shelf in localStorage, a dev server with **no backend**,
the window as tall as the page). The demo shelf earns at least one bronze, one silver and one
gold medal, has a locked step badge with progress above 0, and hidden medals.

| file | width | wallpaper | state |
|---|---|---|---|
| `badges-390-lavender.png` | 390 | lavender | grid, no card |
| `badges-390-midnight.png` | 390 | midnight | grid, no card |
| `badges-1280-lavender.png` | 1280 | lavender | grid, no card |
| `badges-1280-midnight.png` | 1280 | midnight | grid, no card |
| `badges-390-lavender-earned.png` | 390 | lavender | card on a **silver** earned medal |
| `badges-1280-midnight-earned.png` | 1280 | midnight | card on a **bronze** earned medal |
| `badges-390-midnight-locked.png` | 390 | midnight | card on a locked step medal ("x / y" and bar) |
| `badges-1280-lavender-locked.png` | 1280 | lavender | card on a locked step medal |
| `badges-390-lavender-hidden.png` | 390 | lavender | card on a hidden medal, its riddle |
| `badges-1280-midnight-hidden.png` | 1280 | midnight | card on a hidden medal, its riddle |
| `badges-390-lavender-focus.png` | 390 | lavender | a medal opened with Enter and still focused (cream ring + gold outline) |
| `badges-390-lavender-folded.png` | 390 | lavender | folded: head row, count and bar only |

## Choices made by the UX designer

1. Medals are 48 px at every width; the grid fills each row (6 at 390, 8 at 1280).
2. The tier is said in words as well ("Gold · Unlocked …" in the card, "gold" in the accessible
   name), since the rims differ by colour alone.
3. The chosen medal gets a cream ring, not gold, so it can't be mistaken for a gold rim.
4. Focus stays on the medal and a live region reads the card, so browsing with the arrows and
   Enter works.
5. The hidden-badges line goes (D-0014; question 3 for the morning); a locked step badge shows
   its progress in the card even at 0; a locked one-off says "Locked".
6. Folding closes the card. T-0043's birthday row goes at the end of the folding body.

# Test

To be written by the tester.

# Log

- 2026-11-23 architect: wrote the task from Hanna's agreed brief ("better badges", items 1 and
  2, plus F10 from the T-0040 review); the new badges and the birthday badge are T-0043.
  Recorded D-0038 (the medal grid, the card, bronze/silver/gold by family). Follows D-0013,
  D-0014, D-0020, D-0022, D-0038. Night mode: six choices under *Choices made by the team*, two
  questions for the morning. Size: **full**. Handed to the **UX designer** for the design.
- 2026-11-23 ux-designer: designed (48 px medals, 6 per row at 390 and 8 at 1280, rim tokens
  `--medal-gold` / `--medal-silver` / `--medal-bronze` and `--medal-hidden`, one inline card
  with a live region, arrow keys on a one-Tab-stop grid, a free spot for T-0043's birthday row,
  12 screenshots). Night mode: six picks under *Choices made by the UX designer*, one question
  added to the morning list. Handed to the **developer**.
