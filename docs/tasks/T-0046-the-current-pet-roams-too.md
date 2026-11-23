---
id: T-0046
title: "Let the current pet roam the den too: freely on the computer, a gentle short wander on the phone"
description: "Hanna's own pet sits still on its cushion because the den's roaming only runs for her other pets, on a computer, and she has one pet and a phone; the current pet now roams as well — freely on the computer, and on the phone a short slow wander now and then with long rests between — while tap-to-pet, Trick! and drag-to-feed keep working on a walking pet, reduce motion keeps it on its cushion, and the phone's draw-call budget from T-0031/T-0032 does not move."
status: Done
size: full
depends_on: [T-0032]
decisions: [D-0033, D-0040, D-0013, D-0020, D-0034]
raised_on: 2026-11-23
done_on: 2026-11-23
result: []
---

# Goal

Hanna, on her phone, 2026-11-23: **"Fox is still sitting still on his pillow."**

She has exactly one pet — her current pet. In `DenScene.tsx` the roaming group
`<WalkingPets>` only mounts when `!phone && !reduce && pets.length > 1`, and it **filters out**
the current pet, which always keeps its cushion spot inside `<Creature>`. So with one pet, on a
phone, nothing in the den ever moves. Even on a computer, a one-pet den is a still den.

**Hanna decided (2026-11-23)** that her current pet should roam too:

1. **On the computer:** the current pet roams freely like the others — it walks off the cushion,
   rests on the floor, comes back and sits on the cushion again.
2. **On the phone:** it roams too, but **gently and sparingly** — a short slow wander now and
   then, otherwise resting. Clearly lighter than the computer: slower, shorter, a smaller
   patch of floor, and much more time resting.
3. **Tap-to-pet and Trick! keep working on a roaming pet**, on both sizes; so does drag-to-feed.
4. **Reduce motion is honoured**: with reduce motion on there is **no roaming at all** — the pet
   stays on its cushion, exactly as it is today.
5. **The den's phone performance budget from T-0031/T-0032 still holds.** It must be measured.
   If a roaming current pet on a phone broke the budget, the wander gets rarer/shorter rather
   than the budget getting bigger, and the *Build notes* say so.

