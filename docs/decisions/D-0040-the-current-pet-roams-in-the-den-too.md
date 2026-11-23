---
id: D-0040
title: "Her current pet roams the den too: freely on the computer, a short gentle wander on the phone"
description: "The creature on the den's cushion is no longer the one creature that never moves: on a computer the current pet roams like her other pets, and on a phone it takes a short slow wander now and then and rests between, which narrows D-0033 §13 (on phones movement only on a tap or a trick) for the den's current pet; reduce motion keeps it on its cushion, and no roaming may cost a draw call."
status: Accepted
date: 2026-11-23
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [creatures, den, phone, performance]
---

# Context

D-0033 §13 says: *"On phones the creatures mostly hold still (small idle animations at most,
movement only on a tap or a trick); full roaming only on the computer."* T-0032 built exactly
that, and added one more rule of its own: the **current** pet keeps the cushion in every case,
and only her *other* pets roam, on a computer.

Together those two rules have an outcome nobody intended. Hanna has **one** pet and reads on
**her phone**. Both rules fire at once, so the den she looks at has a single creature that is
guaranteed never to move. She reported it on 2026-11-23:

> "Fox is still sitting still on his pillow."

The den was asked for as a place where her creatures *live*. For the one person it is built
for, it was a still picture.

Three ways out were considered:

1. **Leave it.** Cheapest, and keeps D-0033 §13 word for word. Rejected: it leaves the feature
   not working for the only user, in the only configuration she has.
2. **Let the current pet roam on the computer only.** Half a fix: her computer den comes alive,
   her phone den — the one she actually uses — does not.
3. **Let the current pet roam on both, gently on the phone.** What Hanna chose, after being
   told that a phone den must stay calm and cheap.

The reason §13 was written was the phone's performance budget (T-0031 §10: 60 draw calls,
20,000 triangles), not a wish for stillness. Moving a creature that is **already drawn** costs
no draw call and no triangle — it is a position and a rotation on a group that exists either
way, on frames the den already renders. So the budget that §13 protects is not what this
changes.

# Decision

1. **The current pet roams in the den.** It is no longer pinned to the cushion. It walks off,
   rests on the floor, and comes back and sits on the cushion again, by the same seeded state
   machine T-0032 §4 gives her other pets.
2. **On the computer it roams freely**, like her other pets: about a third of its time walking,
   at 0.18 u/s (hoppers 0.14), with the cushion still its favourite spot.
3. **On the phone it roams gently and sparingly**, and must stay clearly lighter than the
   computer: a short slow wander now and then, long rests between. Concretely, and as the
   minimum that counts as "clearly lighter": at most a quarter of its picks are a wander, each
   wander lasts at most 4 s, its speed is less than half the computer's, and it stays within a
   small patch around the cushion so it is never out of frame.
4. **With reduce motion there is no roaming at all**, on either size: the pet stays on its
   cushion, as it does today.
5. **Everything she can do to a pet keeps working while it walks**: tapping it to pet it,
   Trick!, and dragging a cookie onto it. A reaction stops the pet where it is while it plays,
   so she is never chasing a moving target.
6. **Roaming may never cost a draw call or a triangle.** If making a creature move would need
   something new drawn, or would push the den past T-0031 §10's budget on a phone, the roaming
   is made rarer, shorter or slower — the budget is not raised.
7. This **narrows D-0033 §13** for the den's current pet. The rest of D-0033 §13 stands: her
   *other* pets still roam only on a computer, toys and pair-play are still computer-only, and
   every creature scene still stops when its page is not visible or something is over it. The
   rest of D-0033 is untouched and stays Accepted.

# Rationale

The den's promise is that her creatures live there. A rule meant to protect the phone's frame
budget was, in her configuration, protecting nothing and costing the whole feature: the one
creature in view was the one creature forbidden to move. Moving an object that is already in
the scene is free in the currency §13 was written in, so the promise can be kept without
spending anything.

Keeping the phone *clearly* lighter, with numbers in the decision rather than only in the code,
means a later change that quietly makes the phone den busy has to argue with this record
first — which is what §13 was really guarding.

Reduce motion stays absolute. Someone who has asked for less motion has asked for less motion;
there is no "gentle" version of that.

# Consequences

- The den's `<Creature>` is no longer a fixed-position component: it carries a position, a
  facing and a state clock, like `WalkingPets` does.
- Anything that assumes the current pet is at the cushion's spot is now wrong. Hit tests must
  hang off the pet's own group (they do), and animations that set the root's rotation must add
  to its facing rather than replace it.
- The phone's measured numbers belong in the task's *Build notes* whenever the den's motion
  changes, so §6 can be checked rather than believed.
- The hatch, the crack, a reveal and the Shop's dressing preview keep a still creature: those
  are pictures of a creature, not the den she lives in.
- The shelf creature (T-0033, D-0033 §5) still never walks. That is a different promise and
  this record does not touch it.

# Guidance for agents

- **Preserve:** reduce motion means the cushion, always. The phone's wander stays rare, short,
  slow and small — if you change one of those four, say what the other three now are and
  measure the den again. Never add an object to make a creature move.
- **Preserve:** a reaction (pet, feed, level-up, trick) freezes the walk while it plays, and
  the state clock pauses with it, so a long petting session does not make the pet skip states.
- **Avoid:** giving the current pet toys or pair-play. Those hold locks shared with
  `WalkingPets` and are written for the small, distant pets; the current pet is drawn large and
  close, and walking it to a toy reads badly in the den's framing.
- **Avoid:** widening the current pet's walk patch so it leaves the frame, or passes the bowl,
  or (on a phone) leaves the soft shadow disc that stands in for its shadow.
- **Stop and ask** (Hanna) before making the phone den busier than this record allows, and
  (the Engineer) before anything that would raise T-0031 §10's budget.
