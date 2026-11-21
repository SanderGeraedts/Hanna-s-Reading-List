---
id: T-0005
title: "Make the books that match a search stand out much more from the rest"
description: "#184: while searching, the matching books light up and the rest dim; make the difference between the two clearly bigger."
status: Open
depends_on: [T-0001]
decisions: [D-0002]
raised_on: 2026-11-21
done_on: ""
result: []
---

# Goal

Hanna asked in #184: "While searching we now have the lighting up of the matching books after
a certain amount of letters. Make that a higher difference between lighted books and
unhighlighted books."

Today (from #170, `bd25ec7`), once the search box has two letters, matching books glow a little
and the others dim: in `src/components/BookMesh.tsx` a match gets an emissive glow of `0.22`,
and a book that doesn't match is shaded to `1 − 0.65` = 35% brightness. Make the matches
clearly brighter and the others clearly darker, so the matches can be found at a glance on a
full shelf, on a phone as well as on a big screen.

**Assumption:** only the contrast changes; when the lighting starts (two letters), which books
match, and the scroll to the first match stay as they are. The UX designer picks the values; a
reasonable start is a glow around twice today's and the rest at about 15–20% brightness, perhaps
with the matches standing out a little further from the shelf.

# Done when

- On the pull request's deploy preview, with at least ten books on the shelf, typing two or more
  letters that match two of them makes those two clearly the brightest things on the shelf, and
  the rest clearly darker than today. The tester attaches before (live site or `main`'s preview)
  and after screenshots of the same search, on a phone size (390 × 844) and on a desktop size.
- Clearing the search puts every book back to its normal look; taking out a matching book still
  shows it lit evenly, without the dimming.
- The glow and dim strengths are named constants, and a unit test pins the new values (or the
  function that computes a book's brightness from `glow`/`dim`), so they don't drift back.
- `pnpm test` and `pnpm run build` pass; CI is green.
- The UX designer has reviewed the screenshots.

# Notes

- `src/components/BookMesh.tsx` (`glowing`, `shade`, around the `match` prop),
  `src/components/BookshelfScene.tsx` (`highlight`), `src/components/SearchBox.tsx` (two
  letters).
- Keep the cost per frame the same: materials are only updated when the values change.
- Close #184 from the pull request.

# Design

UX designer: choose the glow and dim values (and whether matches move forward a little) before
it is built; review the screenshots after.

# Test

# Log

- 2026-11-21 architect: Task written from #184.
