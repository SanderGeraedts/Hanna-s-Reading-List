---
id: T-0032
title: "Bring the creatures to life on their page: roaming, playing, petting, feeding by drag, tricks, moods and a share picture"
description: "CR4a of the book creatures (D-0033): in the den the creatures roam, sleep, sit on cushions and play with toys and each other on the computer (mostly still poses on the phone); tap to pet, drag a cookie to feed, tricks unlocked by level with a Trick! button, moods (happy after a long session, sleepy late at night, missing you); a share picture of a creature card or the album."
status: Open
size: full
depends_on: [T-0031]
decisions: [D-0013, D-0014, D-0020, D-0022, D-0033, D-0034]
raised_on: 2026-11-22
done_on: ""
result: []
---

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

For the UX designer, before the build: the living den on computer and phone, the pet card, drag to
feed, the Trick! button, moods and the share picture, both wallpapers.

# Test

# Log

- 2026-11-22 architect: wrote CR4a (the den alive, tricks, moods, share picture) from Hanna's
  brief; split the shelf creature into T-0033 so each can be delivered alone. Size: full.
