---
id: T-0040
title: "Add travel badges: countries 5/10/25/50, a postcard per continent and a World tour, imaginary lands 3/10, and a secret Home sweet home for a book set in the Netherlands"
description: "src/lib/badges.ts gets travel badges counted from the places of her finished books exactly as the world map counts them (D-0037): Passport stamped, Frequent flyer, World traveller and Around the world for 5/10/25/50 countries, a Postcard from each of six continents plus World tour for all six, Dreamwalker and Realm hopper for 3/10 imaginary lands, and the secret Home sweet home with a riddle; each dated by the first finish of the book that earned it."
status: Doing
size: small
depends_on: [T-0015, T-0018]
decisions: [D-0014, D-0023, D-0026, D-0037]
raised_on: 2026-11-23
done_on: ""
result: []
---

# Goal

Part 2 of "a better world map", agreed by Hanna in a feature chat on 2026-11-22 (tapping and
zooming the map, part 1, is T-0039; the two can be built in either order). Requester: Hanna.
Night mode: she wasn't asked anything; the team's picks are under *Choices made by the team*.

The **Milestones & badges** block (`BadgesCard` in `src/components/NewBlocks.tsx`) shows the
badges `badges()` in `src/lib/badges.ts` works out from her books. This task adds travel badges,
counted by D-0037: the finished books the world map counts, their places read with
`placesOf(places, MAP_COUNTRY_SET)`, each badge dated by the **first finish day of the book that
earned it**. The world map block itself doesn't change and keeps showing no numbers (D-0026);
progress like "3 of 5" shows only in the badges block, as for every step badge.

## The badges

"Globetrotter" (genres-10), "Explorer" (genres-5) and "Storyteller" (journal-50) already exist,
and the "better badges" task queued after this one will add Spooky season, Summer reader, Winter warmer, Loyal
reader, Superfan, Wide reader, Mix it up, Library lover and E-reader; none of the names below
clash with them or with any existing badge.

| id | icon | name | how (the text on the badge) | kind |
| --- | --- | --- | --- | --- |
| `countries-5` | 🛂 | Passport stamped | Finish books set in 5 countries | step, progress |
| `countries-10` | ✈️ | Frequent flyer | Finish books set in 10 countries | step, progress |
| `countries-25` | 🧳 | World traveller | Finish books set in 25 countries | step, progress |
| `countries-50` | 🌐 | Around the world | Finish books set in 50 countries | step, progress |
| `continent-europe` | 🗼 | Postcard from Europe | Finish a book set in Europe | one-off |
| `continent-asia` | 🏯 | Postcard from Asia | Finish a book set in Asia | one-off |
| `continent-africa` | 🦒 | Postcard from Africa | Finish a book set in Africa | one-off |
| `continent-north-america` | 🗽 | Postcard from North America | Finish a book set in North America | one-off |
| `continent-south-america` | 🦜 | Postcard from South America | Finish a book set in South America | one-off |
| `continent-oceania` | 🦘 | Postcard from Oceania | Finish a book set in Oceania | one-off |
| `continents-6` | 🌏 | World tour | Finish books set on all 6 continents | step, progress |
| `lands-3` | 🦄 | Dreamwalker | Finish books set in 3 imaginary lands | step, progress |
| `lands-10` | 🐉 | Realm hopper | Finish books set in 10 imaginary lands | step, progress |
| `home-sweet-home` | 🌷 | Home sweet home | Finish a book set in the Netherlands | **secret**, riddle |

- **Riddle** for `home-sweet-home` (in `RIDDLES`, a hint, never the answer): "No passport needed:
  a story set among the tulips, windmills and canals." Like the other secrets it is hidden until
  earned and shows its riddle on its locked tile.
- **Where they go:** the visible travel badges right after the variety badges (Bilingual,
  Polyglot) and before the ratings; Home sweet home with the other secret badges, at the end.
- **How they count** (D-0037), using the existing helpers (`firstsOf`, `reachedOn`, `once`):
  - books: finished like `worldMap` (status `read` or `timesRead > 0`), `places !== undefined`;
    each book's day is its first finish (`[...finished].sort()[0]`), undated books as today;
  - countries: the first time each country shows up, in order of first finish;
  - continents: the countries' continents, from a new `src/lib/continents.ts`
    (`continentsOf(country): Continent[]`) covering every name in `MAP_COUNTRIES`;
  - imaginary lands: the first time each `landKey` shows up;
  - Netherlands: the first finish of a book whose countries include `Netherlands`
    (Amsterdam, Holland and the like already resolve to it in `placesOf`).

## Continents (D-0037)

Natural Earth's continent for each map country, with the names that are easy to get wrong spelled
out here so nobody has to guess:

- **Both continents:** Russia (Europe, Asia), Turkey (Europe, Asia), Kazakhstan (Europe, Asia),
  Egypt (Africa, Asia).