This narrows D-0033 §13 ("on phones the creatures mostly hold still, movement only on a tap or a
trick"), which is why it comes with a new decision record, **D-0040**.

# Done when

1. `pnpm test` passes and includes new tests for the current pet's own state machine
   (`pickCurrentRoam`): reduce motion returns `cushion` only; the phone roams, but rarely and
   briefly, and clearly less than the computer; the computer roams like the other pets; the
   sleepy current pet at night still sleeps; missing-you never roams; the phone's walk target
   stays inside a small patch around the cushion.
2. A test proves the den's **draw calls and triangles do not change** because of this task: the
   roaming current pet is the same object, moved, so `denBudget.test.ts`'s fullest-den budget
   (phone `low`: ≤ 60 draw calls, ≤ 20,000 triangles) still passes unchanged.
3. On `pnpm run dev`: on 1280 × 800 the current pet is seen **away from its cushion**; on
   390 × 844 the current pet is seen **away from its cushion** as well, after a wait.
   Screenshots in `docs/tasks/T-0046-screens/`.
4. The measured phone numbers (WebGL draw calls over a fixed window, and the scene's triangles)
   are written into *Build notes* and compared with T-0032's.
5. `pnpm exec tsc --noEmit`, `pnpm run build` and `pnpm exec harness check` pass.
6. **Hanna** confirms on the live site that Fox now walks about.

# Notes

- The code: `src/components/creatures/DenScene.tsx` (the `<Creature>` on the cushion),
  `src/lib/creatures/denRoam.ts` (the state machine from T-0032 §4),
  `src/components/creatures/WalkingPets.tsx` (the other pets; unchanged in behaviour),
  `src/components/creatures/DragFeed.tsx` (raycasts the live scene, so a moving pet is fine).
- The T-0032 Design §2, §3a, §4 and §6 are the ground this builds on; §4a's state table is
  reused for the current pet with the current-pet weights that are already in `pickRoam`.
- Task numbers: `T-0045` is taken by another branch in flight (`fix-past-day`), so this task
  takes **T-0046**, which is free in `docs/tasks/`, in `docs/tasks/index.md` and on every
  remote branch.
- D-0040 is new and records Hanna's decision; it narrows D-0033 §13 and leaves the rest of
  D-0033 Accepted.

# Design

UX designer, 2026-11-23. This design changes **nothing about how a creature looks** — no new
model, no new part, no new prop, no new light, no new draw call. It only moves a creature that
is already drawn. Everything below builds on the T-0032 Design (§2, §3, §4, §6) and keeps its
numbers unless a line here says otherwise.

## 1. What Hanna sees

- **Computer (1280):** the den looks as it does today, but her current pet no longer stays
  glued to the cushion. It gets up, walks a little way across the rug, sits down, looks around,
  wanders somewhere else, and after a while goes back and sits on the cushion again. With
  several pets, the others keep roaming exactly as they do now, so the room reads as one room.
- **Phone (390):** the pet is on its cushion most of the time. Now and then — about once every
  half a minute — it gets up, takes a slow short stroll within arm's reach of the cushion
  (never out of frame, never behind the bowl), stops, and comes back. Between strolls it sits
  and breathes and blinks as it does today. The phone must read as *calm*, not busy.
- **Reduce motion (both sizes):** nothing changes from today. The pet sits on its cushion. No
  walking, ever.
- **Night:** a sleepy current pet from 22:30 still goes to sleep, and it sleeps **on its
  cushion** (it walks back first, if it is away). Sleeping is not interrupted by a wander.
- **Missing-you:** a pet that missed her does not wander off (T-0032 §7 already says
  missing-you pauses roaming); it rests or sits on the cushion.

## 2. The state machine for the current pet

A new `pickCurrentRoam(input, counter)` next to `pickRoam` in `src/lib/creatures/denRoam.ts`,
using the same `RoamState` values, the same seeded clock and the same determinism rules
(T-0032 §4a). Its order of rules:

| Rule | Result |
|---|---|
| `reduce` | `cushion`, 60 s — never anything else. |
| `mood === 'missing'` | 70 % `rest` (4–8 s), else `cushion` (7–12 s). Never `roam`. |
| sleepy and 22:00–06:00 | `sleep`, 20 s (on the cushion). |
| `phone` | **20 % `roam`** (2.5–4 s), **35 % `rest`** (7–12 s, where it strolled to), else `cushion` (7–12 s). |
| computer | `pickRoam` with `current: true` — the existing table: cushion 30 %, roam 35 %, sleep 5 %, rest the remainder (toys and pair-play stay with the other pets). |

The phone's wander (a fifth of the picks, each 2.5–4 s long, with 7–12 s sits between) against
the computer's (35 % of picks, 2–5 s long, shorter sits) is the "clearly lighter" Hanna asked
for. Measured over the tables, the pet is on its feet **8.2 % of the time on a phone** and
**19.5 % on a computer** — a wander about every 45 seconds on the phone, and a test keeps the
phone under half the computer's walking time whatever a later tweak does.

After a stroll the pet usually **sits down where it got to** (the `rest` row) rather than
trotting straight home, so the wander is something Hanna can actually see: the pet is over
there now, and it comes back on a later pick.

## 3. Where it may walk, and how fast

The walkable rectangle of T-0032 §3 (x ∈ [−1.0, 1.0], z ∈ [−0.25, 0.9], minus the bowl's
footprint) stays as it is **for the other pets**. The current pet is drawn much larger than
they are (it fills 54 % of the canvas height, they are 0.3 units tall), so it gets its own,
smaller patch so it never walks out of frame or behind the camera:

| | x | z | speed |
|---|---|---|---|
| other pets (T-0032, unchanged) | ±1.0 | −0.25 … 0.9 | 0.18 u/s (hoppers 0.14) |
| current pet, computer | ±0.6 | −0.2 … 0.5 | 0.18 u/s (hoppers 0.14) |
| current pet, phone | ±0.3 | −0.1 … 0.3 | **0.08 u/s** |

The phone's speed is **less than half** the computer's: a slow amble, not a trot. The bowl's
footprint is avoided by the same nudge the other pets use. The phone's target is also kept
**at least 0.2 u from the cushion** (a point to one side, `gentleTarget`), so that a 2.5–4 s
amble at 0.08 u/s is a stroll Hanna can see rather than a shuffle on the spot.

## 4. Getting off and back on the cushion

- The cushion sits at (0, seat, 0); the floor is at y = 0.01. When the pet leaves the cushion
  its height **eases down** to the floor over about 0.25 s, and eases back up when it has
  arrived home — no jump, no hop needed.
- `cushion` and `sleep` both walk the pet back to (0, 0) first.
- A pet standing within 0.08 u of the cushion's spot is **on the cushion**, whatever it is
  doing there, and steps down to the floor only once it walks away. (Without that rule a pet
  that rested at the cushion's spot would sink into it.)
- While walking the pet turns to face the way it is going (lerp 8 rad/s), swings its arms
  ±0.3 rad at 2 Hz and bobs ±1.5 % in y, exactly as `WalkingPets` does. Hoppers (the penguins,
  the hedgehog, the axolotl) hop instead, with T-0032's parabola.
- When it is not walking, the pet turns smoothly back to facing the camera (rotation 0), so
  the ¾ view Hanna knows is what she sees at rest.
- **Reduce motion** skips all of this: the pet never leaves (0, seat, 0).

## 5. Tapping, tricks and feeding a walking pet

- **A reaction freezes the walk.** Any reaction — a tap to pet, a feed, a level-up, a trick —
  stops the pet where it is for as long as the reaction plays, and the state clock pauses with
  it. So a tap lands on a pet that then stands still and reacts, and a trick plays in place
  instead of drifting across the floor. When the reaction ends, the walk resumes.
- **Tap-to-pet** keeps working because the tap target is the pet's own group, which moves with
  it; nothing about the hit test changes.
- **Trick!** keeps working: the spin adds its turn **on top of** the pet's facing instead of
  overwriting it, so a pet that walked left and is now facing left still spins all the way
  round and ends facing where it was.
- **Drag-to-feed** keeps working: `DragFeed` raycasts the live scene for `userData.isPet`,
  which travels with the pet.
- The **Feed**, **Trick!** and **Share** buttons on the card are untouched, so the keyboard and
  screen-reader paths (T-0032 §10, Done when 4) are untouched.

## 6. What does not change

- No new object in the scene: the budget cannot move (Done when 2). The phone's soft shadow
  disc under the cushion stays where it is; the phone's patch (±0.3) is well inside it.
- The other pets, the shelf pet (T-0033), the bowl, the toys, the habitat, the camera, the
  lights, the frame loop (`always` on a computer, `demand` at ~20 fps on a phone, `never` when
  the page is hidden or something is over it) are all exactly as they were.
- The hatch, the crack, the reveal and the Shop's preview den keep a **still** creature: the
  roaming only runs on the Creatures tab's own den, with a current pet, in the `home` step.

## 7. Screenshots

`docs/tasks/T-0046-screens/`:

1. `1280-den-current-pet-roaming.jpg` — the computer den, the current pet clearly **off** its
   cushion.
2. `390-den-current-pet-roaming.jpg` — the phone den, the current pet clearly **off** its
   cushion.
3. `390-den-current-pet-cushion.jpg` — the phone den at rest, the pet back on its cushion (what
   she sees most of the time).

The shots are taken by watching the den's canvas for a minute or two and keeping the frame
where the creature's orange pixels sit furthest from where they sit at rest — the wander is
rare on purpose, so a single timed screenshot would usually catch a pet sitting still.

## Review after building (2026-11-23)

Reviewed the build on `current-pet-roams` against §1–§7 above and against the three
screenshots in `docs/tasks/T-0046-screens/`.

**Verdict: pass. Over to the tester.**

What matches

- `1280-den-current-pet-roaming.jpg`: the fox is clearly **off** the gold cushion, sitting on
  the rug to the left of it. The cushion is empty and visible beside him — exactly the "he got
  up and walked away" reading §1 asks for. This is the shot that answers Hanna's "Fox is still
  sitting still on his pillow".
- `390-den-current-pet-roaming.jpg`: on the phone the fox is **off** the cushion too, a short
  way to the left, still fully in frame and still over the soft shadow disc (§6). The move is
  smaller than the computer's — which is the point: it reads as a gentle stroll, not a dash.
- `390-den-current-pet-cushion.jpg`: back on the cushion, in the pose T-0029 gives it, with the
  bowl beside it. The phone den at rest is indistinguishable from today's, which is what §1
  promises for the ~92 % of the time the pet is resting.
- The traces behind the shots read exactly as §1 describes. On the phone, over 110 samples a
  second apart, the fox's position held steady, slid left over three seconds, **sat there for
  about twelve seconds**, came back to the cushion, held, and later strolled to the other side.
  On the computer the same trace is more frequent and goes further.
- The walk patches in the code match §3 exactly (`CURRENT_RANGE` ±0.6 / −0.2…0.5,
  `GENTLE_RANGE` ±0.3 / −0.1…0.3, `GENTLE_WALK` 0.08 against `WALK` 0.18), and the phone's
  target is held at least 0.2 u from the cushion so the stroll reads.
- A reaction freezing the walk (§5) is in `DenScene.tsx`: the clock is pushed forward by the
  frozen time, so a long petting session does not make the pet skip three states at once.
- The spin adds to the facing instead of replacing it (§5), so Trick! after a walk reads right.
- Reduce motion: `pickCurrentRoam` returns `cushion` as its first rule, and the den's frame
  loop with reduce motion asks for no frames anyway, so the pet cannot move. Two belts, one
  pair of braces — fine.

What differs (not must-fix)

- The phone shots had to be found by watching the den for about two minutes (the wander is rare
  on purpose), so the "roaming" phone shot is a moment Hanna will have to wait up to a minute
  for. That is the design, not a defect — but it is the thing to ask her about: if she wants to
  see him move more often, the one number to change is `GENTLE_SHARE`.
- The current pet does not play with toys or pair-play (those stay with `WalkingPets`). §2 says
  so on purpose: a toy walk across the room with a creature this size reads badly in the den's
  tight framing. Noted for the architect as a possible follow-up, not a gap here.
- The first build let a pet that *rested* on the cushion's spot sink to floor height. Caught in
  review from the phone traces and fixed before the commit (§4's 0.08 u rule).

Must-fix: none.

# Test

## Tester, 2026-11-23

Commands, as run

- `pnpm exec tsc --noEmit`: clean, no output. (It was **not** clean on `main`: an unused
  `within` import in `src/components/Dashboard.hiddenChips.test.tsx` from T-0044. CI does not
  run `tsc`, so it had gone unnoticed. Removed here so the typecheck is a usable check again;
  noted in the Log.)
- `pnpm test`: **1603 passed, 0 failed, 22 skipped** (123 files passed, 2 skipped). Includes
  the 8 new `pickCurrentRoam` / `gentleTarget` / range cases in
  `src/lib/creatures/denRoam.test.ts` and the new budget case in
  `src/components/creatures/denBudget.test.ts`.
- `pnpm exec vitest run src/lib/creatures/denRoam.test.ts
  src/components/creatures/denBudget.test.ts src/components/creatures/scenes.test.tsx`,
  repeated: **42 passed** each time, no flakiness. The state machine is pure and seeded, so
  there is nothing to flake.
- `pnpm run build`: ok (client + Netlify SSR entry built, `✓ built in 844ms`).
- `pnpm exec harness check`: `✓ tasks: 45 tasks, index in step` · `✓ decisions: 43 records,
  index complete, 3 overrules valid` · `✓ engineers: 2 listed` · `✓ generated files: current`.
- `pnpm exec harness tasks-index`: `wrote docs/tasks/index.md (45 tasks)`, committed.

What I tried to break

- **One pet** (Hanna's case): a den with exactly one pet. `<WalkingPets>` still does not mount
  (`pets.length > 1`), and the current pet roams on its own. This is the bug Hanna reported and
  it is fixed in the one-pet case, not only the many-pet case.
- **Several pets**: with 2+ pets the current pet roams **and** `<WalkingPets>` draws the
  others. They pass through each other without collision, as T-0032 §3 always allowed. No pet
  is drawn twice: `WalkingPets` still filters out `currentPetId`.
- **Reduce motion**: `pickCurrentRoam({reduce: true}, c)` returns `cushion` for every counter
  across both sizes, five moods and five hours of the day (a nested loop in the new test).
  There is no input that makes a reduce-motion pet roam, and the den's frame loop with reduce
  motion asks for no frames anyway, so nothing could move it even if there were.
- **Tap while walking**: the tap handler is on the pet's own `<group>`, which carries the
  position, so the hit test travels with it; the reaction then freezes the walk, and the state
  clock is read as `elapsed − frozen`, so states do not expire behind a long petting session.
- **Trick! while walking**: the spin adds to `facing` instead of overwriting it; after the
  trick the pet's rotation returns to its facing, not to 0. Checked that `trick` reactions of
  every kind (wave, spin, somersault, bow, toy:*) still complete and clear `react.current`.
- **Drag-to-feed a walking pet**: `DragFeed` raycasts the live scene each pointer-up and walks
  up the parents for `userData.isPet`; the current pet's group carries `isPet` and `petId`
  whether it is on the cushion or on the rug. Both the drag and the Feed button land on the
  same `feed(petId)`.
- **Sleeping at night**: a sleepy current pet between 22:00 and 06:00 picks `sleep` and walks
  back to the cushion before lying down; `sleep` is never interrupted by a `roam` pick while it
  lasts. Checked at hour 22, 23, 0 and 5; and that at hour 12 a sleepy pet does **not** sleep.
- **Missing-you**: never `roam`, only `rest` or `cushion`, over 200 counters, on both sizes.
- **The shelf pet is unaffected**: `ShelfPet.tsx` and `useShelfPet.ts` are not in the diff; the
  shelf's creature keeps the T-0033 idle (sit / yawn / stretch / sleep) and still never walks.
  `shelfLayout.test.ts` and the T-0033 tests are untouched and green.
- **The hatch, the crack and the Shop preview**: roaming is gated on the `home` step with a
  current pet, so the welcome egg, the cracking egg, a reveal and the Shop's dressing preview
  all keep a still creature. Verified in `CreaturesPage.tsx`'s `roamCurrent` expression.
- **The phone's budget**: measured on the running app, resting against wandering, in the same
  page — see *Build notes*. **17.0 draw calls and 1,770 triangles per frame either way**, at
  20–21.6 fps. `denBudget.test.ts` is unchanged and still green, and the new case asserts the
  structural reason: the roaming pet is the same object, moved.
- **Frame loop**: `scenes.test.tsx` still passes — `always` on a computer, `demand` on a phone
  and with reduce motion, `never` when hidden or paused. Roaming adds no frames of its own on
  the phone: the walk deliberately does **not** call `invalidate()` per frame, so it moves on
  the ~20 fps the `Idle` ticker already asks for.

Gap tests added by the tester

- `pickCurrentRoam` never returns `toy` or `pair` (those belong to `WalkingPets`, which holds
  the toy lock; a current pet claiming a toy would have broken the one-pet-per-toy rule).
- `pickCurrentRoam` on a phone, over 400 counters, keeps roaming at or under
  `GENTLE_SHARE + 0.05` of the picks, every roam at or under 4 s and every sit at 6 s or more,
  and keeps the phone's **time on its feet under half the computer's** (measured 8.2 % against
  19.5 %), so "gentle and sparing" cannot drift with a later tweak.
- `gentleTarget` (the phone patch) stays within ±0.3 in x and −0.1 … 0.3 in z over 200
  counters, so the phone pet can never walk out of frame or off the shadow disc.
- `roamTarget` honours whatever rectangle it is given (`CURRENT_RANGE`), so the current pet
  cannot inherit the other pets' full-floor patch by accident.

Verdict: **passed.**

Remaining: Hanna confirms on the live site that Fox walks about on her phone.

# Build notes

## Phone performance (Done when 4)

Measured with headless Chrome (SwiftShader) on the no-backend dev server (port 3170) at
390 × 844, on the Creatures tab, with one pet (a fox called Fox, as Hanna has), the cosy
habitat, the ball toy placed and cookies in the bowl. `drawElements` and `drawArrays` are
wrapped on the den's own WebGL context and counted over twelve 3-second windows, with the
triangles taken from each call's `count`. Before and after **each** window the creature's
position is read off the canvas, so every window is labelled by what the pet was doing in it —
a real before/after inside one page, rather than a guess.

| phone den, 390 × 844 | pet resting on its cushion | pet wandering | budget (T-0031 §10) |
|---|---|---|---|
| draw calls per frame | **17.0** | **17.0** | ≤ 60 |
| triangles per frame | **1,770** | **1,770** | ≤ 20,000 |
| frames per second | 20.0 – 21.7 | 21.3 | ~20 (T-0029) |

Ten windows caught the pet resting and two caught it wandering; every one of the twelve gave
17.0 draw calls and 1,770 triangles per frame.

**The budget does not move, and nothing had to be reduced to keep it.** This is by
construction: the roaming current pet is the creature the den already draws, with its group's
`position` and `rotation` changed each frame. No mesh, sprite, light, material or shadow caster
is added. The phone keeps `frameloop="demand"`, and the walk deliberately does **not** call
`invalidate()` per frame: it moves on the ~20 frames a second the existing `Idle` ticker
already asks for, so the frame rate does not rise either. The only extra work per frame is a
handful of scalar lerps and one distance.

The phone's wander was still kept deliberately small — a fifth of the picks, 2.5–4 s each,
0.08 u/s, within ±0.3 u of the cushion, which is 8.2 % of its time on its feet against the
computer's 19.5 % — because Hanna asked for "gently and sparingly", **not** because the budget
forced it. If she wants to see Fox move more often, `GENTLE_SHARE` is the one number to raise,
and D-0040 §3 caps it at a quarter of the picks.

## What was built

- **`src/lib/creatures/denRoam.ts`**: new `pickCurrentRoam` (the current pet's own table, §2),
  `gentleTarget`, the three walk patches (`ROAM_RANGE`, `CURRENT_RANGE`, `GENTLE_RANGE`),
  `GENTLE_WALK = 0.08`, `GENTLE_SHARE` and `GENTLE_MAX_SECS`. `pickRoam`, `WALK`, `HOP` and
  `isHopper` keep their behaviour; `roamTarget` takes an optional rectangle and defaults to the
  old one, so `WalkingPets` is untouched.
- **`src/components/creatures/DenScene.tsx`**: `<Creature>` takes `roam` and `session`, and
  runs the walk in its existing `useFrame`: the state clock (frozen while a reaction plays),
  the walk toward the target, the turn, the arm swing and body bob, the hop parabola, and the
  ease between the floor and the cushion seat. The trick animations now add their turn to the
  pet's facing instead of writing the root's rotation directly. A new `roamCurrent` prop gates
  the whole thing, and the den's session seed is taken once per mount.
- **`src/components/CreaturesPage.tsx`**: passes `roamCurrent` (the `home` step, a current pet,
  no reveal and no Shop preview).
- Tests: 8 new cases in `denRoam.test.ts`, 1 in `denBudget.test.ts`.
- Also in this commit, outside the task: an unused import in
  `src/components/Dashboard.hiddenChips.test.tsx` that made `tsc --noEmit` fail on `main`
  (CI does not run `tsc`). One line, removed so the typecheck is usable again.

# Log

- 2026-11-23 architect: wrote T-0046 from Hanna's report ("Fox is still sitting still on his
  pillow") and her decision that the current pet should roam too, freely on the computer and
  gently on the phone. Recorded **D-0040**, which narrows D-0033 §13 (phones: movement only on
  a tap or a trick) for the den's current pet and leaves the rest of D-0033 Accepted. Took
  T-0046 because T-0045 is in flight on another branch. Size: full. Over to the UX designer.
- 2026-11-23 ux-designer: designed the current pet's roam (§1–§7): the state table per size,
  the three walk patches and the two speeds, getting off and back on the cushion, and the rule
  that a reaction freezes the walk so tap, Trick! and drag-to-feed keep working. Nothing new is
  drawn, so the budget cannot move. Over to the developer.
- 2026-11-23 developer: built it in one commit. `pickCurrentRoam` + the walk patches in
  `denRoam.ts`; the walk itself inside `<Creature>` in `DenScene.tsx`; `roamCurrent` wired from
  `CreaturesPage.tsx`. tsc clean, 1603 tests pass, build ok, harness check green. Phone
  measured at 390 × 844, resting against wandering in the same page: **17.0 draw calls and
  1,770 triangles per frame either way** (budget 60 / 20,000), 20–21.7 fps, so nothing had to
  be reduced. Screenshots in `docs/tasks/T-0046-screens/`. Also removed one unused import that
  made `tsc` fail on `main` (T-0044; CI doesn't run `tsc`) — for the architect: worth adding
  the typecheck to the CI checks so it can't drift again.
- 2026-11-23 ux-designer: reviewed against §1–§7. The 1280 and 390 shots both show the current
  pet clearly off its cushion, and the third shot shows it back on. Pass; over to the tester.
- 2026-11-23 tester: passed. 1603 tests pass with the gap tests added (no `toy`/`pair` for the
  current pet, the phone's walking time held under half the computer's, the phone patch
  bounded, `roamTarget` honouring its rectangle); tried one pet, several pets, reduce motion,
  tap and Trick! while walking, drag-to-feed a walking pet, sleeping at night and the shelf
  pet. The phone's budget is unchanged, measured resting against wandering.
  Remaining: Hanna confirms on the live site that Fox walks about on her phone.
