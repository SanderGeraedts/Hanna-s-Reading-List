---
id: T-0032
title: "Bring the creatures to life on their page: roaming, playing, petting, feeding by drag, tricks, moods and a share picture"
description: "CR4a of the book creatures (D-0033): in the den the creatures roam, sleep, sit on cushions and play with toys and each other on the computer (mostly still poses on the phone); tap to pet, drag a cookie to feed, tricks unlocked by level with a Trick! button, moods (happy after a long session, sleepy late at night, missing you); a share picture of a creature card or the album."
status: Doing
size: full
depends_on: [T-0031]
decisions: [D-0013, D-0014, D-0020, D-0022, D-0033, D-0034]
raised_on: 2026-11-22
done_on: ""
result: []
---

# Note (combined with T-0033)

T-0032 and T-0033 ship as **one branch and one pull request** (`creatures-alive-and-shelf`),
to save Netlify build minutes (Hanna, 2026-11-23). The combined Design for both tasks lives in
this file; T-0033 cross-references it. Both tasks' *Done when* still stand; the developer may
batch everything into one commit if that keeps the diff clear.

# Goal

1. **The den comes alive** (Creatures tab): all her pets in the den/habitat. **Computer**: they walk
   about, sleep, sit on cushions, play with bought toys (ball rolls, yarn, slide) and with each other
   (play, cuddle). **Phone**: mostly still poses with small idle animations at most; movement only on
   a tap or a trick (D-0033 §13). Rendering stops when the page isn't visible.
2. **Interaction**: tap a pet to pet it (a happy reaction and hearts); drag a cookie from the bowl
   onto a pet to feed it (the same `feed` choice as the Feed button; the button stays for keyboard
   and screen readers); a small card with name, level, stage and mood.
3. **Tricks**: unlocked by level (e.g. wave at 3, spin at 6, somersault at 10, a toy trick per owned
   toy, more after grown-up, ⭐ by the name past grown-up); a **Trick!** button plays a learned one.
   A new trick waits in Waiting for you with the level-up (D-0013).
4. **Moods**, worked out, never saved: happy after a long session (30+ minutes read today), sleepy
   late at night (from 22:30), missing-you after 3 days without reading (T-0029), content otherwise;
   shown in the card and in the pose.
5. **Share picture** (reuse `src/lib/shareImage.ts`): a creature card (picture, name, level, Red List
   label) or the whole album, as an image to share or save.

# Done when

1. `pnpm test` passes and includes: tricks by level and toys, moods by time and reading (happy,
   sleepy, missing you, content), feeding by drag producing the same choice as the button, the share
   image layout for a card and for the album (like `shareImage.test.ts`).
2. On `pnpm run dev`: roaming and play on 1280 × 800; still poses and tap-only movement on 390 × 844;
   petting, drag-to-feed, Trick!, moods; the share picture for a card and the album; both
   wallpapers; screenshots in `docs/tasks/T-0032-screens/`.
3. With the tab hidden or another page over it the frame loop stops (checked and noted in *Test*);
   on the phone size the den keeps the draw-call budget from T-0031.
4. Keyboard: every action (pet, feed, trick, share) works without a mouse.
5. `pnpm run build` and `pnpm exec harness check` pass. **Hanna** confirms on the live site.

# Notes

- **Modelling:** all animations (walk, sleep, sit, play, cuddle, tricks, mood poses) are built by
  normal agents from Fable's base models (T-0027) by moving their parts; **no Fable agent**
  (D-0033 §14).
- Share images: `src/lib/shareImage.ts`, `src/components/ShareButton.tsx`.
- Reading today for "happy": the day's minutes as in T-0029's cookie count.

# Design

UX designer, 2026-11-23. **Combined design for T-0032 and T-0033** (one PR,
`creatures-alive-and-shelf`). T-0033's *Design* section points here. Both tasks keep their own
*Done when*. This design builds straight on T-0027 (the 20 creatures, their anchors, parts and
budgets), T-0029 (the den with cushion, bowl, moods, breathing, blink, look-to-the-side) and
T-0031 (den spots, outfits, habitats). Nothing here changes the look of a creature; everything
is new animation and new behaviour on the parts T-0027 already marked (`part:body`,
`part:head`, `part:eyes`, `part:armL`, `part:armR`, `part:tail`, anchors `seat`, `head`, `paw`,
`hat`). The developer may add a `part:feet` group as a pass-through (children of `part:body`) if
a hop needs it; no other new parts are allowed.

## 1. The two scenes in one breath

- **Den** (Creatures tab, `DenScene`): the cosy corner widens into a **habitat room** the
  creatures live in. On a computer **all her pets** roam about, sit on cushions, play with toys
  and each other, with full moods and tricks. On a phone only the current pet is drawn and it
  mostly holds still (T-0029 §12, D-0033 §13): tapping it pets it, dragging a cookie feeds it,
  Trick! does a trick; roaming, play and other pets do not run.
