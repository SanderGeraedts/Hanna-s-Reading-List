---
id: T-0090
title: "Open the Challenges page with a ring per challenge, celebrate a finished one once, and give it a medal"
description: "A row of small progress rings at the top of the Challenges page, one per challenge for the chosen year, each a button that scrolls to that challenge; the first visit after a challenge is complete draws one short confetti burst (no pop-up, D-0013) and completed challenges count towards a new challenges-1/5/10 badge family."
status: Done
size: full
depends_on: []
decisions: [D-0013, D-0014, D-0017, D-0020, D-0038, D-0064]
raised_on: 2026-11-23
done_on: 2026-11-23
result: ["https://github.com/SanderGeraedts/Hanna-s-Reading-List/pull/267"]
---

# Goal

Backlog item **CH1**, agreed with Hanna on 22 November 2026:

- a row of small progress rings at the top of the Challenges page, one per challenge; tap a
  ring to jump to that challenge;
- finishing a challenge gives a short confetti burst — **once**, on the first visit after
  finishing, and **not** a pop-up (D-0013);
- and a medal in her badge collection.

Today the page opens with a flat list of trophy lines (`src/lib/trophies.ts`) that covers only
some of the challenges and says nothing about how far along the others are, and finishing one
is marked by nothing at all.

**D-0064** settles how: one summary shape (`challengeRings.ts`) that every challenge reports,
the ring row and the trophy row both reading it, the celebration remembered per device like
the "Badge unlocked" toasts, and **one** badge family rather than one medal per challenge.

Nothing is saved on the server for any of this.

# Done when

1. `pnpm test`, `pnpm run build` and `pnpm exec tsc --noEmit` pass, and `pnpm exec harness check`
   passes.
2. New tests in `src/lib/challengeRings.test.ts`:
   - a shelf with **no challenges at all** (no goal, no monthly picks, no bingo finishes, no
     own challenges, no places, no reading log) gives **no rings** and no crash, and the page
     then shows its empty line;
   - the reading goal gives a ring `3 of 12` and is `complete` at `12 of 12` and at `13 of 12`;
   - a challenge with `goal` 0 or missing gives **no ring** (an unset reading goal, a monthly
     challenge with no books picked);
   - her own challenges give one ring each, in the order the page shows them, named by her
     name for them, and a `finishseries` pick gives its ring through the Read the series card,
     not a second one (after T-0091);
   - `completedChallenges(...)` counts every complete challenge over every year with data, and
     counts a challenge complete in two different years twice (they are two challenges);
   - the same shelf gives the same rings twice in a row (no randomness).
3. New tests in `src/lib/challengeCelebrate.test.ts` (the pure part of the celebration):
   - `toCelebrate(complete, seen)` is empty when `seen` is `null` (the first run on a device)
     and returns the ids to record, so the first run records everything and celebrates
     nothing;
   - with two challenges newly complete it returns **both ids to record** but asks for **one**
     burst (`burst: true`), never two;
   - an id already in `seen` is never celebrated again, and an id that stops being complete
     (she raised the goal) stays recorded, so lowering it again does not celebrate twice.
4. New tests in `src/components/ChallengeRings.test.tsx`:
   - each ring is a `button` whose accessible name is `<name>: 3 of 12` and `<name>: done,
     12 of 12` when complete, with `aria-describedby` nothing and no title-only text;
   - clicking a ring calls `scrollIntoView` on `#challenge-<id>` (asserted through a stub on
     the element), and keyboard Enter and Space do the same;
   - a complete ring carries the class `done`, and the row has `role="group"` with
     `aria-label="Your challenges in 2026"`;
   - with one challenge the row still renders; with twelve it wraps and does not scroll the
     page sideways (asserted by the class, the layout is in CSS).
5. New tests in `src/components/Confetti.test.tsx`:
   - `confetti()` with no layer mounted does nothing and throws nothing;
   - the layer draws one burst per call, removes it after its life, and is `aria-hidden` with
     no focusable element inside;
   - with `prefers-reduced-motion: reduce` matched, the layer draws **nothing**.
