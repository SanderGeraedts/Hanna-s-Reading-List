---
id: T-0050
title: "Stop a roaming pet sinking into the den's furniture: it walks around the bowl and the toys and climbs onto its bed instead of through it"
description: "Hanna's fox walks through the pillow and his feet vanish, because the den's roaming has no collisions at all: a pet crosses the bed, the bowl and any placed toy at floor height. Every placed prop now has a footprint the roaming pets keep out of, and the bed alone is walked on rather than through — its height carries the pet up onto the cushion and down again — so the pet's feet are always visible, the cushion state still seats it at the right height for every bed, and the phone's draw-call budget does not move."
status: Doing
size: small
depends_on: [T-0031, T-0032, T-0046]
decisions: [D-0033, D-0040, D-0043]
raised_on: 2026-11-23
done_on: ""
result: ["https://github.com/SanderGeraedts/Hanna-s-Reading-List/pull/262"]
---

# Goal

Hanna, on her phone, 2026-11-23: **"When the fox is walking through the pillow his feet vanish."**

The den's roaming was built without any collisions at all. `WalkingPets.tsx` says so in its own
comment ("No path finding, no collisions"), and the only thing `roamTarget` in
`src/lib/creatures/denRoam.ts` tries to avoid is a food bowl at `(0.55, 0.15)` with radius 0.12 —
a spot the bowl has not stood on since T-0031 moved it to `(0.66, 0, −0.36)` and grew it to
radius 0.16. So in practice **nothing** in the den is avoided.

A roaming pet walks at floor height, `y = 0.01`. The den's bed sits at the middle of the floor,
`(0, 0, 0)`, and is **large**: the gold cushion is a dome of radius 0.55 and 0.18 high, the cloud
cushion 0.54, the basket bed 0.62. T-0046's walk patches are *inside* that dome — the phone's
`GENTLE_RANGE` reaches 0.42 from the middle and the computer's `CURRENT_RANGE` 0.78 — so on the
phone the pet Hanna watches walks **onto the cushion's spot at floor height every single time it
strolls**, and the cushion swallows its legs up to 0.15 of its 1.0-unit height. That is exactly
what she saw.

What this task delivers:

1. **Every placed prop has a footprint**, worked out from the model the den actually draws, and a
   roaming pet never stands or walks inside one: the bowl, the toy she placed, and the corner and
   rug items. It walks *around* them.
2. **The bed is the one prop a pet is allowed on** — it is its bed. Instead of crossing it at
   floor height, the pet's height follows the bed's own top: it walks up onto the cushion and down
   off it again, so its feet are on a surface at every moment of the walk and are always visible.
3. **The cushion state is unchanged:** a pet that picks `cushion` or `sleep` walks home and sits at
   `seatYOf(bed)` exactly, for the gold cushion, the cloud cushion and the basket bed.
4. **A roam target is pushed off the bed when there is floor to push it to**, so on the computer
   the pet really does go and sit on the rug beside its bed rather than on it.
5. The phone's performance budget (T-0031 §10: ≤ 60 draw calls, ≤ 20,000 triangles on `low`) does
   not move, and is measured.

The shelf pet (T-0033) is not touched.

# Done when

1. `pnpm test` passes, with new tests for the pure helpers in `src/lib/creatures/denProps.ts`:
   - `denFootprints` gives a footprint for every prop she can place, at the spot the den draws it;
   - a test that compares every footprint radius with the **real model's bounding box**
     (`buildDenItem`, `buildBowl`), so a changed or a new shop item cannot drift out of the table;
   - `clearTarget` never returns a point inside a footprint, over the whole seeded target stream,
     for an empty den and a full den, on both walk patches;
   - `stepAround` never lets a walk enter a footprint, walking from every corner of the patch to
     every other corner, on an empty and a full den;
   - `pushOut` frees a pet that is already inside a footprint (a prop placed under a walking pet)
     within a second, moving no faster than it walks;
   - `bedTopAt` is `seatYOf(bed)` at the middle, the floor at and beyond the bed's rim, never
     below the floor and never above the seat, and continuous — for all three beds.
2. A test proves the roaming pet's **feet are never inside a prop**: for a den with each bed in
   turn and every prop placed, 2,000 simulated walk steps on both patches keep the pet's standing
   point outside every hard footprint, and its height at or above the bed's top under it.
