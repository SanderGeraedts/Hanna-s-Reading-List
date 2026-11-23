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

To be written by the UX designer.

# Test

To be written by the tester.

# Log

- 2026-11-23 architect: wrote CH1 as a full task; recorded D-0060 (one summary shape for every challenge, confetti remembered per device, one badge family). Hand to the UX designer.
