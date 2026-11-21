---
id: T-0012
title: "Make the book nooks little 3D worlds, starting with the night alley and the castle"
description: "Hanna wants the nooks to look like real book nooks: tiny 3D houses, towers and lanterns with warm light, merged so each nook is cheap to draw; the alley and the castle first, the other eight scenes in later steps."
status: Done
depends_on: []
decisions: [D-0011, D-0020]
raised_on: 2026-11-21
done_on: 2026-11-21
result: ["https://github.com/SanderGeraedts/Hanna-s-Reading-List/pull/211"]
---

# Goal

From a grilling with Hanna (2026-11-21), "Grill me about the booknooks and improve them". She
chose:

- **Main goal:** look like real book nooks, with real depth instead of a flat painted scene.
- **Phone:** full 3D, but merged so a nook costs about as much as 3–4 books; the same look on the
  phone and the computer.
- **Step by step:** the night alley and the castle first; the other eight scenes keep their
  painting and follow in later PRs, so she can steer the style.
- **Sign:** smaller, hanging inside the scene from a bracket, with the name top to bottom (#50).
  The ★, medal and 🌙 stay on it.
- **Size:** the same as now (12 × 30 × 22 cm), so the shelf layout doesn't change.
- **Life:** warm glowing windows and lanterns; on a computer they flicker softly, on a phone they
  glow but sit still (like the other decorations).

Still from D-0011: no figures from the series, and every group keeps its wide nook.

# Done when

- Unit tests (`src/components/nook3d.test.ts`) check that:
  - only the alley and the castle are 3D;
  - each scene has solid and glowing parts with colours in the geometry;
  - nothing sticks out of the box;
  - a group's nook is the same every time, and different groups differ.
- Screenshots of a shelf arranged by series (alley for Young adult and Mystery, castle for
  Mythology and Historical fiction) on a computer and a phone show the 3D scenes with the sign
  inside.
- `npm test` and `npm run build` pass.

# Notes

- `src/components/nook3d.ts` builds the scenes from boxes, cylinders and cones.
- Per nook, everything solid (the box, gilt edging, houses, roofs, stone) is merged into one
  geometry with vertex colours, and everything that glows into another.
- One shared material pair serves every 3D nook.
- The painted sky and cobbles are reused from `nookPaint.ts`. Geometry is cached per
  scene and variant.
- A 3D nook is about 11 draws: solid, glow, sky, ground and the sign. A painted nook was about 45,
  with the box, edging, walls, three strings of bulbs, the lamp and the sign.
- `BookNook.tsx`: `Nook` picks `Nook3D` or the unchanged `PaintedNook`. The nooks follow
  `StillDecorations` (still on phones).
- Variety: each group's variant (from its name) picks house, roof, door and pennant colours, which
  windows are lit, and heights.

# Design

Decided with Hanna in the grilling (feature-chat). Screenshots, from a local dev server with no
backend:

- [T-0012-screens/nooks-close-1280.jpg](T-0012-screens/nooks-close-1280.jpg): zoomed in on a
  computer; two castles (Throne of Glass, Wolf Hall) and an alley (Poirot).
- [T-0012-screens/nooks-phone-443.jpg](T-0012-screens/nooks-phone-443.jpg): Hanna's phone size.

# Test

- `nook3d.test.ts`: 3 passed.
  - It first caught the castle keep's roof poking 1.7 cm out of the top of the box, then 1 mm
    out of the back; both fixed.
  - The full suite (376) passes.
- Clicked through on a local dev server at 1280 × 800 and 443 × 824. Each group's 3D scene shows
  with its sign inside, the medals show on the signs' books, and there are no page errors.

**Verdict:** passed.

# Log

- 2026-11-21 architect: grilling with Hanna; the 3D nooks were decided and planned, alley and
  castle first.
- 2026-11-21 developer: built the alley and the castle as merged 3D scenes.
- 2026-11-21 tester: passed locally. Remaining: Hanna checks the look on the preview and steers
  the style before the other eight scenes are built.
- 2026-11-21 developer: Hanna on #211: "looks good, but make sure the name of a series is always in front". The sign now hangs right behind the opening (0.5 cm), in front of every house, tower and lantern; a test checks every scene and several variants. Screenshot updated.