3. `denBudget.test.ts` still passes unchanged: ≤ 60 draw calls and ≤ 20,000 triangles on `low`.
4. On the no-backend dev server: at 390 × 844 and at 1280 × 800 the pet is seen walking **beside**
   the cushion with its feet visible, and on the cushion at the right height. Screenshots in
   `docs/tasks/T-0050-screens/`, before and after.
5. The measured phone numbers (draw calls over a fixed window, the scene's triangles) are in
   *Build notes* and compared with T-0046's (17.0 and 1,770).
6. `pnpm exec tsc --noEmit`, `pnpm run build` and `pnpm exec harness check` pass.
7. **Hanna** confirms on the live site that the fox's feet no longer disappear into the pillow.

# Notes

- The code: `src/lib/creatures/denRoam.ts` (the state machine and the walk patches),
  `src/components/creatures/DenScene.tsx` (the current pet's walk inside `<Creature>`),
  `src/components/creatures/WalkingPets.tsx` (her other pets), and
  `src/components/creatures/shopModels.ts` for `DEN_SPOTS`, `BOWL_SPOT` and `seatYOf`.
- The designs this builds on: **T-0032 §3** (the walkable rectangle and "no collisions"),
  **T-0046 §3 and §4** (the current pet's two patches, and getting off and back on the cushion) and
  **T-0031 §8** (the six spots). D-0040 §3's phone numbers (at most a quarter of the picks a
  wander, at most 4 s each, under half the computer's speed, a small patch) are kept **as they are**.
- **New decision D-0043**: the bed is walked on, every other prop is walked around. It is what
  makes the phone work without touching D-0040's numbers — see the record for why the obvious
  alternative (keeping the pet off the bed as well) cannot work on a phone.
- The phone patch is widened a little (`GENTLE_RANGE`) and the computer patch rather more
  (`CURRENT_RANGE`), because the old ones were almost entirely inside the bed. How far they may
  widen is set by what stays in frame; a test checks that against the den's own camera.
- Task number: T-0044, T-0045 and T-0046 are taken, and the `book-panel-tropes` branch in flight
  is taking the next ones. This task takes **T-0050**, which is free in `docs/tasks/`, in
  `docs/tasks/index.md` and on every remote branch.

# Design

UX designer, 2026-11-23. Nothing new is drawn: no mesh, no sprite, no light, no material. This
design only changes **where** a creature that is already drawn may stand, and **how high** it
stands there. Everything in the T-0046 design that is not named below is unchanged.

## 1. What Hanna sees

- **The fox never sinks.** Wherever he is in the den, his feet are on something: the rug, or the
  top of his own cushion. The moment that made her write in — walking across the pillow with his
  legs gone — cannot happen any more.
- **He climbs onto his bed.** Coming home, he walks up the cushion's slope and settles in the
  middle at the height he has always sat at. Leaving, he walks down it and steps onto the rug. It
  reads as a small animal getting on and off a pillow, not as a model popping between two heights.
- **He walks around his bowl and his toys.** Where he used to cross the bowl, he now curves round
  it and carries on. The curve is a smooth arc — he hugs the thing he is avoiding for a moment and
  then goes back to a straight line, the way an animal walks round a chair. He never stops dead,
  never backs up, and never orbits a prop he is not trying to reach.
- **Computer (1280):** he has clearly more floor than before, because his old patch was inside the
  cushion. He gets up, walks out onto the rug beside the bed, sits there, and comes back.
- **Phone (390):** as calm as it is today — the same rare, slow, short stroll of T-0046 and D-0040
  §3 — but the stroll now takes him down off his cushion onto its rim and the rug beside it,
  instead of into it.
- **Reduce motion:** nothing changes. The pet sits on its bed at its seat height and never moves.

## 2. Footprints

A footprint is a circle on the floor: `{ x, z, r }`. One per prop the den draws, at the spot
T-0031 §8 puts it:

| prop | middle | radius |
|---|---|---|
| bed (gold cushion, the den's own) | (0, 0) | 0.55 |
| bed · cloud cushion | (0, 0) | 0.55 |
| bed · basket bed | (0, 0) | 0.62 |
| bowl | (0.66, −0.36) | 0.17 |
| toy · ball / yarn / slide | (−0.62, 0.4) | 0.14 / 0.27 / 0.25 |
| left · potted plant / mini bookcase | (−1.5, −0.75) | 0.21 / 0.24 |
| right · book tower / reading lamp | (0.25, −1.35) | 0.18 / 0.41 |
| rug, wall items | — | no footprint: flat on the floor, or up on the wall |

The radii come from each model's own bounding box, rounded up; a test re-measures them against
`buildDenItem` so a new or changed item cannot quietly drift.

A pet is not a point, so it keeps a **clearance** of a fifth of its own height out of every
footprint: 0.20 for the current pet (1.0 unit tall) and 0.06 for the small roaming pets (0.3).
That number is what it takes for the lower body — the part Hanna saw vanish — to clear the dome
of a cushion it is standing beside.

## 3. The bed is walked on; everything else is walked around

The bed is the pet's own, so it is not an obstacle: it is **furniture it stands on**. Its height
under the pet is `bedTopAt(d)`, `d` being how far the pet's middle is from the middle of the bed:

- `d ≤ 0.35 × bedR`: the full seat height, `seatYOf(bed)` — the pet is **on** its bed, and the
  `cushion` and `sleep` states, whose target is the middle, are seated exactly as before.
- `d ≥ bedR`: the floor, 0.01.
- between: a smooth (cosine) ramp from the seat down to the floor — the cushion's slope.

Every other prop is a hard keep-out. A walk step that would land inside one is pushed back out to
its edge, which makes the pet slide round the circle and gives the smooth arc of §1. A pet that is
somehow already inside one — she places a toy under a walking pet — is eased out at walking speed
rather than teleported.

## 4. Where it may walk

A roam target is first taken from the seeded stream as it is today, then **repaired**: pushed out
of every hard footprint, pushed off the bed as well when there is still floor inside the patch to
push it to, and clamped back into the patch. Repairing rather than re-rolling keeps the walk
deterministic per `(petId, session)`, which is what every T-0032 and T-0046 test rests on.

The two patches of T-0046 §3 were almost entirely inside the bed, so both widen. How far they may
widen is set by the den's own camera: a test projects each corner of each patch, with a pet-sized
body on it, through `denCamera` at the phone's 334 × 300 and the computer's 16:10 and requires it
to be fully in frame.

| | x | z | speed |
|---|---|---|---|
| other pets (T-0032, unchanged) | ±1.0 | −0.25 … 0.9 | 0.18 u/s (hoppers 0.14) |
| current pet, computer | **±0.95** (was ±0.6) | **−0.25 … 0.3** (was −0.2 … 0.5) | 0.18 u/s (hoppers 0.14) |
| current pet, phone | **±0.5** (was ±0.3) | **−0.15 … 0.35** (was −0.1 … 0.3) | 0.08 u/s |

The phone's patch grows by 0.2 in x so that one stroll — D-0040 §3 caps it at 4 s, and 0.08 u/s
makes that 0.32 units — carries the pet from the middle of its cushion down to the cushion's rim
and the rug beside it, instead of stopping halfway up the slope. **D-0040 §3's numbers are not
touched**: the share of picks that are a wander, the length of a wander and the speed all stay
exactly as T-0046 set them, and the patch stays well inside the frame and the phone's shadow disc
is unchanged. Widening the patch was the alternative the task asked for, and it was enough; no
wander had to be made longer or faster, and the pet never clips.

The computer's patch grows because the old one was *entirely* inside the cushion's keep-out — the
pet had nowhere legal to stand. ±0.95 × (−0.25 … 0.3) leaves a comfortable ring of rug around the
bed on every side — including round the **basket bed**, the widest of the three, which at ±0.8 left
the pet only a sliver in one corner — and every corner of it is in frame at 16:10. The pet is still
on the rug there (the rug reaches 1.05).

"In frame" is measured against a grown pet's own silhouette taken as four rings — its feet, its
widest point a third of the way up, its shoulders and the top of its head, from the measured bodies
of all twenty species — not as a box around the whole creature, which is far wider than any of them
and would have forced a patch smaller than the one the den already shipped.

## 5. What does not change

- No new object in the scene, so the budget cannot move (Done when 3 and 5).
- The state tables (`pickRoam`, `pickCurrentRoam`), the mood rules, the sleep rule, reduce motion,
  the reaction freeze, Trick!, tap-to-pet and drag-to-feed: all exactly as T-0046 left them.
- The other pets keep their own rectangle and their own speeds; they only gain the footprints,
  with the bed a hard keep-out for them (they never walk home to it, so they never need to be on
  it) and their own small 0.06 clearance.
- The shelf pet (T-0033), the hatch, the crack, the reveal and the Shop's preview den are
  untouched: all of them keep a still creature.

## 6. Screenshots

`docs/tasks/T-0050-screens/`, before (on `main`) and after, at 390 × 844 and 1280 × 800: the pet
walking beside its cushion with its feet visible, and the pet home on the cushion at seat height.

## Review after building (2026-11-23)

Reviewed the build against §1–§6 and against the six screenshots in `docs/tasks/T-0050-screens/`,
each taken from the live den on the no-backend dev server at port 3172, with Hanna's own den (one
pet, a red fox called Fox, the den's own gold cushion, a ball on the toy spot).

**Verdict: pass. Over to the tester.**

What the shots show

- `390-before-feet-in-the-pillow.jpg` — **this is Hanna's bug**, caught on the phone. The fox has
  strolled a little to the left of the middle and the cushion has eaten him from the knees down:
  no paws, no legs, a fox apparently sliced off at the pillow. Exactly "his feet vanish".
- `1280-before-feet-in-the-cushion.jpg` — the same on the computer, and worse than reported: the
  fox is standing *inside* the ball she placed as well. The ball is not visible at all in that
  frame; it is inside him.
- `390-after-on-the-cushions-edge.jpg` — the same stroll, after. The fox is off to the side of the
  cushion with **both paws visible**, standing on the cushion's edge rather than in it. His feet
  are the dark pads you can count.
- `1280-after-beside-the-cushion.jpg` and `1280-after-on-the-rug.jpg` — on the computer he is
  properly **off** his cushion, standing on the plum rug beside it with the cushion empty and
  visible next to him, and with the ball beside his feet rather than inside them. Two different
  spots, not the same one twice, so the walk is not a fixed little orbit.
- `390-after-home-on-the-cushion.jpg` — back home on the cushion, sitting at its seat height, in
  the pose T-0029 gives him. Indistinguishable from today's den, which is what §1 promises for the
  great majority of the time.

Does the walk still look natural?

- Yes. The traces behind the shots (the den's own position, read once a second for two and a half
  minutes at each size) read as an animal, not as a machine avoiding a cone: he rises off the
  cushion, walks out across the rug, sits where he got to for ten or twelve seconds, and comes
  back. On the computer one stroll went from the middle out to x ≈ 0.58 and back; another went
  left past the ball and round it. He never stops dead in front of a prop, never reverses, and
  never circles one. The arc round the ball is one smooth curve.
- Getting on and off the cushion is the biggest visible improvement after the feet themselves:
  where the old build dropped him 0.17 units the instant he left the middle — a pop — he now walks
  down the pillow's slope and steps onto the rug.

What differs (not must-fix)

- **On the phone the stroll stays on the cushion**, on its slope and rim, rather than reaching the
  rug. That is not a shortcut: at under half the computer's speed and at most four seconds a
  stroll, D-0040 §3 allows 0.32 units of walking, and the pet's body has to be about 0.75 from the
  middle of the den to be clear of the gold cushion — further than the phone's frame even allows
  on the right-hand side. Standing *on* the bed (D-0043 §3) is what makes the phone case work at
  all. Her phone den is exactly as lively as T-0046 made it — the same stroll, the same distance —
  only without the vanished feet. **For Hanna:** if she would rather see Fox walk all the way onto
  the rug on her phone too, that is one number (the length of a stroll, now at most 4 s, would go
  to about 9 s, with strolls made rarer so the den stays as calm) — but it is a D-0040 §3 number,
  so it is hers to ask for, not ours to take.
- The small roaming pets now keep out of the bed entirely, which on a busy den slightly reduces
  the floor they share. With their 0.06 clearance it is barely noticeable; nothing in the T-0032
  design promised them the middle of the room.

Must-fix: none.

# Test

## Tester, 2026-11-23

Commands, as run

- `pnpm exec tsc --noEmit`: clean, no output. (It was **not** clean on `origin/main`: `const _ =
  within` keeping an unused import alive in `src/components/DayEditor.test.tsx`, from T-0045. CI
  does not run `tsc`. Removed here; noted in the Log, and this is the second task running to hit
  it.)
- `pnpm test`: **1656 passed, 0 failed, 22 skipped** (125 files passed, 2 skipped), including the
  41 new cases in `src/lib/creatures/denProps.test.ts`.
- `pnpm exec vitest run src/lib/creatures/denRoam.test.ts
  src/components/creatures/denBudget.test.ts src/components/creatures/scenes.test.tsx
  src/components/creatures/creatures.stress.test.ts`: **104 passed**, repeated, no flakiness. The
  helpers are pure and seeded, so there is nothing to flake.
- `pnpm exec vitest run src/components/creatures/denBudget.test.ts`, with its own output:
  `den low: 38 draw calls, 4915 triangles` and `den high: 59 draw calls, 16013 triangles` — the
  same as before this task, against budgets of 60 / 20,000 and 80 / 40,000.
- `pnpm run build`: ok (client + Netlify SSR entry, `✓ built in 848ms`).
- `pnpm exec harness check` and `pnpm exec harness tasks-index`: see the Log.

What I tried to break

- **Every bed.** The gold cushion (no bed placed), the cloud cushion and the basket bed, on both
  sizes, each in a den with every spot filled, 4 seeded dens × 100 seconds each: 2.4 million
  simulated frames in all. At no frame are the pet's feet inside a prop, at every frame it is
  standing on the floor or on the top of its bed, and it never leaves its patch. The basket bed —
  the widest, 0.63 — is the one that caught the first choice of walk patch: at ±0.8 the pet had
  only a sliver of legal rug in one corner and never got off the bed at all. Sent that back; ±0.95
  fixes it and the test now proves the pet reaches the floor with every bed on a computer.
- **A den full of props.** Star rug, window, mini bookcase, reading lamp, yarn and a bed: the rug
  and the window rightly get no footprint (flat, and on the wall), and corner-to-corner walks
  across every pair of patch corners never enter one.
- **Two props that overlap.** The bed and the food bowl are close enough that their keep-out
  circles cross, which is the case that makes a naive "push out of the circle" loop bounce for
  ever between them. Pushed a point into the overlap from every side: it settles where the two
  edges meet, the only clear ground there, and the walk's own guard keeps the pet waiting at the
  gap rather than jumping to the far side of the pair.
- **The phone's small patch.** Checked on the running app, not only in the test: over two and a
  half minutes at 390 × 844 the pet strolled out and back twice, and its height never went to the
  floor while it was over the cushion — it rode the slope. This is the case the design calls out:
  the phone's stroll stays on the bed, by arithmetic, not by accident. See the UX review.
- **A prop placed mid-walk.** Dropped a ball exactly under a walking pet: it is eased out at its
  own walking speed, never teleported, no step longer than one step, and it is clear within about
  two seconds. Also with the prop placed under a pet that is *resting*: same.
- **Reduce motion.** `pickCurrentRoam({ reduce: true })` is `cushion` for every counter on both
  sizes, `walking` is `roam && !reduce` in `<Creature>`, and the den asks for no frames at all
  with reduce motion. Three belts. And the cushion's own spot is `seatYOf(bed)` exactly, so a
  reduce-motion pet is on the pixel it has always been on.
- **Several pets.** 60 pets' seeded starting spots, all clear of every prop and of the bed; with
  2+ pets the current pet walks on its bed and `<WalkingPets>` keeps the others off it, so no two
  pets fight over the middle. They still pass through *each other*, which T-0032 §3 always allowed
  and this task does not change.
- **Determinism.** Same den, same counter, same target and same step, every time — so a re-render
  re-plays, which T-0032 and T-0046 both rest on. Repairing the seeded target instead of
  re-rolling it is what keeps that true.
- **A new shop item.** Deleted a radius from the table and the measuring test failed by name;
  added a fictional toy id and `denFootprints` leaves it out rather than making a circle of `NaN`.
  So a prop added later either gets a footprint or is visibly missing one.
- **The pet's patch against the camera.** A grown pet's silhouette, as four measured rings,
  projected through the den's own `denCamera` at 334 × 300 and 16:10 at the corners and middles of
  both patches: fully in frame. This is the test that stopped the computer's patch at ±0.95.
- **The budget.** Measured on the running phone den, resting against wandering, sixteen windows:
  **17.0 draw calls and 1,770 triangles per frame in every single one**, identical to T-0046's.
  `denBudget.test.ts` is unchanged and green, including T-0046's case that a roaming pet is the
  same object moved.
- **The shelf pet.** `ShelfPet.tsx` and `useShelfPet.ts` are not in the diff at all; the shelf's
  creature keeps its T-0033 idle and still never walks.
- **The hatch, the crack, the reveal and the Shop preview.** Untouched: roaming is still gated on
  `roamCurrent` in `CreaturesPage.tsx`, and `<Creature>` falls back to `(0, seat, 0)` when it is
  not walking.

Verdict: **passed.**

Remaining: Hanna confirms on the live site that the fox's feet no longer disappear into the
pillow. One question for her is in the UX review, about how far he strolls on the phone.

# Build notes

## Phone performance (Done when 5)

Measured on the no-backend dev server (port 3172) at 390 × 844, headless Chrome, on the Creatures
tab, with one pet (a red fox called Fox, as Hanna has), the cosy habitat, the ball placed and
cookies in the bowl. `drawElements` and `drawArrays` are wrapped on the den's own WebGL context and
counted over sixteen 3-second windows, with the triangles taken from each call's `count`. Before
and after each window the pet's position is read off the den, so every window is labelled by what
the pet was doing in it.

| phone den, 390 × 844 | pet resting | pet wandering | T-0046 | budget (T-0031 §10) |
|---|---|---|---|---|
| draw calls per frame | **17.0** | **17.0** | 17.0 | ≤ 60 |
| triangles per frame | **1,770** | **1,770** | 1,770 | ≤ 20,000 |
| frames per second | 19.9 – 22.6 | 20.3 – 22.6 | 20.0 – 21.7 | ~20 (T-0029) |

Ten windows caught the pet resting and six caught it wandering; every one of the sixteen gave
**17.0 draw calls and 1,770 triangles per frame** — the same numbers T-0046 measured, to the
decimal. **Nothing had to be made rarer, shorter or slower to keep the budget** (D-0043 §7).

This is by construction. Footprints are arithmetic on two numbers per prop: a distance and a
comparison, a handful of them per frame. No mesh, sprite, light, material or shadow caster is
added, and the pet is still the creature the den already draws, with its group's `position` and
`rotation` changed. The phone keeps `frameloop="demand"` and the walk still does **not** call
`invalidate()` per frame, so the frame rate does not rise either.

## The phone patch (what the task asked to watch)

Excluding the bed's footprint would have left the phone's patch with **nothing at all**: the gold
cushion needs the pet's middle 0.75 from the middle of the den, and the phone's frame does not
reach that far on the right-hand side at all. So two things were done, in this order:

1. **The bed is walked on, not around** (D-0043 §3). This is the real fix, and it is why no
   D-0040 §3 number had to move: on the phone the pet rides the cushion's own slope, feet on a
   surface at every moment, instead of either clipping through it or being forbidden to move.
2. **The phone patch was widened a little** as the task suggested — ±0.3 → **±0.5** in x,
   −0.1 … 0.3 → **−0.15 … 0.35** in z — so a stroll aims at the cushion's rim rather than at a
   point the pet is already standing on. The share of picks that are a stroll, the length of a
   stroll and its speed are **untouched**.

The computer's patch was widened much more (±0.6 → **±0.95**, −0.2 … 0.5 → **−0.25 … 0.3**),
because the old one lay *entirely* inside the cushion's keep-out: the pet had nowhere legal to
stand at all. ±0.8 was tried first and was still too tight round the **basket bed**, the widest of
the three, which left the pet a sliver in one corner; ±0.95 leaves rug on every side of every bed
and is still inside the rug (which reaches 1.05) and inside the frame.

"In frame" is now a test, not a judgement: `denProps.test.ts` projects a grown pet's silhouette —
four rings taken from the measured bodies of all twenty species: feet, widest point, shoulders and
the top of the head — through the den's own `denCamera` at the phone's 334 × 300 and a computer's
16:10, at the corners and middles of each patch.

## What was built

- **`src/lib/creatures/denProps.ts`** (new, pure): `denFootprints` (the footprints of a den, from
  `DEN_SPOTS`, `BOWL_SPOT` and `seatYOf`), `PROP_RADIUS` (measured per model), `clearanceFor`,
  `insideAny`, `pushOutOf` (with the circle-crossing fallback for two props that overlap),
  `clearTarget`, `offBed`, `stepAround` and `bedTopAt`.
- **`src/lib/creatures/denRoam.ts`**: the stale bowl circle is gone from `roamTarget` — it pointed
  at the bowl's pre-T-0031 spot, so for two tasks the den's only collision avoided an empty patch
  of rug. `CURRENT_RANGE` and `GENTLE_RANGE` widened as above; `gentleTarget` aims at 0.3 – 0.5
  from the middle instead of 0.2 – 0.3. The state tables are untouched.
- **`src/components/creatures/DenScene.tsx`**: `<Creature>` takes `placed`, works out the den's
  footprints and its own clearance once, repairs each wander target against them, walks with
  `stepAround`, eases out of a prop placed on top of it, and takes its height from `bedTopAt` —
  which replaces the old "within 0.08 of the middle counts as on the cushion" rule and its lerp.
- **`src/components/creatures/WalkingPets.tsx`**: takes `placed`, keeps out of the same footprints
  with the bed added as a plain keep-out and its own 0.06 clearance, and clears its seeded
  starting spot too.
- Tests: `src/lib/creatures/denProps.test.ts`, 34 cases.
- Also in this commit, outside the task: `src/components/DayEditor.test.tsx` had an unused
  `within` import kept alive by `const _ = within`, which `tsc --noEmit` rejects. It came in with
  T-0045 and CI does not run `tsc`. Two lines, removed, so the typecheck is a usable check again —
  this is the **second** task in a row to trip over it (see T-0046's build notes), so for the
  architect: the typecheck belongs in the CI checks.

# Log

- 2026-11-23 architect: wrote T-0050 from Hanna's report ("When the fox is walking through the
  pillow his feet vanish"). Found the cause: the den's roaming has no collisions at all, and the
  one avoidance that exists (`roamTarget`'s bowl circle) still points at the bowl's pre-T-0031
  spot, so it avoids an empty patch of floor; both of the current pet's walk patches lie inside
  the bed's own footprint. Recorded **D-0043** (the bed is walked on, every other prop is walked
  around), which is what lets the phone keep D-0040 §3's numbers unchanged. Took T-0050 because
  T-0044–T-0046 are taken and the next numbers are in flight on another branch. Size: small
  (a fix inside existing screens and data, no new collection, route or outside service).
- 2026-11-23 ux-designer: designed the footprints, the bed's height profile and the two widened
  walk patches (§1–§6). Nothing new is drawn. Over to the developer.
- 2026-11-23 developer: built it in one commit. `denProps.ts` with the footprints and the
  geometry; the walk in `<Creature>` and in `WalkingPets` now repairs its target, steps round a
  prop and takes its height from the bed; the stale bowl circle is gone from `roamTarget`. 41 new
  tests, tsc clean, 1656 tests pass, build ok. Phone measured at 390 × 844, resting against
  wandering: **17.0 draw calls and 1,770 triangles per frame either way** (budget 60 / 20,000),
  19.9 – 22.6 fps — identical to T-0046, nothing had to be reduced. Screenshots before and after
  in `docs/tasks/T-0050-screens/`. Also removed the unused import that made `tsc` fail on `main`
  (T-0045) — for the architect: that is the second task in a row, the typecheck belongs in CI.
- 2026-11-23 ux-designer: reviewed against §1–§6. The before shots show exactly Hanna's bug (and
  the fox standing inside the ball on the computer); the after shots show his feet in every frame,
  on the rug beside the cushion on the computer and on the cushion's edge on the phone, and the
  walk reads as an animal rather than an orbit. Pass; over to the tester. One thing for Hanna:
  on the phone the stroll stays on the cushion, because D-0040 §3's four seconds at under half the
  computer's speed cannot carry a pet clear of its own pillow — hers to change, not ours.
- 2026-11-23 tester: passed. 1656 tests pass with the gap tests added (determinism, no step longer
  than two steps, every pet's start clear, an unknown item left out rather than `NaN`, reduce
  motion, no patch swallowed by its clearances, and the bowl avoided where the bowl actually is).
  Tried every bed, a full den, two overlapping footprints, the phone's small patch, a prop placed
  mid-walk, reduce motion, sixty pets and the shelf pet. Sent the first walk patch back: at ±0.8
  the basket bed left the pet nowhere to stand. The phone's budget is unchanged, measured resting
  against wandering.
  Remaining: Hanna confirms on the live site that the fox's feet no longer vanish into the pillow.
