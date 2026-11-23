---
id: T-0041
title: "Count \"The Netherlands\", \"Nederland\" and other common spellings of a country on the world map and the travel badges"
description: "placesOf in src/lib/places.ts ignores a leading \"the\" and accents and knows the native names of a few countries (Nederland, Deutschland, España, …) and \"U.S.A.\", so a book set in \"The Netherlands\" or \"Nederland\" lights up the Netherlands on the map and unlocks Home sweet home."
status: Done
size: small
depends_on: [T-0015, T-0040]
decisions: [D-0023, D-0026, D-0037]
raised_on: 2026-11-23
done_on: 2026-11-23
result: ["https://github.com/SanderGeraedts/Hanna-s-Reading-List/pull/247"]
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

## Review after building (2026-11-23)

Nothing visual changes: the diff touches only `src/lib/places.ts` and its tests, no component,
style or text, so the world map block, the travel badges and the book panel look exactly as
before (and the map still shows no numbers, D-0026). What changes is which existing countries
and badges light up. "Set in" in the book panel (`SetInField.tsx`) saves the row she picks
from `placeSuggestions`; typing "Nederland" now ends that list with an add row of kind
*country* that saves "Nederland" (her spelling, as D-0023 wants), not "Nederland (Imaginary
place)", and its chip counts as the Netherlands; "the netherlands" saves "The Netherlands".
A made-up "The Shire" typed there still becomes "The shire (Imaginary place)". Checked
through the code and new tests in `setIn.test.ts`, not on the preview, since nothing on
screen changes. Small difference, not blocking: typing "cote d'ivoire" saves "Cote D'ivoire"
(counted as Côte d'Ivoire, but spelled by `countrySpelling`, not by the map's name). Verdict:
matches *Done when*.

# Test

**CI** (run 45095112033, attempt 1, PR #247): `checks / checks` pass (harness check ✓,
vitest 97 files passed, 1 skipped; 1047 tests passed, 9 skipped (the PocketBase-only
suite)); no retries in the log. The e2e jobs are skipped by design (the workflow's `e2e`
input is empty); Netlify deploy preview ready; its header/redirect/pages checks skipped as
on every PR.

**Locally**, after `pnpm install --frozen-lockfile`:

- `pnpm exec vitest run src/lib/places.test.ts src/lib/badges.test.ts src/lib/setIn.test.ts`
  (as written, before my tests): `Test Files 3 passed (3)`, `Tests 69 passed (69)`; run 5
  times more, 69/69 each time. With the tester's tests: `Tests 76 passed (76)`, 3 runs.
- `pnpm exec tsc --noEmit`: no output, no errors.
- `pnpm exec harness check`: `✓ tasks: 33 tasks, index in step`, `✓ decisions: 38 records,
  index complete, 3 overrules valid`, `✓ engineers: 2 listed`, `✓ generated files: current`.

**Tried to break it** (a probe through `placesOf`, `worldMap`, `badges()` and `placeKind`
for each place; the map and the badges agreed in every case):

- "the" inside names: "Thessaloniki", "Thailand", "Thenetherlands" untouched; "Netherlands
  Antilles" and "The Netherlands Antilles" are not the Netherlands; "The The Netherlands" is
  nothing (only one "the" is stripped). "The Hague" is still no country (out of scope).
- Capitals and spacing: "  tHe    nEtHeRlAnDs  ", "The" + non-breaking space + "Netherlands",
  a tab and newline around "Nederland", "NEDERLAND": all the Netherlands.
- Accents on map names: "Côte d'Ivoire", "Cote d'Ivoire", "COTE D'IVOIRE", a decomposed "ô",
  "the Côte d'Ivoire": all Côte d'Ivoire (Africa postcard). Bonus: "Reykjavík" now finds
  Iceland, "İtalia" Italy, "ΕΛΛΆΔΑ" Greece.
- Made-up lands with "The": "The Shire" alone is neither country nor land (as before), "The
  Shire (Imaginary place)" stays the land "The Shire", "The Narnia" stays Narnia, and
  "Deutschland (Imaginary place)" stays a made-up land (the imaginary path is untouched).
- Open Library places: "Amsterdam (Netherlands)", "Amsterdam (The Netherlands)", "Utrecht
  (Nederland)", "Leiden (Netherlands) -- Fiction", "Amsterdam, The Netherlands": all the
  Netherlands, with Europe and Home sweet home.
- Gaps found, small and outside the task's table, not blocking (possible follow-up): a curly
  apostrophe ("Côte d’Ivoire") and "U.S.A" or "USA." without the exact dots are still no
  country; typed "cote d'ivoire" in Set in is saved as "Cote D'ivoire" (it counts correctly).

**Tests added** for the gaps in coverage: `places.test.ts`, *more spellings of a country:
tester's checks (T-0041)* (6 tests: "the" inside names, capitals/spaces, accents on map
names, made-up "The …" lands, Open Library brackets and commas, and the map and the travel
badges lighting up the same countries); `setIn.test.ts`, one test that typing "Nederland",
"nederland", "the netherlands" or "België" saves a country and "the shire" a made-up place.
5 of them fail on `main`'s `places.ts` (checked by swapping the file in and back).

**Verdict: passed.**

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
  and generated files all ✓. Draft PR #247. Nothing a user sees changes in layout, so handed
  to the **tester**.
- 2026-11-23 ux-designer: reviewed: matches (nothing visual changes; "Nederland" in Set in is
  now saved as a country).
- 2026-11-23 tester: passed. CI green on the first attempt; Done-when check 69/69 (76/76 with
  7 tester tests added for "the" inside names, spacing, accents on map names, made-up "The …"
  lands, Open Library places, map and badges agreeing, and Set in). Small follow-up ideas:
  curly apostrophes, "U.S.A" without the last dot, the spelling of a typed "cote d'ivoire".
