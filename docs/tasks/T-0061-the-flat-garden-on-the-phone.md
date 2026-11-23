---
id: T-0061
title: "Give the garden its own 🌱 tab with the flat drawn top-down garden"
description: "A Garden tab next to Creatures, with the flat top-down garden drawn in SVG for phones and for any device that can't draw 3D: year gardens, beds, every plant kind, the plant list for a screen reader and the empty garden."
status: Done
size: full
depends_on: [T-0060]
decisions: [D-0013, D-0014, D-0020, D-0050, D-0051]
raised_on: 2026-11-23
done_on: 2026-11-23
result: []
---

# Goal

The 🌱 **Garden** tab, next to Creatures, and the view her phone gets: a flat, drawn, top-down
garden in inline SVG (D-0051 §2), showing the garden T-0060 works out — the year's beds, every
plant in its spot at its stage and size, and the garden items. It is also what a computer without
WebGL gets, so it doubles as the fallback.

# Done when

- `?view=garden` opens the tab, and the tab button sits next to Creatures in the header.
- `pnpm test` passes with the new tests: the tab renders a plant for every finished book, no plant
  for a did-not-finish book, one plant for a re-read, a night-blooming mark for a sleep read, the
  empty-garden message with no finished books, and a drawing for every kind in the catalogue.
- Screenshots at 360 and 390 px wide show the garden with no sideways scrolling and no overlap.
- The flat view uses no WebGL (no `<canvas>` in the phone view).

# Notes

- The header's tabs are `VIEWS` in `src/routes/index.tsx`; `validateSearch` must accept
  `view=garden`.
- The look follows D-0020 (gold on lavender) and the existing `.dash-card` / page layout of the
  Creatures and Calendar tabs.
- No hint texts (D-0014); the empty-garden message is allowed.

# Design

## 1. The tab

A sixth page tab, `🌱 Garden`, after `🐾 Creatures`, reached at `/?view=garden`. The page is laid
out like the Creatures tab: `.dashboard > .garden-page`, a `challenges-head` header with
`<h1>Garden</h1>` and, on the right, the season chip (`🌸 Spring`, `☀️ Summer`, `🍂 Autumn`,
`❄️ Winter`) and the plant count (`114 plants`).

## 2. Choosing the year

Under the header, a row of chips: this year first, then each earlier reading year, then `Earlier`
for finishes with no day (only when there are any). The chip for the garden shown has
`aria-current="true"`. The chips are a `role="tablist"`-free plain button group — one tap, no
menu — and the chosen year stays in component state (not in the URL: a year is not worth a
history entry).

## 3. The garden itself

Top-down, drawn:

- The **ground** of the year garden: a rounded lavender-tinted rectangle with a soft grass
  texture made of two flat tones, no gradients on the phone.
- A **bed** is a rounded earth-brown rectangle with 12 spots in 4 columns × 3 rows. Beds are
  stacked down the page with the path between them. Each bed has a small label (`Bed 1`), which is
  also the screen-reader grouping.
- A **spot** is 56 × 56 at 390 px wide, 52 at 360; empty spots show a faint dug circle, so she can
  see where a plant may go.
- A **plant** is drawn from its family: `tree` (a trunk and a crown), `shrub` (a round mass with
  leaf bumps), `flower` (a stem with petals), `fern` (fronds from a centre). Its kind sets the
  colours, the crown shape, thorns, berries and flower shape; its growth sets the size (a sprout is
  a third of full size, with two small leaves), and re-reads add a size step and an extra flower.
  A night-blooming plant (a sleep read) has pale moon-white flowers and a soft glow.
- **Garden items** are drawn in the item strip along the bottom of the year garden: path, bench,
  birdbath, pond, lanterns, greenhouse (T-0063).
- **Visitors** (T-0063) drift over the garden as small marks.

## 4. States

- **Empty** (no finished books): the beds are not drawn; one line — `Finish a book and the first
  plant appears.` — in the page's empty style, which D-0014 allows.
- **A year with no plants** (she picked a year she finished nothing in): `Nothing finished in
  2024.`
- **Long titles** never widen the garden: a plant's title lives in its label and its tooltip, both
  of which wrap and clip at two lines.
- **Offline / signed out**: the garden is worked out on the device, so it looks the same; nothing
  to say.
- **Loading**: the shelf's own loading state covers it; the garden renders once `loaded`.

## 5. Keyboard and screen reader

- The year chips are buttons in tab order.
- Every plant is a `<button>` with the label `<Kind> · <title> · <stage>` (`Oak · The Name of the
  Wind · grown`), plus ` · 🌙 night-blooming` for a sleep read and ` · read 2 times` for a
  re-read. Pressing it starts moving it (T-0063).
- Every empty spot is a `<button>` labelled `Empty spot, bed 2, spot 5`.
- Each bed is a `<section aria-label="Bed 1 of 3">`, so a screen reader can step bed by bed.
- The whole garden is also described in one visually hidden sentence, like the den's:
  `Your 2026 garden: 114 plants in 10 beds, 12 in bloom, with a bench and a pond.`
- A `role="status"` line announces every change (T-0063's wording).

## 6. Review (after the build)

Reviewed on 2026-11-23 against this design, on the screenshots in `T-0061-screens/` (360, 390) and
the dev server:

- Tab, header, season chip, year chips, beds, spots, plant families, sprouts, night-blooming mark,
  item strip and the empty-garden line are all as designed. **Matches.**
- Differences, all accepted:
  1. The bed's number is only in the screen-reader group label (`Bed 1 of 10`); a printed `Bed 1`
     over every bed pushed the first row of spots down at 360 px and said nothing the garden
     didn't.
  2. The plants are drawn **standing in** their spot rather than seen from straight above — a tree
     from directly above is a circle, and the garden then reads as a plan, not a garden. The beds
     and the layout are top-down, as asked.
  3. The garden sentence names at most three garden items; ten of them read as a list.
  4. Two sizes were turned down after the first screenshots, because a grown oak swallowed the
     spot next to it: a plant is at most 1.5 units tall and a crown at most about one spot wide.
- Verdict: **passes**, nothing to fix before the tester. Screenshots: `T-0061-screens/garden-360.jpg`,
  `garden-390.jpg`; picked up, `T-0063-screens/picked-360.jpg`, `picked-390.jpg`.

# Test

See *Test* in T-0065.

# Log

- 2026-11-23 architect: written with T-0060; size full.
- 2026-11-23 ux-designer: designed the tab, the flat garden and its states.
- 2026-11-23 developer: built `GardenPage`, `GardenFlat` and the tab; tests and screenshots green.
- 2026-11-23 ux-designer: reviewed: passes (two accepted differences, written above).
- 2026-11-23 tester: passed; see T-0065.
