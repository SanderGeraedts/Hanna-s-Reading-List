---
id: D-0060
title: "The Challenges page opens with one progress ring per challenge, and finishing a challenge gives a short confetti burst once per device and counts towards one badge family"
description: "Every challenge on the page — the four ready-made ones, the four new ones and her own — reports the same little summary (done, goal, complete) to a ring row at the top; tapping a ring scrolls to that challenge. The first visit after a challenge is complete fires one confetti burst, never two in a visit, remembered per device exactly like the badge toasts; the medal is one family (challenges-1/5/10) counting completed challenges, not one medal per challenge."
status: Accepted
date: 2026-11-23
decided_by: architect
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [challenges, badges, interaction]
---

# Context

Hanna agreed CH1 on 22 November 2026: a row of small progress rings at the top of the
Challenges page, one per challenge, tap a ring to jump to that challenge; finishing a
challenge gives a short confetti burst (once, on the first visit after finishing — not a
pop-up, D-0013) and a medal in her badge collection.

Three things had to be settled before anything is built.

**What a "challenge" is on that page.** The page already renders a mixed grid: four
ready-made challenges (`goal`, `monthly`, `bingo`, `alphabet`), her own challenges
(`own:<id>`), and after T-0091 four more ready-made ones. They had nothing in common but
their place in the grid: each card worked out its own progress its own way, and the trophy
row (`src/lib/trophies.ts`) re-derived a subset of them again in a third shape.

**Where "finished once" is remembered.** The app has a precedent: `BadgeToasts`
(`src/components/NewBlocks.tsx`) keeps `hannas-reading-list:badges-shown:<account>` in the
device's own storage, and the very first time it shows nothing, so badges she already had
don't all pop up at once. Nothing is saved on the server for it. The same shape fits a
celebration exactly, and it needs no server change and no new saved data.

**How many medals.** One medal per challenge would put a dozen permanently locked medals in
the grid and the grid would change every time she invents a challenge — the same objection
D-0042 §7 recorded for tropes.

# Decision

1. **One summary shape for every challenge.** A new module `src/lib/challengeRings.ts` owns
   `ChallengeRing { id, name, short, done, goal, complete, icon }` and
   `challengeRings(...)`, which asks each challenge for that summary and returns them in the
   order the page shows them. The ring row, the trophy row and the badge family all read
   this one list; no card works out "am I finished" a second time.
2. **The ring row is an overview, not a control.** Each ring is a button that scrolls to
   `#challenge-<id>`, the anchor the page's `ArrangeGrid` already renders. It changes
   nothing and opens nothing.
3. **A challenge is complete when `done >= goal` and `goal >= 1`.** A challenge with no goal
   (no reading goal set for the year, a monthly challenge with no books picked) has no ring.
   Completeness is per **year**: the page's year switch changes the whole row.
4. **Confetti fires at most once per visit**, however many challenges became complete, on the
   first visit after they did:
   - the ids already celebrated are kept per device and account in
     `hannas-reading-list:challenges-done:<account>`, like the badge toasts;
   - the **first** time a device sees the key missing it records every complete challenge and
     fires nothing, so a year of finished challenges does not explode on her screen;
   - storage blocked (private window) means **no** confetti, rather than confetti every visit;
   - `prefers-reduced-motion: reduce` means no confetti either; the ring is gold regardless.
5. **Confetti is not a pop-up** (D-0013). It is a drawn burst over the page that asks nothing,
   takes no focus, is `aria-hidden`, and disappears by itself — the same standing as the
   sparkles (`src/components/Sparkles.tsx`) and the "Badge unlocked" toast.
6. **One badge family, `challenges-1` / `challenges-5` / `challenges-10`**, earned when 1, 5
   or 10 challenges have been completed, counted over every year. Her own challenges are not
   in `books`, so `badges()` takes them in its existing `BadgeOptions`
   (`challenges`, `swaps`); with none passed only the ready-made ones count, so no caller
   breaks and no medal is ever wrongly shown as earned.
7. **A completed challenge has no day** unless the challenge itself knows one, so the badge
   usually has no date. That is already allowed (`Badge.on` is optional) and keeps it out of
   *Waiting for you*, which would be a question (D-0013).

# Rationale

Asking every challenge for the same three numbers is the only way a ring row, a trophy row
and a medal can agree with the cards; doing it in one module means a new challenge is one
entry, not four. Remembering what has been celebrated on the device costs nothing, can't be
lost in a way that matters (the worst case is a burst that doesn't come), and needs nothing
from Sander.

# Consequences

- A new challenge must add its entry to `challengeRings.ts`, or it has no ring, no trophy and
  no medal.
- `yearTrophies` becomes a view of `challengeRings`, so the trophy row and the rings can never
  disagree.
- Clearing the browser's storage means the next complete challenge is celebrated again. That
  is accepted.

# Guidance for agents

- Never derive "this challenge is finished" anywhere but `challengeRings.ts`.
- Never let the confetti take focus, block the page or ask anything (D-0013).
- Don't add a medal per challenge; extend the `challenges-N` family's steps instead.
- The first run on a device must record and stay silent. Write the test for that case.
