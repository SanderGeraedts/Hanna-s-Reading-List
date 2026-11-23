---
id: T-0031
title: "Open the creature shop: food, outfits, home upgrades, eggs, toys, habitats and reading-room decorations for cookies"
description: "CR3 of the book creatures (D-0033): a Shop in the Creatures tab where cookies buy food, outfits and accessories her pets wear, home upgrades and habitats for the den, toys, eggs of every rarity at D-0033's prices, and extra decorations that join the 3D reading room's room panel; purchases are choices saved with her account (D-0034)."
status: Open
size: full
depends_on: [T-0030]
decisions: [D-0013, D-0014, D-0020, D-0022, D-0033, D-0034]
raised_on: 2026-11-22
done_on: ""
result: []
---

# Goal

1. **Shop** in the Creatures tab, in sections, each item with a picture, a name and its price in 🍪;
   Buy is disabled with the missing amount shown when the balance is too low. Bought items show as
   owned. Six sections:
   - **Food**: snack, treat, feast (more growth per cookie for the bigger ones).
   - **Outfits & accessories**: hats, scarves, glasses, bows, a little backpack (about 12 items); she
     dresses each pet (one item per slot: head, face, neck, back), shown everywhere the pet is.
   - **Home**: cushions, a lamp, a mini bookcase, a rug, a window with weather (follows the time of
     day; rain/sun/snow by month, no weather service).
   - **Habitats**: den backgrounds forest, ice, beach, castle library (+ the plain den she has).
   - **Toys**: ball, yarn, slide (used in T-0032 for play and tricks; here they stand in the den).
   - **Eggs**: one per tier at D-0033's prices; a bought egg waits to hatch like a milestone egg
     (id `shop:<purchase id>`).
   - **Room decorations**: three or four new decorations for the 3D reading room (e.g. a creature
     plush, a tiny egg display, a pennant garland); once bought they join the 🎨 room panel's
     decorations list on every device, shown or hidden per device like the others (D-0022).
2. **Prices** in `src/lib/creatures/numbers.ts`, balanced against D-0033's earning: food 5–25,
   accessories 20–60, home 30–80, toys 25–50, habitats 80–150, decorations 60–120, eggs per D-0033.
3. **Saved choices** (D-0034): `buy` (item id and the price paid), `wear` (key `pet:slot`), `place`
   (key `home:slot`), `habitat`. Spent = the sum of `buy` prices; prices changed later never change
   what she paid.

# Done when

1. `pnpm test` passes and includes: the balance after buying (earned − paid), buying refused
   when the balance is too low or below zero, an item bought once (no double buy from two quick
   taps; bought twice only for food and eggs), wearing one item per slot and only owned items, a
   bought egg hatching like a milestone egg of its tier, a bought decoration in the room panel's
   list, a price change not changing an earlier purchase.
2. On `pnpm run dev` with demo data: buying in each section, dressing a pet (seen in the tab and on
   the dashboard), placing home items, switching habitats, a bought decoration showing in the 3D
   room; 390 × 844 and 1280 × 800, both wallpapers; screenshots in `docs/tasks/T-0031-screens/`.
3. Phone performance: the den with all home items, a habitat and a dressed pet stays within the
   budget the UX designer sets in *Design* (draw calls, noted in *Test*).
4. `pnpm run build` and `pnpm exec harness check` pass. **Hanna** confirms the shop on the live site.

# Notes

- **Modelling:** every shop item (outfits, home items, habitats, toys, decorations) is built by the
  normal agents (default model), procedural three.js like `src/components/Decorations.tsx`.
  Outfits sit on the anchor points of Fable's base models (`hat`, `face`, `neck`, `back`, T-0027)
  and scale with the stage. **No Fable agent** in this task (D-0033 §14).
- Room decorations: `src/lib/room.ts` (`DecorKind`, `cleanRoom`, the per-device room settings) and
  `src/components/RoomPanel.tsx`; a bought decoration is unlocked by the choices log, its on/off and
  order stay per device. Older saved rooms must still load.
- Weather in the window comes from the date and time only (no outside service).

# Design

For the UX designer, before the build: the shop (sections, item cards, prices, owned, not enough
cookies), dressing a pet, the den with home items and habitats, and the new room decorations, phone
and computer, both wallpapers; a draw-call budget for the den on a phone.

# Test

# Log

- 2026-11-22 architect: wrote CR3 from Hanna's brief (food, outfits, home, eggs, toys, habitats,
  room decorations); all item models on normal agents from Fable's anchor points. Size: full.
