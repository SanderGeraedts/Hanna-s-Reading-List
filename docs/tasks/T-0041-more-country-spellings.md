---
id: T-0041
title: "Count \"The Netherlands\", \"Nederland\" and other common spellings of a country on the world map and the travel badges"
description: "placesOf in src/lib/places.ts ignores a leading \"the\" and accents and knows the native names of a few countries (Nederland, Deutschland, España, …) and \"U.S.A.\", so a book set in \"The Netherlands\" or \"Nederland\" lights up the Netherlands on the map and unlocks Home sweet home."
status: Doing
size: small
depends_on: [T-0015, T-0040]
decisions: [D-0023, D-0026, D-0037]
raised_on: 2026-11-23
done_on: ""
result: []
---

# Goal

The T-0040 tester found that a book whose place is written "The Netherlands" or "Nederland"
counts as no country: the world map doesn't light up the Netherlands and the secret **Home sweet
home** badge stays locked. The same goes for other common spellings. Both the map (`worldMap`)
and the travel badges (`badges()`, D-0037) read places through `placesOf(places,
MAP_COUNTRY_SET)` in `src/lib/places.ts`, so the fix lives there only and both count the same
way automatically.

`placesOf` must also recognise, for the country part of a place (not for imaginary lands):

1. **A leading "the"**, in any capitals: "The Netherlands", "the UK", "The United States",
   "The Czech Republic", "The Bahamas".
2. **Accents ignored**, on both sides: "België" = "Belgie", "México" = "Mexico", "Éire" = "Eire".
3. **New aliases** (lower case, without accents), to the map's own country names:

   | written | map country |
   | --- | --- |
   | nederland | Netherlands |
   | deutschland | Germany |
   | belgie (België) | Belgium |
   | espana (España) | Spain |
   | italia | Italy |
   | osterreich (Österreich), oesterreich | Austria |
   | schweiz, suisse, svizzera | Switzerland |
   | danmark | Denmark |
   | norge | Norway |
   | sverige | Sweden |
   | suomi | Finland |
   | polska | Poland |
   | cesko (Česko) | Czechia |
   | ελλαδα (Ελλάδα) | Greece |
   | eire (Éire) | Ireland |
   | brasil | Brazil |
   | u.s.a. | United States of America |

   "México" needs no alias (it is "Mexico" once accents are ignored); "United States of America"
   is already the map's name and "Great Britain" already an alias: they get a test only.

Nothing else changes: no new `Book` field, no change to how places are saved (D-0023), and the
world map block still shows no numbers (D-0026).

# Done when

- `pnpm exec vitest run src/lib/places.test.ts src/lib/badges.test.ts src/lib/setIn.test.ts`
  passes, with new tests in `places.test.ts` that:
  - map every spelling in the table above, and "The Netherlands", "the Netherlands", "the UK",
    "The United States", "United States of America", "U.S.A.", "Great Britain" and "México", to
    its map country;
  - show that a leading "the" is stripped only as a whole word ("Thessaloniki" is not touched)
    and that imaginary lands are unchanged;
  - show that the same book with "The Netherlands" and "Nederland" counts the Netherlands once;
  - show that the **Home sweet home** badge is earned for a finished book whose places are
    `["The Netherlands"]`, and for one with `["Nederland"]`.
- `pnpm exec tsc --noEmit` shows no errors and `pnpm exec harness check` passes.
- What Hanna sees: a finished book set in "The Netherlands" or "Nederland" shows its cover on the
  Netherlands on the world map, and Home sweet home unlocks on its first finish day.

# Notes

- Code: `src/lib/places.ts` (`ALIASES`, the `country` lookup inside `placesOf`) and its test
  `src/lib/places.test.ts`. Read T-0015 (places), T-0040 (travel badges) and D-0037.
- Keep the change small: T-0039 (world map tap & zoom, on another branch) may touch
  `places.ts` too. Don't reorder or reformat the existing aliases; add the new ones in one block.
- `setIn.ts` (the book panel's "Set in") uses `placesOf` too, so typing "Nederland" there will
  now be stored as a country ("Nederland") instead of a made-up place. That is wanted.
- Out of scope: a place that was already saved as a made-up place, like "Nederland (Imaginary
  place)" typed before this fix, stays an imaginary land (D-0023: her list is hers). If Hanna
  has such a book she can remove the chip and add the country again.
- Not added: other languages' names beyond the list above; "The Hague" and other cities.
- No new decision: these spellings are a reversible detail of D-0037's "the same land in other
  spellings once".

# Design

Nothing new to design: no screen changes; existing map countries and badges light up for more
spellings.

## Build notes (developer)

- `src/lib/places.ts`: the `country` lookup in `placesOf` now folds both the place and the map's
  names with a new `fold` (Unicode NFD, marks removed, lower case) and strips a leading
  `the ` (whole word, `/^the\s+/`) before looking up the map's name and then `ALIASES`. The 20
  new aliases are one block at the end of `ALIASES`, keys without accents; existing aliases are
  untouched. The imaginary-land path is not changed.
- `src/lib/places.test.ts`: a new `more spellings of a country (T-0041)` block with 5 tests
  (every spelling in the table and the extra checks, "the" only as a whole word, imaginary lands
  unchanged, two spellings counted once on the map, Home sweet home earned for "The
  Netherlands" and for "Nederland" via `badges()`). All 4 tests that touch the change fail on
  the old `places.ts` (checked by running them against `HEAD`'s file).
- Nothing else touched; `setIn.test.ts` still passes (typing "Nederland" in Set in now becomes a
  country, as the task's *Notes* say).

# Test

# Log

- 2026-11-23 architect: wrote the task from the T-0040 tester's follow-up (aliases for "The
  Netherlands" and "Nederland"), widened to a leading "the", accents and the native names of
  common countries. Follows D-0023, D-0026, D-0037; no new decision. Night mode: Hanna wasn't
  asked. Size: **small**. Handed to the **developer**.
- 2026-11-23 developer: built it in `src/lib/places.ts` (leading "the" and accents ignored in
  the country lookup, 20 new aliases) with 5 new tests in `places.test.ts`, including Home sweet
  home for "The Netherlands" and "Nederland". Check output: `vitest run places badges setIn
  continents`: 4 files, 74 tests passed (the 4 new tests on the change fail without it).
  `pnpm exec tsc --noEmit`: no errors. `pnpm exec harness check`: tasks, decisions, engineers
  and generated files all ✓. Nothing a user sees changes in layout, so handed to the **tester**.
