---
id: T-0030
title: "Give her free eggs at reading milestones and an album of all 20 creatures with their rarity, shinies and a choice for duplicates"
description: "CR2 of the book creatures (D-0033): milestone eggs that hatch a fixed surprise of the right rarity, an album card per creature (silhouette until found) with tier and IUCN Red List label and source, shiny variants, and keep / cookies / power-up for duplicates with an extra confirmation for a shiny; several pets, one of them current."
status: Open
size: full
depends_on: [T-0029]
decisions: [D-0013, D-0014, D-0020, D-0022, D-0033, D-0034]
raised_on: 2026-11-22
done_on: ""
result: []
---

# Goal

1. **Milestone eggs** (`src/lib/creatures/eggs.ts`), worked out from her books from the start day,
   each with a stable id and a tier, exactly D-0033 §6: every 5th finished book (25th rare, 50th
   legendary), every 10 hours (100th hour rare), streaks of 7 / 30 / 100 days, a finished series, a
   challenge done (own challenges and the monthly challenge), a full bingo card. A new egg waits in
   Waiting for you and in the Creatures tab; the dashboard block's "next unlock" names the nearest
   milestone.
2. **Hatching** a surprise of the egg's tier, fixed by the egg id; shiny by the second hash (1 in 20,
   1 in 5 for a duplicate), only for the 10 species with a shiny (D-0033 §5, §7).
3. **Shiny looks**: a shiny colour palette per shiny species plus a soft sparkle, built on the
   normal model from Fable's base models (no new Fable work).
4. **Album** in the Creatures tab: a card per species in list order, grouped by tier; a found one
   shows the creature, name, tier and the Red List label in words with a small source line ("IUCN
   Red List, 2024"); an unknown one is a dark silhouette with only its tier. A ✨ mark on a card when
   she has its shiny. "N of 20 found". Each species counts once.
5. **Duplicates** (D-0033 §8): a hatch of a species she has asks, in the tab (not a pop-up): Keep as
   a new pet / Turn into N 🍪 / Power up <name> (+3 levels). A shiny is kept by default; turning a
   shiny into cookies or a power-up needs the "This is a shiny!" warning and a press-and-hold to
   confirm (D-0033 §9). There is no release or delete.
6. **Several pets**: a pet list in the tab; she picks the current one (shown on the dashboard).

# Done when

1. `pnpm test` passes and includes: each milestone gives its egg once, on the right day, with the
   right tier, and nothing before the start; the hatch of an egg id is the same every time and of its
   tier; shiny only for shiny species and more often for duplicates (statistical check over many egg
   ids); a duplicate choice of cookies adds half the tier price and a power-up adds 3 levels;
   **shiny safety**: a shiny can't become cookies or a power-up without the confirm step (the
   function refuses without it, and the component test shows the hold-to-confirm), a shiny hatch is
   kept when nothing is chosen, no action removes a pet.
2. On `pnpm run dev` with demo data reaching a few milestones: eggs wait, hatch, the album shows
   found cards with labels and silhouettes for the rest, a duplicate offers the three choices, a
   shiny duplicate needs the hold; 390 × 844 and 1280 × 800, both wallpapers; screenshots in
   `docs/tasks/T-0030-screens/`.
3. The developer has re-checked the Red List categories in T-0027's table on iucnredlist.org (or
   notes there was no change since T-0027) and noted the date in *Log*.
4. `pnpm run build` and `pnpm exec harness check` pass. **Hanna** confirms the album on the live
   site.

# Notes

- Builds on T-0029 (cookies, choices log, Creatures tab) and T-0027 (species list, base models).
- Choices saved: `hatch`, `choose` (keep / cookies / power-up, with the egg id), `name` for a new
  pet, the current pet as a `current` setting (D-0034). Hatch results themselves are never
  saved (derived, D-0033 §1).
- Finished series: `seriesProgress` in `src/lib/insights.ts`; challenges: `challengeBooks` in
  `src/lib/ownChallenges.ts` and `src/lib/monthChallenge.ts`; full bingo card: `src/lib/bingo.ts`.
- **Modelling:** shiny palettes and sparkles on the normal model from T-0027's files; no Fable
  agent.

# Design

For the UX designer, before the build: the album (cards, silhouettes, labels), the egg and hatch
lines, the duplicate choice and the shiny confirmation, phone and computer, both wallpapers.

# Test

# Log

- 2026-11-22 architect: wrote CR2 from Hanna's brief and D-0033 (milestones, tiers, shiny safety).
  Size: full.