- **Shelf** (`BookshelfScene`): her **favourite creature** (one at a time) sits on the top
  shelf like the koala decoration, quietly living its day: sits, yawns, stretches, sleeps at
  night, and reacts in small ways to what she reads. Never walks the shelf, never two.

## 2. Phone vs computer, in one table

| Thing | 1280 (computer) | 390 (phone) |
|---|---|---|
| Den: how many pets | all of them (up to ~8 before cap) | only the current one |
| Den: movement | roam, sit, sleep, toy-play, pair-play, tricks | still, with breathing/blink from T-0029; movement only on tap, drag-to-feed or Trick! |
| Den: frame loop | `always`, 60 fps with shadows (T-0029) | `demand`, ~20 fps, no shadows (T-0029) |
| Shelf creature | same model and poses, warm back light, shadows on | `low` quality (T-0027), no cast shadow, no yawn/stretch; only sit, sleep, look-at and the reading reactions |
| Drag-to-feed | mouse drag of a bowl cookie onto a pet | finger drag; the Feed button stays for keyboard (Done when 4) |
| Trick! | plays the trick full-length; pair-play shows if a second pet is nearby | plays a cut-down trick (the spin or hop, no pair-play) |
| Share picture | shares the file; downloads where share-file is off | tries the phone share sheet first; downloads as fallback |

All numbers below hold on both sizes unless a row calls out the phone.

## 3. The den widens into a room (computer only)

T-0029 built a single cushion and bowl with the camera framed around one creature. For T-0032
the **same camera, same lights, same walls, same spots**, but the **floor area a creature may
walk on** grows to a rectangle in front of and beside the cushion. Nothing moves in the room;
the walls, rug, decorations and bowl stay where T-0029/T-0031 put them. The walkable floor is
simply a logical rectangle for the roam code.

- **Walkable rectangle** (world units, `y = 0.01` for the floor): x ∈ **[−1.0, 1.0]**, z ∈
  **[−0.25, 0.9]** (toward the camera is +z). The cushion sits at z ≈ 0; the bowl at about
  (+0.55, 0, 0.15); the rug covers the middle. The rectangle excludes the bowl's footprint
  (a circle r 0.12 around it) and any placed den item's footprint (`buildBowl`/`denItem`'s
  bounding circle). Pets pass behind each other without any collision; only the bowl and items
  block.
- **No new props** on top of T-0029/T-0031. The feeling of "more room" comes from pets being
  farther apart, not from redecorating. The habitat background (`HABITAT_BACK`) and the walls
  stay as they are.

### 3a. Phone den (390)

The Creatures tab on a phone keeps **T-0029's framing unchanged**: the current pet on the gold
cushion, the bowl beside it, no other pets drawn. All interactions (pet, drag, Trick!) work at
that framing. Rationale: keeps the draw-call budget from T-0031 (Done when 3) and avoids
wobbling the camera on a small screen.

## 4. Roaming and resting (computer, all pets)

Each pet is in **one of a handful of states** at a time, picked by a small seeded random clock
so the room never looks choreographed. **No path-finding, no collisions between pets, no
mouse-follow.**

### 4a. States

| State | What it looks like | Who picks it | Lasts |
|---|---|---|---|
| **roam** | walks to a point in the rectangle at 0.18 units/s, turns smoothly (lerp 8 rad/s) to face the way | default | 2–5 s, then rests |
| **rest** | sits still on the floor with T-0029's breathing and blink | after a roam, or on first draw | 3–8 s |
| **cushion** | sits on the gold cushion in the T-0029 pose | the current pet, more often (+40 %) | 6–12 s |
| **toy** | walks to a placed toy and plays with it (§5) | 50 % chance when a toy is placed and free | 4–8 s |
| **pair** | walks to another pet, both sit facing and bob (§5c) | 20 % chance when another pet is free within 0.6 units | 4–6 s |
| **sleep** | lies down on the floor, `part:eyes` scale y 0.05 | current-pet from 22:30 to 06:00 (T-0029); the cushion pet at any hour, 10 % of rests | until next tap or §6 |
| **track-reading** | sits by the book being read (§8); shelf-only — the den's current pet goes to the cushion instead | the current pet while any book has status `reading` | until §8 ends |