- **None:** Fr. S. Antarctic Lands.
- **Asia:** Cyprus, N. Cyprus, Georgia, Armenia, Azerbaijan, Israel, Palestine, Indonesia,
  Timor-Leste, Taiwan.
- **Europe:** Iceland, Kosovo, Macedonia, Bosnia and Herz.
- **Africa:** Madagascar, W. Sahara, Somaliland, eSwatini.
- **North America:** Greenland, the Central American countries, Cuba, Haiti, Dominican Rep.,
  Jamaica, Bahamas, Puerto Rico, Trinidad and Tobago.
- **South America:** Falkland Is., Guyana, Suriname.
- **Oceania:** Australia, New Zealand, Papua New Guinea, New Caledonia, Fiji, Vanuatu, Solomon Is.

# Done when

- **`src/lib/continents.test.ts`:** every name in `MAP_COUNTRIES` has one continent, except the
  four above with two and Fr. S. Antarctic Lands with none; each of the six continents has at
  least one country; spot checks: Netherlands → Europe, Japan → Asia, Kenya → Africa, Greenland →
  North America, Brazil → South America, Fiji → Oceania, Russia → Europe and Asia.
- **`src/lib/badges.test.ts`** (extend it):
  - all 14 travel badges are present with the ids, icons and names in the table; **every badge
    name and every id in `badges()` is unique** (a new test; it would have caught a second
    "Globetrotter");
  - books in 5 countries earn `countries-5` **on the first finish day of the book that brought
    the fifth country**; with 4, it isn't earned and shows progress 4 of 5; a book set in two
    countries counts both; a book read twice counts once; a want-to-read book with places
    doesn't count; a book whose places aren't known yet (`places` undefined) doesn't count;
  - a book set in Russia earns both Postcard from Europe and Postcard from Asia on its first
    finish; books on all six continents earn World tour on the day of the sixth, and five
    continents show progress 5 of 6;
  - "Narnia" and "narnia" on two books count as one land; 3 lands earn Dreamwalker on the third
    land's day; Hogwarts via "Hogwarts School of Witchcraft and Wizardry" counts as Hogwarts;
  - a finished book set in "Amsterdam (Netherlands)" earns the secret `home-sweet-home` on its
    first finish day; it is `secret` with the riddle above while locked; the number of secret
    badges goes from 11 to **12** (update the existing count);
  - a place Hanna set herself (`places: ['Netherlands']`, D-0023) counts the same as Open
    Library's.
- **The block, by eye** (no new screenshots script needed; the UX designer reviews): at 390 × 844
  and 1280 × 800, lavender and midnight, on a local dev server with no backend (never a production
  `POCKETBASE_URL`, G-0019) and demo books with places, the Milestones & badges block shows the
  new tiles with their icons, names and "how" text, earned ones with their day, locked step ones
  with progress, and Home sweet home as a hidden tile with its riddle until earned. Screenshots
  in `docs/tasks/T-0040-screens/` (`badges-390-*`, `badges-1280-lavender`). The world map block
  shows no numbers, as before.
- `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm run build` and `pnpm exec harness check` pass;
  `src/routeTree.gen.ts` is not committed.

# Notes

- **Read first:** D-0037 (how they count), D-0026 (no numbers in the map block), T-0015
  (`placesOf`, lands, `landKey`), T-0018 (`worldMap`), the existing step and secret badges in
  `src/lib/badges.ts` and `RIDDLES`.
- **Files:** `src/lib/badges.ts`, `src/lib/badges.test.ts`, the new `src/lib/continents.ts` +
  `continents.test.ts`. Reuse `placesOf`, `landKey` and `MAP_COUNTRY_SET`; if the developer wants
  to share `worldMap`'s "finished" rule, exporting it from `places.ts` is fine. `BadgesCard` should
  need no change.
- **Group 1** (guardrails): logic in `src/lib/` with tests, nothing saved, no code-owned path.
- **Size: small.** New badges in the existing block and existing data: no new screen, collection,
  route or service. The UX designer writes no design before the build and reviews the block after.
- **The "better badges" task** (the medal grid, bronze/silver/gold rims, more badges) comes after
  this one and will restyle these tiles with the rest; nothing here needs to wait for it.
- **Not doing:** numbers in the map block; badges per country or per land; a celebration when one
  unlocks.

## Choices made by the team

Hanna wasn't asked anything (night mode). The architect took these:

1. **The names** in the table (Passport stamped, Frequent flyer, World traveller, Around the world;
   Postcard from …; World tour; Dreamwalker, Realm hopper; Home sweet home), since Globetrotter and
   Storyteller are taken. Dreamwalker was already the brief's name for the lands.
2. **A badge for each continent plus World tour for all six**, rather than only one "every
   continent" badge: something to earn early (Europe will come first) and a goal at the end.
