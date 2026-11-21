---
id: T-0015
title: "Let Hanna set where a book is set, and count the imaginary lands on the map"
description: "The book panel gets a Set in field (places as chips with ×, add map countries from a list or type a made-up place), her places replace Open Library's and are never looked up again, and the world map shows imaginary lands with counts, most first."
status: Doing
depends_on: []
decisions: [D-0002, D-0014, D-0020, D-0022, D-0023]
raised_on: 2026-11-21
done_on: ""
result: []
---

# Goal

From a feature chat with Hanna (2026-11-21), about the world map block "Where your books are set"
(#220: `BooksWorldMapCard` in `src/components/PictureBlocks.tsx`, place logic in
`src/lib/places.ts`). `Book.places` (optional `string[]`) is filled once per finished book from
Open Library's subject places by `src/lib/useBookDetails.ts`, only while `places` is undefined.

1. **Imaginary lands get counts**, like the countries: "Hogwarts 4 · Narnia 2 · Middle Earth 1",
   most first (ties: alphabetical).
2. **"Set in" in the book panel** (`src/components/BookPanel.tsx`), with the book's other details,
   under Genres:
   - shows the book's current places as chips with × to remove, Open Library's too, including
     ones the map ignores (e.g. "4 Privet Drive");
   - add a country by typing and picking from a list of the map's own country names (the
     world-atlas names, so a picked country always lights up on the map). A book can have **more
     than one** country;
   - type any made-up place (e.g. "Prythian") and add it: it is stored so `placesOf` classifies it
     as imaginary, as `"Prythian (Imaginary place)"`, and shows on the map under Imaginary lands.
     The chip shows the name without the suffix;
   - **her places replace Open Library's** (D-0023): once she adds or removes a place, the list is
     hers and the lookup never runs or overwrites it again; an emptied list stays `[]` and is never
     looked up again.
3. **Every book on the shelf** gets the field, not only finished ones. The map keeps counting
   finished books only, as now.

# Done when

- Unit tests next to the `src/lib` logic pass, covering:
  - country and imaginary counts: imaginary lands are counted per book and sorted most first
    ("Hogwarts 4 · Narnia 2 · Middle Earth 1");
  - adding and removing places: adding a country, adding a second country to the same book,
    removing a chip (Open Library's places too), no duplicates;
  - a typed made-up place (e.g. "Prythian", and a name not in the built-in imaginary list) is
    stored so `placesOf` counts it as imaginary, and the map counts it under Imaginary lands;
  - the picked countries match the map's names: the static country list in `src/lib` equals the
    country names in `world-atlas/countries-110m.json` (the test reads the atlas; the panel doesn't);
  - an edited or emptied list is never re-fetched: `needsPlaces` is false for `places: []` and for
    an edited list, and a lookup that finishes after she edited doesn't overwrite her list.
- Clicked through on a local dev server with no backend (`pnpm run dev`, the shelf seeded in
  localStorage `hannas-reading-list:v1`, never a production `POCKETBASE_URL`), with screenshots at
  390×844 and 1280×800 of:
  - the Set in field in the book panel: chips with ×, the country list while typing, a made-up
    place added;
  - the map block with Imaginary lands and their counts, including the place just added.
- `pnpm test`, `pnpm run build` and `pnpm exec harness check` pass.

# Notes

- Group 1 (app code only): nothing for Sander. No new `Book` field, no change to `shelfMerge.ts`,
  `src/server/shelf.ts` or the load/save/sync parts of `library.ts`. Panel edits go through
  `onUpdate`/`updateBook`, which sets `editedAt`, so her edit wins in the server's merge like any
  other edit.
- D-0023 (recorded now): her places are hers once edited; `places` is never set back to
  `undefined`.
- **Country names without the big map file:** add a small static list of the map's country names
  in `src/lib` (e.g. `src/lib/mapCountries.ts`), used by the panel's picker, with a test that
  compares it to `world-atlas/countries-110m.json` so it stays in sync. The book panel must not
  import `world-atlas` (it's loaded lazily in `PictureBlocks.tsx` and should stay that way).
- **Imaginary:** store a typed place that isn't a map country (exact name, case-insensitive) as
  `"<name> (Imaginary place)"`; `placesOf` already treats "imaginary" in the text as a made-up
  place and strips the brackets. A typed name that equals a map country is stored as that country.
- **Race guard:** in `useBookDetails.ts` the places lookup writes with the function form of
  `updateBook`, only if `places` is still `undefined` at the moment it writes. Keep the lookup
  finished-books only (`needsPlaces`), so no extra Open Library calls for books she hasn't read.
- **Map counts finished books only** (my choice, no conflict): a want-to-read book's places are
  kept and count once she finishes it. Places she adds to an unfinished book stop the lookup for
  it later, which is what she asked for.
- Genres' chip field and `Combobox`-style picker in `BookPanel.tsx` (around "Genres") are the
  example to follow. The placeholder may say "Looking up…" for a finished book whose places are
  still undefined, as Genres does.
- D-0014: no hint text under Set in or under the map. D-0020/D-0022: tokens only; check both
  wallpapers. D-0002: `places` stays optional.
- Handover: to the UX designer first (a new panel field and a changed map line), then the
  developer, who opens the draft pull request on this branch.

# Design

# Test

# Log

- 2026-11-21 architect: task written