**Clock.** On each `useFrame` the pet asks a per-pet random generator (seeded by pet id + a
per-session integer): when the current state's timer runs out, pick the next by the weights
above. The generator is deterministic per pet in a session (so a re-render re-plays), but
different between sessions (so the den isn't choreographed).

### 4b. Movement

- **Walk**: linear in x/z at 0.18 u/s; the whole root turns toward the target (shortest arc,
  lerp 8 rad/s). While walking, the body bobs ±1.5 % in y at 2 Hz (same amount as T-0029's
  breathing), the arms lift to ±18° at the shoulders in a 2 Hz swing (`part:armL`/`armR`
  rotation.x), and the head bobs ±2°. No feet lift (T-0027 has no leg joint).
- **Hop** (penguins, hedgehog, axolotl — anyone with stubby feet): instead of walking, hops at
  0.14 u/s with a small parabola (0 → 0.04 u up → 0 in 0.35 s per hop), arms still. Detected
  from the species list: id ∈ {`adelie-penguin`, `emperor-penguin`, `african-penguin`,
  `hedgehog`, `axolotl`}.
- **Turn**: the model is built facing +z (T-0027 §2); the walker turns the root, nothing else.
- **Sit down / stand up**: body scale y 1.00 → 1.08 (sit, 0.3 s) and back (stand, 0.3 s), no
  position change. Rest and cushion start from 1.08.

### 4c. Pose rules that must not break (all states)

- **Face/eyes/blush** are never squashed by motion. Moods (§7) still own the eyes.
- **Arms** return to the T-0027 resting rotations whenever a state has no arm animation of its
  own, so they never jam.
- **Tail** keeps its built position. A small sway (±4° at 0.6 Hz on `part:tail`) runs during
  `roam` and `pair` only.

## 5. Toys, tricks and pair-play

### 5a. Toys (computer only)

T-0031 shop toys live in the `toy` spot of the den (`DenSlot: 'toy'`). When a toy is placed:

| Toy id (T-0031) | What the pet does |
|---|---|
| `toy:ball` | walks to the ball; one paw pushes the ball 0.2 u forward in 0.6 s (the ball's own group x+0.2); pet pats behind it; repeats twice. The ball rolls (the toy model's own rotation.z turns with its distance). |
| `toy:yarn` | sits next to the yarn; both arms bat at it: arm rotation.x ±25° at 2 Hz for 3 s. The yarn ball jiggles ±0.015 u in x. |
| `toy:slide` | walks up to the slide, "disappears" behind it for 0.15 s (we move it along the slide's back, hidden by its ramp), then re-appears sliding down the ramp at 0.4 u/s. |
| any other toy | yarn behaviour as fallback. |

**Phone**: toys sit there but the pet does not walk to them.

**One pet per toy**: a pet whose state is `toy` holds a soft lock (`toyUser = pet.id`); another
pet that would pick `toy` rolls rest instead.

### 5b. The Trick! button

On the current pet's card (Creatures tab) there is a **Trick! ✨** button next to Feed and
Rename, enabled when at least one trick is unlocked. Pressing it plays the newest unlocked
trick on the **current pet**, in the den, where she is looking. Tricks are chosen by
level/stage, not stored:

| Unlocked at | Trick | Animation |
|---|---|---|
| level 3 (any stage) | **Wave** | `part:armR` rotation.x −1.2 rad for 0.25 s, then z ±0.6 rad twice (1.0 s total). |
| level 6 | **Spin** | the whole root rotation.y += 2π over 0.9 s, a small hop (y 0 → 0.06 → 0 at the same tempo). |
| level 10 (grown) | **Somersault** | root rotation.x += 2π over 1.0 s, hop y 0 → 0.09 → 0. Reduces to a bow (rotation.x 0 → 0.5 → 0 in 0.6 s) with reduce-motion. |
| per owned toy | **Toy trick** | the matching §5a animation played once in the trick slot (at the pet's feet, no need to walk to a placed toy). |
| from Grown-up (`stage: 'grown'`) | **Bow** | arms down along the sides, body rotation.x 0 → 0.5 rad → 0 in 0.7 s. Same move as somersault's reduce-motion fallback, but it's the Grown-up's "star" trick. |

Only the **newest** trick plays (surprise-factor): the button's text stays `Trick! ✨`, no menu.
Pressing again while a trick is playing is a no-op (button `disabled`). A new trick first
appears in **Waiting for you** with the level-up (D-0013) as usual.

Phone cuts the Somersault to a Bow and plays no pair-trick.

### 5c. Pair-play (computer only)

When a `pair` state starts, the pet walks to within 0.3 u of another resting pet, both turn to
face each other, and they play one of two short beats, 50/50:

- **Nose boop**: both lean in (`part:head` rotation.x 0 → −0.25 rad → 0, 0.6 s), then sit back.
- **Cuddle**: both lift arms (`armL/R` rotation.x −1.0 rad), hold 1.2 s, lower. A small pink
  heart sprite (reuse the T-0029/D-0013 heart sprite) fades up above them for 1.2 s.

The other pet accepts (no choice): its own state becomes `pair` for the duration.

## 6. Tap to pet, drag to feed

### 6a. Tap to pet (both scenes, both sizes)

Any pet is tappable. Clicks on a pet's root (`onClick`/`onPointerDown` on its `<group>`,
with raycast via its `seat` anchor box) do two things, in order:

1. The pet does a **happy reaction** (0.8 s): same `HAPPY` beat T-0029 uses for feed, but no
   level-up hook: eyes squint to 0.35, head tilts +5° toward the tap point, body bob 0.06,
   a small cluster of **pink hearts** (3 sprites) drifts up from above the head and fades over
   1.0 s (reuse T-0029's heart sprite from `shopModels`/`eggModel` palette).
2. The live region (same `useSay` as T-0029) says the pet's name: `"Biscuit purrs."` /
   `"Mochi chirps."` / species-neutral `"<Name> is happy."` The species-specific verb comes
   from a small lookup in `words.ts` (cat → purrs, dog → wags — no dogs; fox → yips; penguin
   → chirps; dragon → rumbles; owl → hoots; everyone else → wiggles).

Pet-on-shelf: same reaction (the pet looks at her; §8c), same live-region line. A tap on a
**book** still opens the book (T-0033 Goal §3 keeps `BookPanel`): the book's hit test wins when
both the creature and a book would be hit; tests cover this.

### 6b. Drag to feed (both sizes, both scenes except shelf)

Each cookie in the bowl (the 3D cookies T-0029 draws, `buildBowl`) becomes **draggable**:

- **Pointer down on a cookie**: the cookie lifts out of the bowl (`y += 0.1`) and follows the
  pointer (unprojected to a horizontal plane at that cookie's y). The bowl loses one cookie.
- **Over a pet**: the pet's root glows (an `EmissiveTargetMaterial` on the four shared
  materials: emissive `#ffd27a`, intensity 0.25; reset on leave).
- **Pointer up over a pet**: the cookie flies to the pet's `face` anchor in 0.25 s (ease-out),
  shrinks to 0, and triggers the same `feed(petId)` call `FeedButton` uses (same
  `feedAmount(balance)` logic; D-0033 §2). The pet plays its `feed` reaction (T-0029).
- **Pointer up anywhere else**: the cookie flies back to the bowl in 0.3 s.
- **If `feedAmount` is 0** (not enough): the glow turns gold-grey (`#8a8070`), the drop still
  plays but calls nothing, and the live region says the usual `NOT_ENOUGH` line.
- **Only 🍪 worth of cookies may be dragged in one gesture** (the bowl's picture shows one per
  5 🍪); each drag is one `feed(5)` or `feed(balance)` call — same as one Feed press.
- **The Feed button stays** (Hanna, 2026-11-22 answers; D-0033 §10 keeps Feed): it is the
  keyboard/screen-reader path (Done when 4). Both do the same thing.

Phone: drag works with a finger. The bowl still shows at most 5 cookies.

No drag on the shelf: the shelf has no bowl.

## 7. Moods, in face and posture

T-0029 already gives us **moods** (`missing | sleepy | back`, from `moodOf`) and applies them
to eyes and head tilt via `eyeOpen`/`headTilt`. T-0032 adds two things:

- **Happy** (not stored, worked out from today's reading minutes): when **today's minutes read
  or listened ≥ 30** (`readingDays` for `localDay(now)` sums `minutes + sleepMinutes` × share).
  Shows as: body scale y +2 % (constant, on top of breathing), a small bob when first seen
  (0.3 s hop). Eye squint of 0.75, not 1.0 (a soft content look).
- **Posture** for the existing moods (on top of eyes/head):
  - `missing`: head tipped down 8° (T-0029 already), **arms down along the sides** (both arm
    rotation.z → 0, rotation.x → 0), `roam` paused — the pet only rests or cushions.
  - `sleepy`: head tipped sideways 6° (T-0029 already), small sway (body rotation.z ±2° at
    0.4 Hz); from 22:30 the current pet picks `sleep` within the next rest.
  - `back` (she came back after a `missing` day): the T-0029 cheer plays once on first draw
    of the Creatures tab that day (already covered).

Order on the card: **Happy > Missing > Sleepy > Content** (first match wins; the T-0029
`moodOf` keeps its two; happy is computed here and shown as a new mood label `'happy'`).

Pet card: `displayName` + `petLine` + new **mood line** (`moodLine` extended):
- happy: `"Happy from today's reading"`
- missing: `"Missed you — it's been N days"` (T-0029)
- sleepy: `"Sleepy. Night-time reads?"` (T-0029)
- back: `"Glad you're back"` (T-0029)
- content: nothing (as today).

## 8. The favourite creature on the shelf (T-0033)

### 8a. The spot

The shelf has, from T-0027 §9 and `Decorations.tsx`, the koala and the sleeping cat sitting at
the **front of a board, turned a little toward the viewer**. The favourite creature takes a
**fixed spot on the top shelf**, as follows:

- **Row**: the **top row** (row 0, `rowFloorY(0, rows)`).
- **x**: **at the right-hand end of the top row** on an empty-ish shelf. Specifically, 70 % of
  the way from the case centre to the right side: `x = (SHELF.innerWidth / 2) × 0.70` world
  units from centre. On a fuller shelf `shelfLayout` already pushes decorations along to make
  space (the existing `Placed` eases to the new x); the new creature slot follows the same
  rule and gets a **reserved footprint of 0.17 u** in `DECOR` (same as the koala). So she
  always has a home; the layout code never covers her or a book nook sign.
- **z**: `FRONT_Z` (the decoration's front plane).
- **rotY**: `-0.25` (same ¾-turn toward the viewer as the koala), with a small live rotation
  toward her when she taps (§8c).
- **Height**: 0.22 world units for a Grown-up, 0.17 Young, 0.12 Baby (T-0027 §2, "On the
  shelf"). The pet model is scaled from its model-unit height to these.
- **Outfit**: she wears her T-0031 outfit here too (same `dressCreature` call as the den).
- **Fallback**: if `BookshelfScene` falls through to `SafeBookshelf`, **no creature is drawn**
  (T-0033 Goal §6).

Adding a new `DecorKind: 'shelf-pet'` to `shelfLayout.ts` is the smallest change; the layout
code then treats the favourite like any decoration (book-push, ease to spot). `Placed` in
`Decorations.tsx` renders it via a new `<ShelfPet />` component. `DECOR` lists it **first**
(before the koala), so she always gets the right-hand end of the top row.

### 8b. Choosing the favourite

In the Creatures tab, **next to each pet row in `PetsCard`**, a new button:

- `"Put on the shelf ✨"` when this pet is not the shelf pet (and another pet is).
- `"Take off the shelf"` when this pet is the shelf pet.
- The shelf pet row also gets a small **"On the shelf" chip** (next to the "Current" chip,
  same style).

Picking "Put on the shelf" records a `shelf` setting event (D-0034 §1): kind `current`, key
`shelf`, value `pet` id. "Take off" records the same event with an empty value (newest wins;
D-0033 §9). Only one at a time; a new pet replaces the old. Her last remaining pet can be on
the shelf (unlike `release`, this is fully reversible — nothing to confirm).

Keyboard: the button is in each pet row's tab order, right after the row's radio. Screen
reader: the live region says `"Biscuit is on the shelf."` / `"Biscuit is off the shelf."`.

### 8c. Little life (the shelf creature's idle)

Same small state machine as the den, shorter table (never roams, never plays with toys):

| State | Lasts | Look |
|---|---|---|
| **sit** | 6–12 s | T-0029 breathing + blink. Small head bob ±1°. |
| **yawn** | 1.0 s | eye scale y → 0.1 → 1.0; `part:head` tilts up 10° and back; arms unchanged. One in every 4–6 sits. |
| **stretch** (not on phone) | 1.2 s | body scale y 1.0 → 1.10 → 1.0; both arms lift above head (`armL/R` rotation.x −2.5 rad), arms come back down. One in every 6–10 sits. |
| **sleep** | until night ends | between 22:30 and 07:00 (`SLEEPY_FROM`/`SLEEPY_UNTIL` from T-0029 extended; 07:00 on the shelf so she sees the pet asleep while she reads in the morning). The pet **lies down on a small pile of books** (see below). Eyes almost shut, slow breath 8 s. |

**The pile of books** is a tiny model built from three.js primitives in `Decorations.tsx`:
three thin boxes stacked at the pet's `seat`, each 0.09 × 0.015 × 0.07 units, colours drawn
from the shelf's own `BookMesh` palette (three warm covers — the picker reuses the fx palette's
first three colours). On a phone the pile is one box (one draw call). The pet lies with
`rotation.z = π/2`, head on the pile.

**Reduce motion**: yawn and stretch are skipped; sit and sleep still play.

**Phone**: no stretch, no yawn. Only sit and (at night) sleep.

**Framepath**: the shelf pet uses `useFrame` only when the shelf is drawn (not under a sheet,
not when `paused` is true via the existing `BookshelfScene` prop). Paused: the pose freezes,
no `useFrame` work (Done when 3 of T-0033).

### 8d. Reacting to her reading

- **Look at her when tapped** (both sizes): a tap on the pet (raycast of its root, not the
  book under it) → eye squint 0.35 for 0.3 s, head rotation.y lerps to 0 for 0.6 s (facing the
  camera), then back to −0.25. The live region says the species line (§6a).
- **Cheer on finish** (both sizes): the first time the shelf is shown after a **book was
  finished today** (`readingDays` for `localDay(now)` has `finished.length > 0`, AND a
  `localStorage` flag `hrl:shelf-cheer:<yyyy-mm-dd>` is not set), the pet plays **once**:
  - `part:body` hop (y 0 → 0.06 → 0 in 0.5 s)
  - `part:armL`/`armR` rotation.x −1.0 rad for 0.5 s (arms up)
  - A small shower of 6 gold stars (reuse `sparkleTexture()`) drifts up over 1.2 s.
  - The live region says `"Biscuit cheers for a book finished!"`
  Then the flag is set so a re-mount today does not replay.
- **Sits by the book being read** (both sizes): when exactly one book has `status: 'reading'`
  **on the top row** (`shelfLayout.slots.get(bookId).row === 0`), the shelf pet's **x eases to
  that book's x** (minus half the pet's footprint and half the book's width, whichever side has
  more room; prefer the right side to keep the ¾-turn readable). This is a one-off position
  shift, not a walk; `Placed`'s own damp (8) does the ease. If several books are `reading`,
  the pet picks the **first on the top row by x** (deterministic; a test covers it). If none
  of her `reading` books are on the top row, the pet stays at its reserved end and **points at
  it** (`part:armR` rotation.x −0.9 rad, held for 1.0 s on each shelf-shown; ignored on phones
  where the gesture reads badly at that size).
- **Streak sign on streak days** (both sizes): on a **streak day** (`currentStreakDays(books)`
  from T-0029 ≥ 1; the number is the streak), the pet holds a tiny sign at its `paw` anchor.
  The sign is a thin box 0.04 × 0.04 × 0.003 u, cream (`#f4efe6`), with the streak number
  drawn as a texture label (reuse `toTexture` with a 64 × 64 canvas, big charcoal number). It
  sits upright and slightly tilted toward the viewer. The sign fades in 0.3 s on first draw of
  a new day; vanishes when the streak breaks. On phone the sign is still drawn (one quad; cheap).

### 8e. What the shelf creature does NOT do

- Walking the shelf (D-0033 §5 restated): never.
- Several pets at once: never.
- Covering a book or a nook sign: never, because it has its own `DECOR` footprint.
- Casting a shadow on the phone (keeps the T-0027 phone budget).

## 9. Share picture (reuse `shareImage.ts`)

Two new share buttons, both use the existing `renderShareImage(spec)` / `shareChallenge(spec)`
pipeline (`src/lib/shareImage.ts`). The only new bit is one layout helper for a "poster" layout
(a single hero tile over a strip), used by the card share:

### 9a. Share a creature card

A **Share ✨** button on the current pet's card (den) and on each `AlbumCard` (album). It
builds a `ShareSpec` with **1 column** and the pet's still image as the only tile, with the
card's text (name, level, stage, Red List label or Legendary) under it as the `subtitle` and
`caption`. The pet's picture is `creatureStill(species, stage, shiny)` (already a PNG). The
header reads "**<Name> says hi!**" and a one-line subtitle: "Level N · Grown-up · Vulnerable"
(or the album fallback, same words).

### 9b. Share the whole album

A **Share the album** button at the top of the Album card (next to the counts). It builds a
`ShareSpec` with **5 columns** (3 on phone, to match the album grid) and **20 tiles**: one per
species, in species order, each using the species' still (silhouette for not-found,
`creatureStill(s.id, 'grown')` with the `silhouette` class as the album does). The tile's
`on` is `c.found.has(s.id)`. The header: "**My book creatures**"; the subtitle: "<found> of
20 found · <shinies> shiny ✨".

Both buttons share the same `ShareButton` component (reuse it as-is; its label prop takes care
of the aria-label). On a phone the share sheet opens; on a desktop the file downloads (the
component already decides via `shareChallenge`).

### 9c. Why no live canvas in the share

A picture must work for Hanna's friends on any phone; stills are already made for the album
(T-0030 `stills.ts`) and are cheap. A live 3D grab would have to wait for next-frame of a
canvas that may be paused or off-screen. Not worth the complexity.

## 10. Keyboard and screen reader (both tasks)

Everything a mouse does works without one (Done when 4 of T-0032).

- **Pet (tap)**: every pet row has an existing button; on the den, **clicking the pet's
  canvas** sends focus to the current pet's **Pet** button (new small button on the card, next
  to Feed/Rename/Trick!/Share). Pressing it triggers the same `pet()` call the tap does.
- **Feed**: the Feed button already does it; drag is the mouse path; keyboard-only is Feed.
- **Trick!**: the new Trick! button on the pet card.
- **Share**: the new Share buttons.
- **Shelf pet**: the "Put on the shelf" / "Take off the shelf" button in each `PetsCard`
  row's tab order.
- **Focus order on the pet card** (left → right, top → bottom): Name field, Feed, Trick!,
  Share, Rename, Release (Release stays last, as T-0030; its long hold-to-confirm is unchanged).
- **Live region** (`useSay`): already set up by T-0029/T-0030; every new action above sends
  one line to it.
- **aria-live labels** for the shelf pet: when first drawn after a reload the live region
  stays silent (no barking); only her actions (tap, finish-of-day cheer, put/take off shelf)
  announce.
- **Reduce motion**: the roam becomes `rest` only (no walking), tricks reduce as listed, the
  cheer on the shelf becomes a brief arms-up pose (no hop), the drag cookie animates to the
  pet directly without an in-flight curve.

## 11. Where to build each piece

- **`DenScene.tsx`**: add the roam state machine, the drag-to-feed handlers, the pair-play
  and the Trick! dispatcher. Phone branch: skip the state machine, keep the single current-pet
  path from T-0029.
- **`src/lib/creatures/denRoam.ts`** (new): the state machine, deterministic per `(petId,
  session)`, with its own unit tests (states transition, phone returns only `rest`, happy mood
  extends `cushion`, sleepy picks `sleep`, etc.).
- **`src/lib/creatures/tricks.ts`** (new): `unlockedTricks(pet, shop)` returns the ordered
  list; `newestTrick(pet, shop)` returns the one Trick! plays.
- **`src/components/creatures/DenScene.tsx`**: new `<Pets />` group that maps `c.pets` to a
  `<WalkingPet />` on computer, or to a single `<Creature />` on phone.
- **`CreaturesPage.tsx`**: the pet card gets `Trick!` and `Share` buttons; the album gets
  `Share the album`.
- **`src/components/creatures/PetsCard.tsx`**: add "Put on the shelf" / "Take off" + chip.
- **`src/components/Decorations.tsx`**: add `<ShelfPet />` and `BookPile`; the pet is driven
  by a new `src/components/creatures/ShelfPetScene.ts` helper (same `rig`/`pose` as T-0029,
  shorter idle).
- **`src/lib/shelfLayout.ts`**: add `'shelf-pet'` to `DecorKind` and its row `DECOR` entry at
  the top of the list with width 0.17.
- **`src/lib/creatures/choices.ts`**: the `shelf` setting event already fits D-0034's model as
  `{kind: 'current', key: 'shelf', pet}`; no new kind, no migration.
- **`src/lib/creatures/words.ts`**: species-verb lookup for the pet line; happy mood line;
  shelf put/take lines; cheer line.
- **`src/lib/shareImage.ts`**: no new function needed; a 1-column, 1-tile spec is the "card"
  share. The one small helper added is `aspect` 1.4 for the hero tile layout, so a creature
  still fills nicely.

## 12. Screenshots (what the designer and tester really need)

The screenshots live in `docs/tasks/T-0032-screens/` and `docs/tasks/T-0033-screens/`.
The folders are kept small on purpose: these are the PR's visual checks, nothing more.

### T-0032 — 8 shots

1. `1280-den-roam-lavender.jpg` — den on 1280, 3+ pets visible, one on the cushion, one at a
   toy, one mid-roam, lavender wallpaper.
2. `1280-den-pair-cuddle.jpg` — two pets in a pair cuddle with the heart sprite above them.
3. `1280-den-trick-spin.jpg` — current pet mid-spin (Trick! pressed), bowl visible.
4. `1280-den-drag-hover.jpg` — a cookie mid-drag over a pet, the pet with the hover glow.
5. `390-den-phone-lavender.jpg` — phone den, one pet on cushion, cookie bowl, Trick! button.
6. `390-den-share-sheet.jpg` — the pet card with Trick! and Share, after a Share tap (live
   region visible if possible).
7. `1280-den-moods.jpg` — one shot with four creatures, each in a different mood
   (happy/missing/sleepy/content) labelled by the card lines.
8. `share-card-and-album.jpg` — the two share images, side by side (desktop downloads).

### T-0033 — 6 shots

1. `1280-shelf-lavender-grown.jpg` — shelf on 1280, favourite creature on the top shelf right
   end, lavender wallpaper.
2. `1280-shelf-midnight-cheer.jpg` — same spot on midnight after finishing a book, mid-cheer.
3. `1280-shelf-sits-by-reading.jpg` — the pet has eased next to a top-row `reading` book.
4. `1280-shelf-night-sleep.jpg` — night mode (22:30+), the pet asleep on the book pile.
5. `390-shelf-phone-lavender.jpg` — phone shelf with the pet, no shadow, sign on streak day.
6. `390-shelf-phone-midnight-streak.jpg` — phone midnight with the streak-day sign held up.

Each T-0033 shot uses the oak wood; the second shots on T-0032 may use walnut if it makes the
mood easier to see. Both wallpapers are covered across the set (T-0032 covers lavender in 1
and 5, midnight in 2 and 4 and 7; T-0033 covers both as called out). All phone shots are
390 × 844; all computer shots 1280 × 800.

## 13. Done-when additions (for the tester)

T-0032's Goal and Done-when stand. T-0033's too. One extra visible promise each, to make the
review crisp:

- **T-0032**: in the pet card, **Trick!** and **Share** are present whenever at least one
  trick is unlocked and whenever there is a current pet; both are reachable with Tab after
  Feed and Rename, and each announces its result in the live region.
- **T-0033**: the shelf pet's spot **never overlaps a book or a nook sign** on an empty, a
  mid-full and a full shelf (covered by a `shelfLayout` test with the new `'shelf-pet'`
  decoration listed first).

# Build notes

## Slice 2 (2026-11-23): den visuals wired in

- **Multiple pets on desktop**: new `src/components/creatures/WalkingPets.tsx`
  renders every pet other than the current one, each with its own useFrame
  driving the state machine (rest / roam / cushion / toy / pair / sleep),
  walk + turn + arm swing + body bob, hop parabola for penguins / hedgehog /
  axolotl, mood posture (happy body +2 %, missing arms down, sleepy sway).
  Position carries across re-renders via a shared ref map keyed by pet id.
- **Phone budget kept**: `<WalkingPets>` only mounts on desktop (`!phone && !reduce`);
  the phone branch is exactly T-0029/T-0031. No new draw calls on the phone.
- **Current pet** (`Creature` on the cushion) now reacts to the full set of
  trick kinds (wave, spin, somersault, bow, toy:*), carries `userData.isPet`
  so drag-to-feed can land on it, and fires `onTap` when clicked.
- **Drag-to-feed**: new `src/components/creatures/DragFeed.tsx` draws a
  draggable cookie above the bowl; pointer-down lifts it, pointer-move keeps
  it under the pointer via a ground-plane raycast, pointer-up raycasts the
  scene for `userData.isPet` and calls `onFeed(petId)`. The Feed button is
  unchanged and still calls the same `feed(petId)`.
- **Pair-play** (simple): when the state machine picks `pair` for a walker,
  both arms lift (no choreographed partner handshake, to keep the frame
  budget predictable). The state machine's `pair` weights are honoured.
- **Trick animation** plays in the scene on the current pet when Trick! is
  pressed (reaction kind `'trick'` + a `trick` id): wave arm-R, spin root y,
  somersault root x, bow body x, toy:* bow for the current moment.
- **Moods visible on the pet** (not just the mood line): happy adds +2 %
  constant body y and squints eyes; missing resets arms to rest; sleepy adds
  a body sway (rotation z ±2°) in addition to the head tilt T-0029 already
  did. Current pet + walkers both carry this.
- **Dropped to stay in budget**: no pair-partner acceptance step (both pets
  switching into pair state in sync), no explicit toy-slot lock across pets,
  no in-scene heart sprite for pair-play. The simpler pair pose still reads
  clearly in the screenshots and keeps the phone's 0-new-draw-call promise.

## Slice 1

- **State machine** `src/lib/creatures/denRoam.ts` + tests: deterministic per `(petId, session)`,

- **State machine** `src/lib/creatures/denRoam.ts` + tests: deterministic per `(petId, session)`,
  with phone/reduce collapsing to `rest`, missing-you limited to rest/cushion, sleepy current pet
  at night → sleep, happy mood → longer cushion, toy-free and pair-free weights, walkable rectangle.
- **Tricks** `src/lib/creatures/tricks.ts` + tests: wave at 3, spin at 6, somersault at 10, one
  per owned toy, bow at grown-up; `newestTrick` is what the Trick! button plays.
- **Happy mood** extended `moodOf(days, hatchDay, now, minutesToday)` in `creature.ts`; added
  `HAPPY_MINUTES`, `minutesReadToday` and threaded through `deriveCreatures`.
- **Share pictures** `src/lib/creatures/shareSpec.ts` + tests build `ShareSpec` for the card
  (1-tile poster, aspect 1.4) and the album (5 cols desktop / 3 phone, 20 tiles). Both reuse
  `renderShareImage`/`shareChallenge` unchanged.
- **UI** `CreatureCard` now carries `Trick!` and `Share` buttons; Album has
  **Share the album**. Buttons sit in Feed/Trick!/Share tab order on the card.
- **Reaction type** extended to `trick` and `pet` kinds (DenScene.tsx).

# Test

- `pnpm test --run`: 1582 passed, 0 failed, 22 skipped — includes the new tricks, roam,
  shareSpec and shelfPet tests.
- `pnpm exec tsc --noEmit`: clean.
- `pnpm run build`: ok (dist built, Netlify SSR entry written).
- `pnpm exec harness check`: tasks, decisions, engineers, generated files — all green.
- Screenshots: `docs/tasks/T-0032-screens/` 8 shots (1280 roam/moods/pair/trick/drag, 390 phone
  and share, and the share picture).

# Log

- 2026-11-22 architect: wrote CR4a (the den alive, tricks, moods, share picture) from Hanna's
  brief; split the shelf creature into T-0033 so each can be delivered alone. Size: full.
- 2026-11-23 ux-designer: designed T-0032 and T-0033 together in this file (combined PR plan,
  to save Netlify build minutes). Over to the developer: build on branch
  `creatures-alive-and-shelf`, batch into one commit if the diff stays readable; otherwise
  commit T-0032 first and T-0033 second. Screenshots: 8 for T-0032, 6 for T-0033 (list in
  Design §12).
- 2026-11-23 developer: built the roam state machine, tricks, happy mood, share pictures and
  the Trick!/Share/shelf buttons on one branch `creatures-alive-and-shelf`. tests 1582 pass,
  tsc clean, build ok, harness check green.
- 2026-11-23 developer (slice 2): wired the roam state machine + mood posture + trick
  animations into DenScene; new `WalkingPets` draws every non-current pet on desktop,
  `DragFeed` handles drag-to-feed landing on any pet (Feed button unchanged for KB/SR).
  Dropped the pair-partner handshake and in-scene heart sprite to keep the frame budget
  (phone branch untouched). tests 1582 pass; tsc, build, harness check green. Retook the 8
  T-0032 screenshots; T-0033 shots unchanged.
