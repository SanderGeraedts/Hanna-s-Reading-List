---
id: T-0015
title: "Let Hanna set where a book is set, and count the imaginary lands on the map"
description: "The book panel gets a Set in field (places as chips with ×, add map countries from a list or type a made-up place), her places replace Open Library's and are never looked up again, and the world map shows imaginary lands with counts, most first."
status: Done
depends_on: []
decisions: [D-0002, D-0014, D-0020, D-0022, D-0023]
raised_on: 2026-11-21
done_on: "2026-11-21"
result: ["https://github.com/SanderGeraedts/Hanna-s-Reading-List/pull/223"]
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

## Review after building (2026-11-21)

Looked at: `git diff main...HEAD -- src` and the twelve screenshots in `docs/tasks/T-0015-screens/`
(390×844 and 1280×800, lavender and midnight).

**Verdict: back to the developer for two small fixes** (must-fix 1 and 2 below). Everything else
matches the design.

**Matches the design**

- Set in sits directly under Genres, for every book; label "Set in"; same chip look as Genres.
- Chips: 🌍 for map countries and names the map turns into one (England, Paris), 🗺️ for made-up
  places with "(Imaginary place)" left off, no mark for "4 Privet Drive"; marks `aria-hidden`,
  visually hidden ", country" / ", made-up place"; × labelled "Remove …" and focus goes back to
  the box. Long names wrap inside the chip with × at the end ("Hogwarts School of Witchcraft and
  Wizardry", phone). 44 px chips, × and rows on touch only; Genres unchanged.
- Placeholders "Add…" / "Add a place…" / "Looking up…" as designed.
- Suggestions: nothing until a letter is typed; up to 5 rows, starting matches first, then the add
  row last; first row highlighted ("fra" → 🌍 France highlighted, Enter adds it); "Prythian" → only
  the row 🗺️ Add "Prythian" as a made-up place. Combobox roles, ↓/↑ wrap, Enter, Escape closes
  the list and keeps the text (without closing the panel), leaving the box adds nothing.
- Map line: "Imaginary lands: Hogwarts 3 · Narnia 2 · …", most first, ties alphabetical, muted
  counts, dots `aria-hidden` with a hidden comma, non-breaking space before each count, wraps
  without cut-off; tokens only, reads well on lavender and midnight.

**The developer's three open points**

1. *"fra" shows France and also `Add "Fra" as a made-up place`.* **Keep as built.** This is the
   design: the add row shows unless the text equals a row or a place already on the book. France
   is first and highlighted, so "fra" + Enter or a tap on the first row does the right thing; the
   add row is the only way to add a made-up place whose name is part of a country's name, and the
   words "as a made-up place" make clear what it does. No change.
2. *"usa" saved as "Usa".* **Must fix (small).** Keep her word (don't swap it for "United States
   of America": "England" or "Paris" carry meaning she chose, and the chip shows what she typed),
   but spell it properly. Same for "new york", which now becomes "New york".
3. *"Hogwarts 3" and "Hogwarts School of Witchcraft and Wizardry 1" as separate lands.* **Must
   fix.** The point of the counts is "how often have I been to Hogwarts"; one land split in two
   gives the wrong answer, and it happens as soon as a typed "Hogwarts" meets Open Library's long
   name. Merge only what is clearly the same place (a well-known land from the built-in list, or
   the same name in other capitals), no guessing on other names.

**Must fix before the tester**

1. `placeFromTyped` (`src/lib/setIn.ts`), for a name the map knows as a country but not by the
   map's own name (the `ALIASES` path): store it with a capital at the start of every word
   ("new york" → "New York", "saint petersburg" → "Saint Petersburg"), and in capitals when it is
   an abbreviation: one word of at most 3 letters, or letters with dots ("usa" → "USA",
   "uk" → "UK", "u.s." → "U.S."). Text she already typed with capitals inside stays as typed
   ("USA", "McLean"). The add row shows that spelling (🌍 Add "USA"). Made-up places keep the
   current rule (capital first letter only, or the spelling on another book). Tests: "usa" → "USA",
   "uk" → "UK", "new york" → "New York", "england" → "England", "USA" → "USA".
2. Imaginary lands that are the same place count as one (`src/lib/places.ts`, in `placesOf`, so
   the map counts and the panel's suggestions agree):
   - a name that contains a well-known land from the built-in list (the check `imaginaryName`
     already does) is counted under that land's short name: "Hogwarts School of Witchcraft and
     Wizardry" → Hogwarts. Give the built-in list a display spelling per land ("Hogwarts",
     "Narnia", "Middle Earth" for both "middle earth" and "middle-earth", "Oz", …);
   - any other land: the same name in other capitals or spacing is one land (first spelling wins);
   - a book with both "Hogwarts" and "Hogwarts School of Witchcraft and Wizardry" counts once.
   - The chips in the panel keep showing the name as stored (the long name stays long there).
   - Tests: 3 books "Hogwarts (Imaginary place)" + 1 book "Hogwarts School of Witchcraft and
     Wizardry (Imaginary place)" → "Hogwarts 4"; one book with both → 1; "Middle-earth" and
     "Middle Earth" → one land; "Velaris" and "velaris" → one land.
   - New screenshots of the map block (390×844 and 1280×800) showing "Hogwarts 4 · Narnia 2 · …"
     with the seeded shelf, and of the add row for "usa" (🌍 Add "USA").

### Re-review (2026-11-21)

Looked at: `git diff cf3c839..HEAD -- src` and the four new screenshots (`phone-map.jpg`,
`desktop-map.jpg`, `phone-usa-row.jpg`, `desktop-usa-row.jpg`).

**Verdict: matches the design. On to the tester.**

1. *Typed country names spelled properly:* fixed. `countrySpelling` follows the rule as written
   (capitals inside kept, short words and dotted letters in capitals, otherwise a capital per word),
   only for names the map knows as a country; made-up places keep their rule. The add row reads
   🌍 Add "USA" on phone and desktop, highlighted as the only row.
2. *One imaginary land counts once:* fixed. The built-in list has a short name per land, other lands
   merge by capitals/spacing with the first spelling winning, once per book, and the panel's
   suggestions use the same key. The map reads "Imaginary lands: Hogwarts 4 · Narnia 2 · Velaris 2 ·
   Middle Earth 1" on phone (wraps cleanly onto a second line) and desktop. Chips still show the
   stored long name.

No new differences.

# Test

Tester, 2026-11-21, on `t-0015-map-places` at `4049d8e`, after `pnpm install --frozen-lockfile`.

**Commands**

- `pnpm test` → `Tests  506 passed | 9 skipped (515)` (includes `setIn.test.ts`, `mapCountries.test.ts`,
  `places.test.ts`: counts most first with ties alphabetical, add/remove incl. Open Library places,
  no duplicates, typed made-up places counted as imaginary, the static list equals the atlas,
  `needsPlaces` false for `[]` and edited lists, `placesPatch` doesn't overwrite).
- `pnpm run build` → `✓ built in 620ms`.
- `pnpm exec harness check` → `✓ tasks: 15 tasks, index in step` · `✓ decisions: 26 records, index
  complete, 3 overrules valid` · `✓ engineers: 2 listed` · `✓ generated files: current`.

**Click-through** (`pnpm exec vite dev --port 3126 --strictPort`, no `POCKETBASE_URL`, shelf seeded in
localStorage `hannas-reading-list:v1`, playwright-core with Chrome, at 390×844 touch and 1280×800;
same results on both):

- *Lookup finishing after an edit:* a finished book with `places` undefined and a work key, its Open
  Library request held for 8 s. Placeholder "Looking up…"; she added a place meanwhile → stored
  `["Middle (Imaginary place)"]`; after the lookup came back (request seen: `OL27482W`) still
  `["Middle (Imaginary place)"]`.
- *Same country twice / several countries / aliases:* on a book with `[]` ("Add a place…"): "fra" →
  rows `🌍 France | 🗺️ Add "Fra" as a made-up place`, France highlighted, Enter added it; "france"
  again → no rows, Enter emptied the box, nothing added; "usa" → only row `🌍 Add "USA"`, "england"
  → `🌍 Add "England"`, "paris" → `🌍 Add "Paris"`, "new york" → `🌍 Add "New York"`. Stored
  `["France","USA","England","Paris","New York", …]`, all chips 🌍 "…, country".
- *Made-up place colliding with a country prefix:* "Fra" with France already on the book → only
  `🗺️ Add "Fra" as a made-up place`; clicking it stored `"Fra (Imaginary place)"`, chip 🗺️ Fra.
- *Hogwarts long/short:* "hog" → `🗺️ Hogwarts` (from another book) first; a book with both
  "Hogwarts" and "Hogwarts School of Witchcraft and Wizardry" counted once: map "Hogwarts 3" from
  exactly three finished books.
- *Very long name* (101 characters): chip wraps onto three lines with × at the end, no chip past
  the field edge, no sideways scroll; on the map it wraps with its count "1" on the same line.
- *Phone sizes:* Set in chips 46–47 px tall, × 44×44 px.
- *Keyboard:* "an" → 5 country rows + add row; ↑ from the first wraps to the add row, ↓ wraps back,
  ↓ then Enter added Afghanistan (role `combobox`, `aria-activedescendant` set, focus stays in the
  box, box emptied). "Velar" + Escape → list hidden, text kept, panel still open; ↓ reopens the
  list; Tab leaves the field and adds nothing (stored list unchanged).
- *Removing Open Library's places and emptying:* × "France" on a finished book with a work key →
  `[]`, placeholder "Add a place…", focus back in the box; emptied a 4-place book (incl. "4 Privet
  Drive") → `[]`. Reload + 6 s wait: both still `[]`, the Hobbit still `["Middle (Imaginary place)"]`,
  **no Open Library work lookups** (D-0023).
- *Want-to-read book:* "Add a place…"; "nar" → `🗺️ Narnia` (from her other books) first; tap
  stored `["Narnia (Imaginary place)"]`, box emptied; not counted on the map (finished only).
- *Map, lavender and midnight* (`data-wallpaper` checked): "🗺️ Imaginary lands: Hogwarts 3 · Narnia
  2 · Fra 1 · Middle 1 · The Very Long … Endless Sea 1": most first, ties alphabetical, muted counts,
  readable on both; no sideways scroll. No page errors or console errors.

**Seen, not blocking** (for a later task if Hanna minds): on a book that already has "Hogwarts
School of Witchcraft and Wizardry", "Hogwarts" can still be added as a second chip (the map counts
it once, as designed); and Escape then Enter adds the highlighted row though the list is closed
("ger" → Germany), which is what Enter would have done with the list open.

**Verdict: passed.** Nothing left for a human to check.

# Log

- 2026-11-21 architect: task written
- 2026-11-21 ux-designer: designed
- 2026-11-21 requester: Hanna confirmed the design, including the designer's four choices
- 2026-11-21 developer: built in draft pull request #223. New `src/lib/mapCountries.ts`
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
- 2026-11-21 ux-designer: reviewed: back to the developer. Matches the design, except two must-fix
  items under *Review after building*: typed country names spelled properly ("usa" → "USA",
  "new york" → "New York"), and the same imaginary land counted once ("Hogwarts School of
  Witchcraft and Wizardry" counts as Hogwarts). The "Add "Fra" as a made-up place" row stays.
- 2026-11-21 developer: fixed both must-fix items. (1) `countrySpelling` in `setIn.ts`, used by
  `placeFromTyped` for a name the map knows as a country but not by its own name: kept as typed when
  it has capitals inside ("USA", "McLean"), all capitals for one word of at most 3 letters or letters
  with dots ("usa" → USA, "uk" → UK, "u.s." → U.S.), otherwise a capital at the start of every word
  ("new york" → New York, "st. petersburg" → St. Petersburg); made-up places unchanged; the add row
  shows the same spelling. (2) `places.ts`: the built-in list now has a display name per land
  (`middle earth`/`middle-earth` → Middle Earth, Hogwarts, Narnia, Oz, …); `placesOf` counts a name
  containing one under that short name and merges other lands by `landKey` (capitals, spaces and
  hyphens; first spelling wins), once per book; `worldMap` and `landsOn` merge across books the same
  way; chips still show the stored name. Tests added: usa/uk/new york/england/USA (+ u.s., saint/st.
  petersburg), made-up spelling unchanged, add row 🌍 Add "USA"; 3× Hogwarts + 1× long name →
  Hogwarts 4; one book with both → 1; Middle-earth + Middle Earth → one land; Velaris + velaris → one
  land; long name stays on the chip. Checks: `pnpm test` → 73 files passed, 1 skipped; 506 passed,
  9 skipped; `pnpm run build` → built; `pnpm exec harness check` → all ✓. Clicked through on `vite
  dev` with no backend, shelf seeded in localStorage: "usa" on Babel → only row 🌍 Add "USA", Enter
  stored `["USA"]`; map "Imaginary lands: Hogwarts 4 · Narnia 2 · Velaris 2 · Middle Earth 1" (from
  Hogwarts + the long name, Middle-earth, Velaris + velaris); no sideways scroll, no page errors. New
  screenshots `phone-map.jpg`/`desktop-map.jpg` and `phone-usa-row.jpg`/`desktop-usa-row.jpg`
  (390×844, 1280×800). Hand back to the UX designer for review.
- 2026-11-21 ux-designer: reviewed: matches. Both must-fix items fixed ("usa" → 🌍 Add "USA";
  map "Hogwarts 4 · Narnia 2 · Velaris 2 · Middle Earth 1"). Hand over to the tester.
- 2026-11-21 tester: passed
