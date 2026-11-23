---
id: T-0062
title: "Draw the same garden in the cosy 3D style on the computer"
description: "The Garden tab's computer view: the same beds, plants, items and visitors as the flat view, built in Three.js in the shelf's and den's cosy style, inside the den's budget of 60 draw calls and 20,000 triangles, with the same buttons over it so it is tended the same way."
status: Done
size: full
depends_on: [T-0060, T-0061]
decisions: [D-0020, D-0050, D-0051]
raised_on: 2026-11-23
done_on: 2026-11-23
result: []
---

# Goal

The cosy 3D garden Hanna gets on a computer (D-0051 §3): the same garden as the flat view, built
from simple geometry in the warm palette of the shelf and the den, seen from a low camera over the
beds. The spots keep the same places on screen as in the flat view, so the same spot buttons sit
over the canvas and tending works identically.

# Done when

- `pnpm test` passes with a budget test like the den's: the fullest garden on screen (a full bed
  wall of grown trees, every garden item, the visitors, snow) stays at or under **60 draw calls and
  20,000 triangles** on the phone-grade setting, and every single plant model costs at most 3 draw
  calls and 400 triangles.
- A screenshot at 1280 × 800 shows the 3D garden with the plants in their spots.
- A browser that cannot draw 3D falls back to the flat view (no blank page), and the scene stops
  rendering when the tab is not visible or something is over it.

# Notes

- Reuses `drawCost` from `src/components/creatures/shopModels.ts` for the budget test, and the
  scene boundary (`SceneBoundary`), `usePhone`, `useReducedMotion`, `webglAvailable` from the
  creatures.
- The camera is fixed and its projection is shared with the overlay through one helper, so the
  buttons sit over the plants without reading the renderer.

# Design

## 1. The scene

A garden seen from above and slightly to the front, the camera fixed (no orbiting, nothing to get
lost in): the ground a warm green plane, the beds raised earth boxes, a stone path between them, a
soft sky-tinted background in the page's lavender. Lights are the den's: a warm hemisphere light, a
soft key from the left and a cool back light, no shadow maps (a soft dark disc under each plant
instead), so a hundred plants stay cheap.

## 2. The plants

The same four families as the flat view, built from boxes, cylinders, cones and low-poly spheres:

- **tree**: a tapered trunk and one or two crown shapes (a cone for the pine, stacked spheres for
  the oak, a slim crown for the birch);
- **shrub**: a flattened sphere with a few leaf bumps, thorn spikes for the bramble and the
  thornbush, berry dots for the holly;
- **flower**: a thin stem, a few petal planes and a centre;
- **fern**: three to five frond blades from a centre.

Growth scales the whole plant between a third and full size; a sprout is two small leaves. Size
steps from re-reads scale it further. A night-blooming plant's flowers are pale moon white with a
small glow sprite.

## 3. Season and weather

Spring adds blossom dots to the crowns and blooms the flowers; summer is full green; autumn turns
every deciduous crown gold and drops a few leaves on the bed; winter bares the deciduous crowns,
puts a white cap on the beds and leaves the evergreens and the winter flowers as they are. Snow and
falling leaves are one Points object, never one per flake.

## 4. Keeping to the budget

Plants of the same kind and stage share their geometry and material (built once, cloned like the
creatures' `creatureFor`). Beyond what the budget allows, the plants farthest from the camera are
drawn as the simplest shape of their family (one crown, no flowers), and the garden never draws
more than one bed-wall of detailed plants at a time.

## 5. Tending and accessibility

The spot buttons of T-0061 sit over the canvas at the places the shared projection puts them; the
canvas itself is `aria-hidden`, as the den's is, and the hidden sentence and the status line of
T-0061 say everything the picture says. Reduce motion stops the sway, the visitors and the
weather.

## 6. Review (after the build)

Reviewed on 2026-11-23 against this design, on the 1280 × 800 screenshots in `T-0062-screens/`:

- Camera, ground, beds, the four plant families, sprouts, growth scaling, season dressing, items
  and visitors are as designed. The spot buttons line up with the plants at 1280 and at 1440.
  **Matches.**
- Differences, all accepted:
  1. The camera sits at **38°** above the ground, not the 55° of the first build: at 55° the
     garden read as a plan rather than a garden.
  2. The stage takes the **garden's own shape** instead of a fixed 16 : 9, so a two-bed garden is
     not a wide field of empty grass.
  3. The plants beyond the front twelve are **merged into one mesh** rather than drawn one by one
     (§4 asks for the simplest shape; this is that, in one draw call), and the front twelve are
     built at the computer's own quality. The numbers are in T-0065's *Test*.
  4. The falling leaves of autumn and the snow are left out when the device asks for less motion
     or the garden holds more than 60 plants.
- Verdict: **passes**. Screenshots: `T-0062-screens/garden-1280.jpg`, `garden-1440.jpg`,
  `garden-1280-2025.jpg`; with the items placed, `T-0063-screens/items-1280.jpg`.

# Test

See *Test* in T-0065.

# Log

- 2026-11-23 architect: written with T-0060; size full.
- 2026-11-23 ux-designer: designed the 3D garden.
- 2026-11-23 developer: built `GardenScene`, `plantModel.ts` and the shared projection; budget test
  green with the measured numbers in T-0065.
- 2026-11-23 ux-designer: reviewed: passes.
- 2026-11-23 tester: passed; see T-0065.