3. **Russia, Turkey, Kazakhstan and Egypt count for both their continents**; the rest follow Natural
   Earth (where the map's names come from); Greenland is North America; the French Southern and
   Antarctic Lands count for none (D-0037).
4. **The date is the book's first finish**, so a re-read later doesn't move a badge.
5. **The riddle**: "No passport needed: a story set among the tulips, windmills and canals."

## Questions to re-ask Hanna in the morning

1. "Are these badge names all right: Passport stamped (5 countries), Frequent flyer (10), World
   traveller (25), Around the world (50), Postcard from Europe / Asia / … , World tour (all six
   continents), Dreamwalker (3 imaginary lands), Realm hopper (10)?"
2. "There's a badge for each continent and one more, World tour, for all six. Or would you rather
   have only the one for all six?"
3. "Russia, Turkey, Kazakhstan and Egypt count for both continents they lie in, so a book set in
   Russia gives you Europe and Asia. All right?"

# Design

No design before the build (small task). The UX designer reviews the block after.

## Build notes (developer)

- `src/lib/continents.ts`: `Continent`, `CONTINENTS` (the six, in table order) and
  `continentsOf(country)`. One list per continent; Russia, Turkey and Kazakhstan are in both
  Europe and Asia, Egypt in Asia and Africa, Fr. S. Antarctic Lands in none. An unknown name
  gives `[]`.
- `src/lib/places.ts`: `worldMap`'s `finished` rule is now exported (no change to it), so
  the badges count exactly the books the map counts.
- `src/lib/badges.ts`: after Bilingual and Polyglot, the travel block builds one *trip* per
  finished book with `places` known: its first finish day, its countries
  (`placesOf(places, MAP_COUNTRY_SET)`), their continents and its lands by `landKey`. Then
  `firstsOf` + `reachedOn` for countries 5/10/25/50, World tour (6) and lands 3/10. `once` for
  each postcard and for the secret `home-sweet-home`, which comes after Rainbow, with its riddle
  in `RIDDLES`. `BadgesCard` didn't change.
- **Undated books:** the Notes say "undated books as today", but D-0037 says a badge such a
  book completes "has no day, as other badges do today". I followed the decision: an undated
  book's day stays empty, and the existing helpers sort it first, as they do for every other
  badge. So a badge it completes shows "Unlocked" with no day and never counts as new. For the
  architect, in case "as today" meant something else.
- Screenshots: `docs/tasks/T-0040-screens/screens.mjs` puts a demo shelf in localStorage on a
  dev server with no backend (port 3154): books in France, Japan, Kenya, Brazil, Russia + Peru
  and Canada, plus Narnia and Hogwarts. It shoots the whole block with Home sweet home's riddle
  open: `badges-390-lavender`, `badges-390-midnight`, `badges-1280-lavender`. A fourth shot,
  `badges-390-lavender-home`, adds a book set in Amsterdam, and the secret shows as earned. The
  block is taller than the screen and the app scrolls inside itself, so the script makes the
  window as tall as the page before each shot; the width, and with it the layout, stays the same.

# Test

To be written by the tester.

# Log

- 2026-11-23 architect: wrote the task from Hanna's agreed brief ("a better world map", part 3,
  feature chat 2026-11-22); the map's tap and zoom are T-0039. Recorded D-0037 (count like the
  map, first-finish day, the continent list). Follows D-0014, D-0023, D-0026, D-0037. Night mode:
  five choices under *Choices made by the team*, three questions for the morning. Size: **small**.
  Handed to the **developer**; the UX designer reviews the badges block after.
- 2026-11-23 developer: built the 14 travel badges (D-0037) in `src/lib/badges.ts`: Passport
  stamped / Frequent flyer / World traveller / Around the world, a Postcard for each of the six
  continents, World tour, Dreamwalker, Realm hopper, and the secret Home sweet home with its
  riddle. Also the new `src/lib/continents.ts` and `worldMap`'s `finished` rule exported from
  `places.ts`. Tests: `continents.test.ts` (new); `badges.test.ts` gets the unique-name and
  unique-id test, the table, the order, the counting rules, the continents, the lands and the
  secret, and the secret count goes from 11 to 12. One open point for the architect: undated
  books follow D-0037 (no day), not "as today"; see *Build notes*. Check output:
  `vitest run badges continents places`: 3 files, 31 tests passed. `pnpm test`: 97 files passed,
  1 skipped; 1032 tests passed, 9 skipped. `pnpm exec tsc --noEmit`: no errors.
  `pnpm run build`: built. `pnpm exec harness check`: tasks, decisions, engineers and generated
  files all ✓. Four screenshots, no page errors, each with the expected tiles. Passport stamped
  is unlocked on the Moscow book's day (Russia and Peru were countries 5 and 6), with five
  postcards, World tour 5 / 6, Frequent flyer 7 / 10 and Dreamwalker 2 / 3. Home sweet home is
  a hidden tile showing its riddle, and earned in the Amsterdam shot. The world map block was
  not touched. Handed to the **UX designer** for the block review.