6. A new test in `src/lib/badges.test.ts` style (in `src/lib/badges.challenges.test.ts`):
   - with no challenges, `challenges-1` is not earned and shows `0 of 1`;
   - one complete challenge earns `challenges-1`; five earn `challenges-5`; ten earn
     `challenges-10`, and the family's tiers are bronze / silver / gold (D-0038);
   - `badges(books)` with **no** `challenges` option still returns the family, counting the
     ready-made challenges only, and never crashes.
7. The Challenges page shows the ring row above the trophy lines, and `yearTrophies` is a view
   of `challengeRings` so the two can never disagree (a test asserts one trophy line per ring
   with a goal).
8. Keyboard and screen reader: the row is reachable by Tab, each ring is a button with a full
   accessible name, and moving to a challenge puts focus on that challenge's heading, not only
   the scroll position.
9. The UX designer has reviewed the built page at 390 px and 1280 px on both wallpapers and
   written the review in *Design*.

# Notes

- Files: new `src/lib/challengeRings.ts`, `src/lib/challengeCelebrate.ts`,
  `src/components/ChallengeRings.tsx`, `src/components/Confetti.tsx`; changed
  `src/lib/trophies.ts`, `src/lib/badges.ts`, `src/components/ChallengesPage.tsx`,
  `src/routes/index.tsx` (the one `<ConfettiLayer />`), `src/styles.css`.
- The anchor to scroll to already exists: `ArrangeGrid` renders `id="challenge-<id>"` for
  every block (`anchor={(id) => \`challenge-${id}\`}` in `ChallengesPage.tsx`), and the page's
  `scroll-padding-top` already keeps it clear of the header (T-0035, checked by
  `src/styles.test.ts`).
- Follow `BadgeToasts` in `src/components/NewBlocks.tsx` for the per-device memory, including
  its "storage blocked means no toast, rather than the same one every visit".
- `badges()` gets the own challenges through `BadgeOptions`; `Dashboard.tsx` and
  `NewBlocks.tsx` already have `accountId`, so they can read them with `useOwnChallenges`.
- `Confetti.tsx` copies the shape of `Sparkles.tsx` (a window event, one layer, no library).
  **No new npm package** for confetti.
- No hint text (D-0014): the row explains itself through the rings' names and numbers. The
  page's existing `No challenges in 2026 yet.` stays as the empty line.
- Don't touch the page tab row: a sibling branch adds a **Stats** tab.

# Choices made while Hanna was at work

Hanna was at work on 23 November 2026 and could not be asked. Each of these took the
recommended or the most easily undone option; she can change any of them this evening.

1. **The ring row replaces the trophy lines.** The old row said the same thing in words
   (`Goal reached · 48 of 40`), and showing both would have been eleven rings plus eleven
   sentences. The one line that is *not* a challenge with a goal — `3 full bingo cards` — is
   kept under the row. *To change:* bring `yearTrophies` back; it is one function.
2. **The row sits on the cards' surface, not in a sunken well,** because over the pale
   lavender wallpaper a translucent well left the names unreadable (see the review).
3. **A ready-made challenge with a goal of its own (bingo, A–Z, the world, the seasons, the
   minutes) only gets a ring once she has started it.** Otherwise a brand-new shelf would
   open with a row of zeroes instead of the page's quiet `No challenges in 2026 yet.` The
   cards are always on the page, so nothing is hidden. *To change:* one flag in
   `challengeRings.ts`.
4. **One medal family (`challenges-1/5/10`), not one medal per challenge** — the same reason
   D-0042 §7 gives for tropes: a medal per challenge would change the grid every time she
   invents one.
5. **The confetti only falls on the Challenges page.** That is where the rings are, and a
   burst on the shelf would come out of nowhere. *To change:* the layer is already on every
   page; only the trigger would move.
6. **The "already celebrated" memory is per device.** Clearing the browser's storage means the
   next finished challenge is celebrated again. Saving it with her account would mean one more
   thing to sync for a party trick.
7. **No confetti when the device asks for less movement,** and never any sound.
8. **The medal carries no day,** so it never turns up under *Waiting for you* (which is for
   questions, D-0013).
