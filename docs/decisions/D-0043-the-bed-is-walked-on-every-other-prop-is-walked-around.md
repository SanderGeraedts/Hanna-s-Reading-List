---
id: D-0043
title: "In the den a pet walks around every prop, except its own bed, which it walks on"
description: "The den's roaming gets footprints: every placed prop is a circle on the floor a roaming pet keeps out of, with a clearance of a fifth of the pet's height, so its feet are never swallowed; the bed alone is not an obstacle but furniture — the pet's height follows the bed's own top, so it climbs onto its cushion and down again and the cushion state still seats it at seatYOf(bed)."
status: Accepted
date: 2026-11-23
decided_by: architect
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [creatures, den, phone]
---

# Context

T-0032 built the den's roaming deliberately without collisions — `WalkingPets.tsx` says so in its
own comment, "No path finding, no collisions" — on the reasoning that the den is a small room with
a few props and pets would mostly miss them. The one exception was a hard-coded circle in
`roamTarget` around a bowl at `(0.55, 0.15)` with radius 0.12. T-0031 then moved the bowl to
`(0.66, 0, −0.36)` and grew it to radius 0.16, and nobody moved the circle, so the den's only
avoidance has been avoiding an empty patch of rug ever since.

Hanna reported the outcome on 2026-11-23, from her phone:

> "When the fox is walking through the pillow his feet vanish."

The den's **bed** is not a small prop at the side of the room. It is a dome of radius 0.55 (the
basket bed 0.62) in the exact middle of the floor, and it is 0.18 high. The current pet's walk
patches from T-0046 §3 — ±0.3 on the phone, ±0.6 on the computer — are **inside** it. So the pet
Hanna watches did not occasionally brush the furniture: every single stroll it took was a walk
through the middle of its own cushion at floor height, with the dome drawn over its legs.

Three ways out were considered.

1. **Keep the pet off the bed as well**, the obvious reading of "walk around the furniture". It
   works on the computer, where there is rug on every side. It **cannot** work on the phone: to
   clear the gold cushion the pet's middle must be about 0.75 from the middle of the den, and
   D-0040 §3 caps a phone wander at 4 s at under half the computer's speed, which is 0.32 units.
   The phone pet physically cannot reach legal ground in one wander. Taking this option means
   reopening D-0040's numbers and making the phone den busier — the opposite of what Hanna asked
   for when she chose a gentle phone den.
2. **Lift the pet to the seat height whenever it is anywhere over the bed.** No clipping, but the
   pet pops up 0.18 as it steps over the rim and pops down again: a model jumping between two
   heights, not an animal.
3. **Give the bed a height profile and let the pet walk on it.** What was chosen.

# Decision

1. **Every prop the den places has a footprint:** a circle on the floor, at the spot T-0031 §8
   draws it, with a radius taken from the model's own bounding box. The rug and the wall items
   have none: one is flat on the floor, the others are up on the wall.
2. **A roaming pet never stands or walks inside a footprint,** keeping a clearance of **a fifth of
   its own height** out of it (0.20 for the current pet, 0.06 for the small roaming pets). A roam
   target that falls inside one is pushed out; a walk step that would enter one is pushed back to
   its edge, which carries the pet round it in an arc; a pet that finds itself inside one — she
   places a toy under it — is eased out at its own walking speed, never teleported.
3. **The bed is the exception: a pet walks *on* its bed, not around it.** Its height under the pet
   is the bed's own top at that distance from the middle — the full `seatYOf(bed)` over the
   middle third, the floor at and beyond the rim, and a smooth ramp between. So the pet climbs on
   and off, and its feet rest on a surface at every moment.
4. **The `cushion` and `sleep` states are unchanged:** their target is the middle of the bed, so
   the pet sits at `seatYOf(bed)` exactly, for every bed the shop sells and for the den's own gold
   cushion.
5. **A roam target is pushed off the bed too when there is floor left in the patch to push it
   to.** On a computer that always holds, so the pet really goes and sits on the rug beside its
   bed. On a phone, where the patch is small on purpose, the pet may end a stroll on the cushion's
   slope or rim — standing on it, never in it.
6. **This does not touch D-0040 §3.** The phone's wander stays as rare, as short and as slow as
   T-0046 made it. What changes on the phone is only *where* the pet may walk: its patch widens a
   little so a stroll carries it off the cushion onto the rug beside it, within the frame.
7. **Footprints may never cost a draw call or a triangle**, like D-0040 §6: they are arithmetic on
   positions, not objects. The radii are constants, checked against the real models by a test.

# Rationale

A pet's own bed is not an obstacle; the whole point of a bed is to be stood on. Treating it as one
is what forced the choice between a phone pet that clips and a phone den that has to be made
busier to escape its own cushion. Treating it as furniture removes the choice: the pet is always
on a surface, so there is no distance at which it looks wrong, and D-0040's carefully argued phone
numbers survive untouched.

Pushing a target or a step out of a circle, rather than re-rolling it, keeps the walk deterministic
per `(petId, session)`, which every T-0032 and T-0046 test and the whole "a re-render re-plays"
property rest on. It also gives the arc an animal actually walks when it goes round a chair, for
free, instead of a path-finder the den does not need.

The clearance is a fifth of the pet's height because that is what it takes for the lower body — the
part Hanna watched disappear — to clear the dome of a cushion the pet is standing beside; measured
against the models rather than guessed.

# Consequences

- The den's roaming is no longer "no collisions": that comment and the stale bowl circle in
  `roamTarget` go, and new code must not reintroduce a hard-coded prop position.
- A **new shop prop needs a footprint radius.** A test measures every shop item's model and fails
  if the table is missing it or has drifted, so this cannot be forgotten.
- The current pet's walk patches widen, because the old ones were inside the bed. How far they may
  widen is now a hard limit with a test behind it: every corner of a patch, with a pet-sized body
  standing on it, must be fully in frame through the den's own camera at the phone's and the
  computer's aspect.
- Her other pets gain the same footprints with their own small clearance; for them the bed is a
  plain keep-out, since they never walk home to it.
- Nothing is added to the scene, so the phone budget of T-0031 §10 is untouched.

# Guidance for agents

- **Preserve:** the pet sits at `seatYOf(bed)` on the middle of its bed, for every bed; the walk
  stays deterministic per `(petId, session)`; reduce motion still never moves a pet; D-0040 §3's
  phone numbers.
- **Avoid:** path finding, a navigation mesh, a physics engine, or anything drawn to show a
  footprint. Avoid hard-coding a prop's position anywhere but the one table beside `DEN_SPOTS`.
  Avoid making a pet stop, reverse or orbit when it meets a prop: it slides round and carries on.
- **Stop and ask** before widening a walk patch past what the in-frame test allows, or before
  changing a D-0040 §3 number to buy room for the walk — the room is bought by where the pet may
  walk, not by making the phone den busier.
