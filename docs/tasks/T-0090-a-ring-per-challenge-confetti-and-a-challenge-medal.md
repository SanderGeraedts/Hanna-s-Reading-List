---
id: T-0090
title: "Open the Challenges page with a ring per challenge, celebrate a finished one once, and give it a medal"
description: "A row of small progress rings at the top of the Challenges page, one per challenge for the chosen year, each a button that scrolls to that challenge; the first visit after a challenge is complete draws one short confetti burst (no pop-up, D-0013) and completed challenges count towards a new challenges-1/5/10 badge family."
status: Open
size: full
depends_on: []
decisions: [D-0013, D-0014, D-0017, D-0020, D-0038, D-0060]
raised_on: 2026-11-23
done_on: ""
result: []
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

**D-0060** settles how: one summary shape (`challengeRings.ts`) that every challenge reports,
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

# Test

To be written by the tester.

# Log

- 2026-11-23 architect: wrote CH1 as a full task; recorded D-0060 (one summary shape for every challenge, confetti remembered per device, one badge family). Hand to the UX designer.
- 2026-11-23 ux-designer: designed (the ring row and confetti, the four cards, the extra rule fields and the swap flow, each for 390 and 1280 on both wallpapers). Hand to the developer.
