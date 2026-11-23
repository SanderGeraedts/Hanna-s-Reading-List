---
id: T-0064
title: "Give the garden real seasons, with evergreens and winter flowers keeping it alive"
description: "The garden follows the real season on the device: blossom in spring, green in summer, golden leaves in autumn, bare branches and snow in winter, while evergreens, winter flowers and the night-blooming sleep reads keep it from ever looking dead."
status: Done
size: full
depends_on: [T-0060, T-0061, T-0062]
decisions: [D-0050, D-0051]
raised_on: 2026-11-23
done_on: 2026-11-23
result: []
---

# Goal

Real seasons, in both views, from the device's own date — so the garden she opens in December is a
winter garden. Nothing dies: evergreens (pine, holly, moss), winter flowers (snowdrops, holly
berries) and the night-blooming plants of her sleep reads carry the winter.

# Done when

`pnpm test` passes with the new tests:

- `seasonOf` gives spring for 1 March and 31 May, summer for 1 June and 31 August, autumn for 1
  September and 30 November, winter for 1 December, 1 January and 28 February;
- 29 February 2028 (a leap year) is winter, and 2027-02-29 — a day that does not exist — is
  rejected rather than guessed;
- a pine, a holly and a moss cushion are green in winter, a snowdrop flowers in winter, an oak is
  bare in winter and gold in autumn, and a night-blooming plant flowers in every season;
- every kind in the catalogue has a look for all four seasons in both views.

# Notes

- Days are the `yyyy-mm-dd` strings the rest of the app uses (`src/lib/creatures/days.ts`), so no
  time zone is involved; the season comes from the month and the day only.
- The season chip in the header (T-0061 §1) names the season.

# Design

| Season | Trees and shrubs | Flowers | Ground |
| --- | --- | --- | --- |
| 🌸 Spring (Mar–May) | fresh green, blossom dots on crowns | in bloom | bright green, a few petals |
| ☀️ Summer (Jun–Aug) | full deep green | in bloom | deep green |
| 🍂 Autumn (Sep–Nov) | gold, amber and rust crowns, a few leaves on the bed | sunflowers and late flowers only | green-gold, fallen leaves |
| ❄️ Winter (Dec–Feb) | deciduous bare (branches only), evergreens green, holly berries red | snowdrops flowering, everything else resting | snow on the beds and the path |

- A **sprout** keeps its two small leaves in every season; nothing a sprout does looks dead.
- A **night-blooming** plant keeps its pale flowers in every season, and in winter it is the one
  thing glowing.
- The season affects only how a plant is **drawn**: no growth, size or count changes with the
  season, so nothing is ever lost in winter.
- The header chip reads `🌸 Spring`, `☀️ Summer`, `🍂 Autumn`, `❄️ Winter`; the hidden sentence
  starts `Your 2026 garden in winter: …`.

## Review (after the build)

Reviewed on 2026-11-23 against this table, with the clock moved to one day in each season
(screenshots `T-0064-screens/`): spring blossom, summer green, autumn gold and winter snow with
green evergreens, red berries, flowering snowdrops and a glowing moonflower. **Matches. Passes.**

# Test

See *Test* in T-0065.

# Log

- 2026-11-23 architect: written with T-0060; size full.
- 2026-11-23 ux-designer: designed the four seasons.
- 2026-11-23 developer: built `seasons.ts` and the season dressing in both views; tests green.
- 2026-11-23 ux-designer: reviewed: passes.
- 2026-11-23 tester: passed; see T-0065.