9. **The decisions were renumbered.** The Stats branch took D-0060 and D-0061 while this was
   being built, so these four are **D-0064 … D-0067**. Nothing else changed.

# Design

Written by the UX designer, 2026-11-23, before the build.

## 1. Where the row goes

The Challenges page is `header` (title + year switch) → trophy lines → Arrange bar → the grid.
The ring row goes **between the header and the trophy lines**, so it is the first thing under
the page title at both widths and the year switch sits right above it.

```
┌──────────────────────────────────────┐
│ Challenges            ‹  2026  ›     │
│                                      │
│  ◍    ◍    ◍    ◍    ◍    ◍          │  ← the ring row
│ Goal Month Bingo A–Z World Series    │
│                                      │
│ 🏆 Goal reached · 48 of 40           │  ← the trophy lines, unchanged
│ · A–Z titles · 19/26                 │
└──────────────────────────────────────┘
```

## 2. One ring

- A 44 × 44 SVG at 390 (the tap target, `--tap`), 52 × 52 at 1280, inside a `button`.
- The track is `rgba(255,255,255,0.1)` and the fill `var(--accent)` with `stroke-linecap:
  round`, exactly as `.goal-ring` already draws the reading goal, at `stroke-width: 5`. The
  same drawing at a smaller size means the row and the goal card can never look like two
  different apps.
- In the middle: the **done** number only, in `--serif`, `--fs-small`. Not "3/12": at 44 px two
  numbers and a slash are unreadable. The full `3 of 12` is in the accessible name and in the
  `title`.
- **Complete:** the ring fills all the way round, the middle number is replaced by a gold
  check `✓` in `--accent-ink` on a gold disc (`--accent`), and the label under it turns
  `--text` from `--muted`. Class `done`.
- **Under the ring:** a short name, `--fs-tiny`, `--muted`, one line, clipped with an ellipsis
  at 5.5rem. The short names are **Goal, Month, Bingo, A–Z, World, Seasons, Minutes, Series**
  and, for one of her own, the first word of her name for it (`Fantasy year` → `Fantasy`). The
  full name is in the accessible name, so nothing is lost.
- Rings wrap onto a second line rather than scrolling sideways (`flex-wrap: wrap`,
  `gap: var(--space-3)`), because a sideways scroller on a phone hides half the challenges and
  fights the page's own scrolling. Twelve rings are two rows at 390 and one at 1280.

## 3. Both wallpapers

The row sits on the page, not in a card, so it has no surface of its own. On **lavender** the
track at 10 % white over the pale wallpaper is too faint, so the row gets the page's own card
treatment at low strength: `background: var(--surface-sunken)`, `border-radius:
var(--radius-card)`, `padding: var(--space-3)`. That is the same well the bingo squares sit in
and it reads on both wallpapers; on **midnight** it simply disappears into the dark, which is
right.

## 4. The confetti

- A burst from the **top of the page**, falling: 34 small paper rectangles (4–9 px) in gold
  (`--accent`), cream (`--text`), bronze (`--medal-bronze`) and silver (`--medal-silver`) —
  the medal colours, so it belongs to this app and not to a party-supplies shop. Each piece
  falls 60–75 % of the viewport height with a sideways drift and a spin, over 1.6 s, then
  fades. One burst, then nothing.
- It is drawn by `<ConfettiLayer />`, one per page, `position: fixed`, `inset: 0`,
  `pointer-events: none`, `aria-hidden`, `z-index` just under the header. It never covers a
  control, never takes focus, asks nothing and closes itself — so it is not a pop-up (D-0013).
- **Reduced motion:** nothing is drawn at all. The ring is already gold with a check; that is
  the state, and the burst is only the party.
- No sound, ever.

## 5. What she sees when a challenge finishes

She opens Challenges (or the dashboard, where the rings do not show — the burst belongs with
the rings, so the layer only fires on the Challenges page). The rings draw, the finished one is
gold with a check, and about 150 ms later the confetti falls once. The trophy line for it
already reads `Goal reached · 48 of 40`. Nothing else changes, nothing is clicked away.

## 6. The medal

