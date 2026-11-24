---
id: T-0094
title: "Let Hanna give a book its own seasons, and let her pick replace the app's guess"
description: "A Season row of four chips under Genres on the book panel's Details tab writes an optional Book.seasons; matchesSeason answers from her pick when there is one and falls back to the genre-and-trope word lists when the field is empty, so the seasonal challenge and its suggestions follow what she said."
status: Doing
size: small
depends_on: []
decisions: [D-0002, D-0042, D-0065, D-0072]
raised_on: 2026-11-24
done_on: ""
result: []
---

# Goal

#272. The seasonal challenge judges a book only by its genres and tropes, so *Kerst op een
Eiland* — a Christmas book with neither a winter genre nor a winter trope — is never offered for
winter. Hanna asked for a field "like genres" that she fills in herself, with the guess left in
place while it is empty.

# Done when

- `pnpm test` passes, including new tests in `src/lib/seasonChallenge.test.ts` that a picked
  season counts, an unpicked one does not, and an empty field keeps the old guess exactly.
- On the preview: a book with Winter ticked in Details appears under the seasonal challenge as
  "For winter", and a book with no seasons counts exactly as it did before.

# Notes

- `src/lib/seasonChallenge.ts` is the only judge (D-0072 §4): `matchesSeason` is asked by
  `seasonChallenge`, the rings, the card and `seasonFits`.
- `Season`, `SEASONS`, `SEASON_LABEL` and `SEASON_ICON` come from `src/lib/garden/seasons.ts`.
- The field is optional and never written empty (D-0072 §1).

# Design

Under the Genres row on Details: the label **Season**, then four chips — Spring, Summer, Autumn
and Winter with their icons — each a toggle with `aria-pressed`, styled like the existing format
chips. Under them one muted line: with nothing ticked, "No season picked: worked out from the
genres and tropes."; with one or more ticked, "Counts for winter only." (the seasons she picked,
in season order).

# Test

`pnpm test`: 197 files, 2456 tests passed (22 skipped). The new cases:

- `src/lib/seasonChallenge.test.ts` — "the seasons she gives a book herself": a Christmas
  romance is read as spring and never winter today; with `seasons: ['winter']` it counts for
  winter and no longer for spring; several seasons; an empty or missing field keeps the old
  guess exactly; anything that is not one of the four is ignored; `seasonsPatch([])` clears the
  field; and the challenge itself counts her pick for a finish that already happened.
- `src/components/SeasonField.test.tsx` — the four chips in season order, nothing on for an
  untouched book, both lines of text, picking, adding, taking off, and the last one clearing
  the field.

Tried to break it: `seasons` set to `['christmas', null, 7, 'winter']` (only winter is read),
to `['christmas']` alone (no usable pick, so the guess still speaks), and to `[]` (the guess).
A book with no field at all is byte-for-byte what it was.

Remaining: Hanna confirms on the preview that *Kerst op een Eiland* with Winter ticked turns up
as a winter suggestion on the Challenges page.

# Log

- 2026-11-24 architect: raised from #272, sized small, D-0072 recorded.
- 2026-11-24 ux-designer: the Season chips under Genres, with a line that says what empty means.
- 2026-11-24 developer: Book.seasons, seasonsOf/seasonsPatch, matchesSeason branches on her pick, SeasonField on Details.
- 2026-11-24 tester: ran pnpm test and pnpm run build, both pass; result written above.
- 2026-11-24 tester: Remaining: Hanna checks on the preview that a book she puts in Winter is suggested for winter.
