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

## Design (2026-11-21, before the build)

Built from what is already there: the Genres chips and their "Add…" box in the book panel, and the
map block's existing lines. No new colours (existing `.chip`, `.btn`, `--muted`, `--accent-*`
tokens, so both wallpapers follow), no hint texts (D-0014). One layout for phone and computer; the
only difference is the 44 px touch size on phones (`pointer: coarse`, `--tap`).

### 1. "Set in" in the book panel

**Where:** its own field directly under Genres, for every book on the shelf. Label: **Set in**.

**Chips.** One chip per place in `book.places`, in stored order, same chip look as Genres. Each
chip starts with a small mark so the kind is clear without colour:

| Kind | Chip shows | Example |
| --- | --- | --- |
| on the map as a country (a map country, or a name `places.ts` turns into one, like "England" or "Paris") | 🌍 + the name as stored | 🌍 France · 🌍 England |
| made-up place (what `placesOf` counts as imaginary) | 🗺️ + the name without "(Imaginary place)" | 🗺️ Prythian · 🗺️ Hogwarts School of Witchcraft and Wizardry |
| anything else from Open Library (not on the map) | no mark, just the name | 4 Privet Drive |

- **×** at the end of every chip removes that place (Open Library's too). Focus then goes to the
  Add box. The mark is `aria-hidden`; the chip's text for a screen reader is "France, country" /
  "Prythian, made-up place" (visually hidden word after the name); × is "Remove France".
- **Long names** wrap inside the chip (max width of the field, never cut off with …); × stays at
  the chip's end.
- **Many places:** chips wrap onto as many lines as needed, no limit, no "more"; the Add box sits
  after the last chip and drops to its own line when there's no room (as in Genres).
- **Touch (phone):** the Set in chips are at least 44 px tall and × has a 44 × 44 px tap area
  (a modifier on this field only, so Genres keeps its look).

**The Add box** (after the chips, like Genres' "Add…"). Placeholder:

- "Add…" when the book has places;
- "Add a place…" when it has none (`[]`, or undefined and not finished);
- "Looking up…" for a finished book whose places are still undefined.

**Suggestions while typing.** Nothing shows until she types at least one letter. Then a list
appears right under the box, one row per line (full width of the field, 44 px tall on phones):

1. up to **5** matches, from the map's country names (🌍) and the made-up places already on her
   other books (🗺️), names that start with what she typed first, then the rest, alphabetical;
   places already on this book are left out;
2. as the **last row**, unless what she typed equals one of the rows above or a place already on
   this book:
   - **🗺️ Add "Prythian" as a made-up place** — or, when the map already knows the name as a
     country ("England", "USA", "Paris"): **🌍 Add "England"**.

The first row is highlighted from the start. So "Fran" + Enter adds 🌍 France, "Prythian" + Enter
adds 🗺️ Prythian. Example for "Nar": 🗺️ Narnia (if on another book) · then 🗺️ Add "Nar" as a
made-up place.

- **Touch / mouse:** tapping a row adds it; the keyboard stays open and the box is emptied, ready
  for the next place.
- **Keyboard:** ↓/↑ move the highlight (wraps), Enter adds the highlighted row, Escape closes the
  list and keeps the text, Tab leaves the field. The box is a combobox (`role="combobox"`,
  `aria-expanded`, `aria-controls` the listbox "Places", `aria-activedescendant` for the
  highlight), so focus stays in the box.
- **Leaving the box does not add anything** (unlike Genres): what she typed stays in the box, so
  half a word never becomes a made-up place.
- **Spelling:** a country is added with the map's name ("france" → France); a made-up place gets
  a capital first letter and, if the same land is already on another book in another case, that
  book's spelling ("narnia" → Narnia). Adding a place that's already on the book adds nothing and
  empties the box.
- Removing the last chip leaves an empty field with "Add a place…": no message, never looked up
  again (D-0023).

### 2. The map block: Imaginary lands with counts

The existing line, now with a count after each land, most first, ties alphabetical:

> 🗺️ **Imaginary lands:** Hogwarts 4 · Narnia 2 · Middle Earth 1

- The count is in the muted colour (as the country counts in the list above it); the "·"
  separators are `aria-hidden`, so a screen reader reads "Hogwarts 4, Narnia 2, Middle Earth 1".
- **Long names** ("Hogwarts School of Witchcraft and Wizardry 4") wrap like normal text; the count
  never ends up alone at the start of a line (non-breaking space before it).
- **Many lands:** all of them, in the same wrapping line (small text); no cut-off.
- A land she just added in the panel shows here as soon as the book is finished (the map counts
  finished books only, as now). No land: no line, as now.

### Done when (design)

- Set in sits under Genres for a finished and an unfinished book; chips show 🌍 / 🗺️ / no mark as
  in the table; × removes, also an Open Library place.
- Typing "fra" shows 🌍 France first; Enter adds it. Typing "Prythian" shows the last row
  'Add "Prythian" as a made-up place'; Enter or tapping it adds 🗺️ Prythian. Leaving the box with
  text in it adds nothing. At most 5 suggestion rows plus the add row.
- Keyboard only: ↓/↑/Enter/Escape work as described, focus stays in the box.
- At 390×844 the chips, × and suggestion rows are at least 44 px tall; long names wrap, nothing
  is cut off or scrolls sideways.
- The map shows "Imaginary lands: Hogwarts 4 · Narnia 2 · …", most first, including the land just
  added on a finished book. Checked on both wallpapers.

# Test

# Log

- 2026-11-21 architect: task written
- 2026-11-21 ux-designer: designed
- 2026-11-21 requester: Hanna confirmed the design, including the designer's four choices
- 2026-11-21 developer: built in a draft pull request (see `result`). New `src/lib/mapCountries.ts`
  (the 176 country names the map draws: world-atlas without Antarctica, which the map leaves out)
  and `src/lib/setIn.ts` (chip kind and label, `addPlace`/`removePlace` that always return an array,
  `placeFromTyped`: map country by the map's name, a name the map knows as a country kept as typed
  with a capital, anything else stored as `"<name> (Imaginary place)"` spelled like the same land on
  another book; `placeSuggestions`: up to 5 matches, starting ones first then alphabetical, then the
  add row). `places.ts`: `byCount` (most first, ties alphabetical) and `placesPatch` (the lookup
  writes only while `places` is still undefined), used by `useBookDetails.ts` through the function
  form of `updateBook`. `SetInField.tsx` under Genres for every book (combobox, 🌍/🗺️ marks,
  visually hidden "country"/"made-up place", leaving the box adds nothing, × focuses the box,
  44 px chips, × and rows on `pointer: coarse` only for this field). Map line: "Hogwarts 3 · Narnia 2
  · …" with muted counts, non-breaking space before each count, `aria-hidden` dots plus a hidden
  comma for screen readers. Checks: `pnpm test` → 74 files, 498 passed, 9 skipped (new
  `setIn.test.ts` 20 tests, `mapCountries.test.ts` 1); `pnpm run build` → built; `pnpm exec harness
  check` → all ✓. Clicked through on `vite dev` with no backend, shelf seeded in localStorage
  (`docs/tasks/T-0015-screens/`, 390×844 `phone-*` and 1280×800 `desktop-*`): chips with × incl.
  "4 Privet Drive" (removing it worked, focus went to the box), "fra" → 🌍 France first, Enter
  added it; "Prythian" → only row 🗺️ Add "Prythian" as a made-up place, Enter added it, stored as
  `["France","Prythian (Imaginary place)"]`; "Velar" + Tab added nothing and stayed in the box;
  phone chip/×/row heights 44 px; map "Hogwarts 3 · Narnia 2 · Hogwarts School of Witchcraft and
  Wizardry 1 · Middle Earth 1 · Prythian 1" on lavender and midnight; no sideways scroll; no page
  errors. Hand over to the UX designer for review.