In the badge grid, between the existing `monthly` badge and the seasons, a family of three:

| id | icon | name | how |
|---|---|---|---|
| `challenges-1` | 🎖️ | First challenge | Finish a challenge |
| `challenges-5` | 🏵️ | Five challenges | Finish 5 challenges |
| `challenges-10` | 🎗️ | Ten challenges | Finish 10 challenges |

Bronze, silver, gold by step (D-0038, automatic from the family). A locked one shows its
progress (`3 of 5`) like every other badge with steps.

## 7. Exact words

- Row label (screen reader only, on the `group`): `Your challenges in 2026`.
- A ring's accessible name: `Reading goal: 3 of 12`; complete: `Reading goal: done, 12 of 12`.
  Minutes a day reads `Minutes a day: 12 of 23 days`; Seasonal reads `Seasonal: 2 of 4 seasons`.
- No heading over the row and no sentence under it (D-0014); the page already says
  *Challenges*.
- Empty: when nothing has a goal the row is **not rendered at all** and the page keeps its
  existing line `No challenges in 2026 yet.`

## 8. Keyboard and screen reader

- The row is a `div role="group"` with `aria-label`; each ring is a real `<button>`, so Tab
  reaches them in the page's order and Enter and Space both activate.
- Activating a ring scrolls `#challenge-<id>` into view **and moves focus to that block's
  heading** (`tabIndex={-1}` on the `h2`, as `#bingo-title` already has), so a screen-reader
  user lands in the challenge instead of being told nothing happened. The page's
  `scroll-padding-top` keeps the heading clear of the header (T-0035).
- The confetti layer holds nothing focusable and is `aria-hidden`, so it is invisible to a
  screen reader. A completed challenge is announced by its ring's name, not by a live region:
  nothing shouts over what she is reading.

## 9. Screenshots the developer must take

1. `rings-390-lavender.jpg` — the page top with six rings, one complete.
2. `rings-390-midnight.jpg` — the same on the midnight wallpaper.
3. `rings-1280-lavender.jpg` — one row of rings at 1280.
4. `rings-1280-midnight.jpg`.
5. `rings-390-none.jpg` — a shelf with no challenges: no row, the empty line.
6. `rings-confetti-390.jpg` — mid-burst, with the gold ring behind it.
7. `rings-focus-390.jpg` — a ring with the keyboard focus outline.
8. `challenge-medals-390.jpg` — the three new medals in the badge grid, one earned.

## Review after the build

Written by the UX designer, 2026-11-23, from the screenshots in `T-0090-screens/` (a dev
server with no backend, 390 × 844 and 1280 × 900, both wallpapers).

**Verdict: passes, with one change already made and two notes for Hanna.**

| what | result |
|---|---|
| the row sits between the title and the page's content | matches (`rings-390-lavender.jpg`) |
| one ring per challenge, the done number inside, the short name under | matches |
| a complete ring is a gold disc with a `✓` and a `--text` label | matches (Goal, Pages, Old) |
| rings wrap, never scroll sideways | matches: eleven rings are three rows at 390, one row at 1280 |
| both wallpapers | matches (`rings-390-midnight.jpg`, `rings-1280-midnight.jpg`) |
| no rings and the page's own line on an empty shelf | matches (`rings-390-none.jpg`) |
| the confetti is paper in the medal colours, falls once, covers no control | matches (`rings-confetti-390.jpg`) |
| the focus outline on a ring | matches (`rings-focus-390.jpg`) |
| the three medals in the badge grid | matches (`challenge-medals-390.jpg`, the 🎖️ is earned) |

**Changed during the build, with my agreement:** the design said the row sits in a sunken
well (`--surface-sunken`). Over the pale lavender wallpaper that left the ring tracks and the
short names too faint to read, so the row now uses the cards' own `--surface` with a
`--border`. It reads as a card, which is honest — it is the page's summary — and it is
correct on both wallpapers.

**Notes, not blockers:**

1. **The row can get long.** With eight ready-made challenges and three of her own it is
   three rows at 390. That is still one glance, but if she adds ten challenges it will push
   the first card well down the page. Worth watching; the fix (a cap with a "+3 more") is a
   small task if she ever asks.
2. **`No challenges in 2026 yet.`** sits straight on the wallpaper in `--muted`, which is
   faint on lavender. That is how the old trophy row's empty line already was, so it is not a
   regression — but it is worth a small follow-up.

Nothing differs from the design in a way that must be fixed before this passes. To the tester.

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

The new and affected files were run three times over
(`ChallengesPage.break`, `ChallengesPage.swap`, `BingoSwap`, `ReadyChallenges`,
`OwnChallenges`, `ChallengeRings`, `Confetti`, `challenges.break`): `80 passed (80)` each
time, no retries.

## Sent back once, and fixed

**The confetti never fired.** It was scheduled with `window.setTimeout(… , 150)` inside the
effect that also records what has been celebrated, and the effect's cleanup cleared the
timer. On the real page the choice log and the reading goals arrive a tick after the first
render, so the effect re-ran and cancelled the burst — while the memory had already been
written, so the *next* visit was quiet as well. The burst now fires in the effect itself, and
`ChallengesPage.break.test.tsx` covers it (first visit quiet, second visit one burst, third
visit quiet). A line went into `docs/lessons.md`.

## What was tried to break it

| tried | result |
|---|---|
| **no challenges at all** (empty shelf, no goal, no picks, no log) | no ring row at all, the page's own `No challenges in 2026 yet.`, no confetti, no crash |
| a shelf of books with **nothing finished** | no crash, no rings |
| **a finished challenge** | gold ring with a `✓`, the `challenges-1` medal earned |
| **two finished at once** | **one** burst, not two; both ids recorded, both counted for the medal |
| the same visit again | no burst |
| **storage blocked** (`setItem` throws) | no confetti at all, rather than one every visit |
| nonsense in the memory (`{"not":"a list"}`) | treated as no memory: records, stays quiet, no crash |
| the **year switch** | the whole row changes (`Your challenges in 2025`), and an earlier year offers no **＋ New challenge** and no **＋ Add a series** |
| a ring's click | scrolls `#challenge-<id>` into view and focuses its `h2` |
| a ring with no block on the page | does nothing, throws nothing |
| a very long own-challenge name | clipped to one line, full name in the accessible name |
| one ring and twelve rings | both render; the row wraps, it does not scroll sideways |
| `prefers-reduced-motion: reduce` | the layer draws nothing; the ring is still gold with a `✓` |
| `confetti()` with no layer mounted | nothing, no throw |
| the badge grid | 78 medals (was 75), the three new ones in their family's tiers, grid navigation still lands on the last medal |
| `badges(books)` with **no** challenges option | the family is there, unearned, no crash |

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

**Passed.** The *Done when* checks all ran with the output above, the UX designer's review is
in *Design*, and D-0064 is recorded. Nothing is left for a human.

# Log

- 2026-11-23 architect: wrote CH1 as a full task; recorded D-0064 (one summary shape for every challenge, confetti remembered per device, one badge family). Hand to the UX designer.
- 2026-11-23 ux-designer: designed (the ring row and confetti, the four cards, the extra rule fields and the swap flow, each for 390 and 1280 on both wallpapers). Hand to the developer.
- 2026-11-23 developer: built the ring row (`challengeRings.ts`, `ChallengeRings.tsx`), the confetti (`challengeCelebrate.ts`, `Confetti.tsx`, one `<ConfettiLayer />` in the route) and the `challenges-1/5/10` family in `badges.ts`; the trophy lines are gone, the rings say the same thing (`trophies.ts` now only counts full bingo cards). Checks: `pnpm exec tsc --noEmit` clean; `pnpm test` 180 passed | 2 skipped (182 files), 2284 passed | 22 skipped; `pnpm run build` ✓ built in 869ms; `pnpm exec harness check` all ✓. Screenshots in `T-0090-screens/`.
- 2026-11-23 ux-designer: reviewed: passes (one change agreed during the build, notes recorded). Hand to the tester.
- 2026-11-23 tester: passed (sent the confetti back once; see the lesson). Every Done when check ran; the output is in Test.
