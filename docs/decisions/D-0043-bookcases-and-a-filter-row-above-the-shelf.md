---
id: D-0043
title: "The shelf gets four bookcases (All · Read · To read · Digital) and one filter row above it, combined with AND, cleared by one button and never remembered"
description: "A segmented switch above the shelf picks the bookcase (All, Read = finished, To read = want-to-read, Digital = any e-book or audiobook format), and one row under it holds every filter — genre (moved out of the header), minimum rating, minimum spice, year read, language and trope — which narrow the chosen bookcase together with AND; a Clear button appears as soon as one is set, nothing is saved, and the arrangement, the room and dragging stay as they are."
status: Accepted
date: 2026-11-23
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [bookshelf, filters, navigation]
---

# Context

Hanna agreed this in her feature chat of 22 November 2026 (backlog item 1): a switch above the
shelf with **All · Read · To read · Digital**, each its own bookcase, and filters next to the
genre filter for rating and spice (a minimum), year read, language and tropes, combinable, with
a **Clear** button. Sorting and the room stay as they are. She explicitly did **not** want her
own named bookcases, or rooms side by side.

Four things had to be settled before it is built.

**Where the filters live.** Today the genre filter (D-0012, #41) is a `<select>` in the header
toolbar on a computer and in the ☰ menu on a phone. Six filters cannot go in a header that
already holds search, Arrange by, Make a wish, Refresh, + Add and the account menu, and they
cannot go in the ☰ menu either: she would have to open a menu to see whether a filter is on.

**What "Read" and "To read" mean.** The shelf has five reading statuses (reading, paused,
want, read, did-not-finish). "Read" and "To read" are two of them; the other three belong
nowhere in her four words.

**Whether a bookcase or a filter is remembered.** The genre filter is not: a reload shows the
whole shelf.

**Dragging while filtered.** `reorderShown` (`src/lib/genreFilter.ts`) already puts dragged
books back between the hidden ones; it must keep working with any combination.

# Decision

1. **A bar above the shelf**, between the header and the 3D stage, in two rows:
   - **the bookcase switch**: four buttons, `All · Read · To read · Digital`, exactly one
     pressed, `All` to begin with;
   - **the filter row**: `Genre · Rating · Spice · Year read · Language · Trope`, and a
     **Clear** button that is only there while at least one filter is set.
   The bar is the same on a phone and on a computer; the filter row scrolls sideways on a
   narrow screen. It is not shown on the Dashboard, Challenges, Calendar or Creatures pages.

2. **The four bookcases**, each showing only its own books in her own arrangement:
   - **All** — every book on the shelf.
   - **Read** — `status === 'read'`.
   - **To read** — `status === 'want'`.
   - **Digital** — any book she has as an **e-book or an audiobook**: `formatsOf(book)` holds
     `ebook`, `audiobook` or `storytel`, whatever its reading status.
   A book is in Digital **and** in Read or To read when both hold; the bookcases are not a
   partition and nothing warns about that. Books that are being read, paused or did-not-finish
   show only under All and, if digital, under Digital. That is on purpose: her four words are
   her four bookcases, not a complete sorting of the five statuses.

3. **Genre moves out of the header** into the filter row, as the first filter, with exactly the
   words and options it has now (*All genres*, each genre with its count, *No genre*). It is no
   longer in the toolbar or in the ☰ menu, so there is one place where filters are set and one
   place that shows which are on. It stays a filter and never becomes an arrangement (D-0012).

4. **What each filter offers** (one choice each, "any" first):
   - **Rating** — a minimum: *Any rating*, ★3+, ★3.5+, ★4+, ★4.5+, ★5. A book with no rating
     never passes a minimum.
   - **Spice** — a minimum: *Any spice*, 🌶1+ … 🌶5. A book with no spice never passes a
     minimum; a book she set to **No spice** on purpose (`spice: 0`) does not either.
   - **Year read** — *Any year*, then every year she finished a book in, newest first, from
     `finished` (the same days the calendar and the stats count). A book with no finish day
     never passes.
   - **Language** — *Any language*, then every language on the shelf with its count, by the
     project's language names; a book with none is *No language*.
   - **Trope** — *Any trope*, then every trope in use on the shelf (D-0042), compared folded
     through `src/lib/tropes.ts`, never by string.
   Each filter only appears when the **whole shelf** has something to offer for it (no trope
   anywhere: no Trope filter), so the row grows with her books. The options themselves are
   worked out from the whole shelf, not from the chosen bookcase, so picking a bookcase never
   makes a chosen filter vanish from the row.

5. **They combine with AND**: a book shows when it is in the chosen bookcase **and** passes
   every filter that is set. **Clear** puts every filter back to "any" and leaves the bookcase
   alone; the bookcase is changed only by the switch.

6. **Nothing is remembered.** The bookcase and every filter are the page's own state, like the
   genre filter today: a reload, or coming back from the Dashboard, shows **All** with no
   filters. Nothing is written to `localStorage`, to the account or to a URL.

7. **The arrangement, the room and the shelf itself do not change.** The chosen books keep her
   Arrange-by order; the case, wood, wallpaper, decorations, nooks, dividers and the shelf
   creature are exactly as they are; the case reshapes to the books shown, as it already does
   for a genre. Dragging while filtered keeps `reorderShown`'s behaviour: the shown books take
   the places they had between them and the hidden books stay put.

8. **An empty bookcase is a bookcase**, not an error: the case is drawn empty and one line
   under the switch says so, with the Clear button next to it. The app never clears a filter by
   itself and never falls back to All.

9. **A filter whose value disappears falls back to "any"** (as the genre filter already does
   when its genre leaves the shelf), silently, on the next render.

# Rationale

A bar of its own is the only place where she can see at a glance which bookcase she is in and
which filters are on, and it is the same on both screens. Moving genre into it keeps all
filtering in one place; leaving it in the header would mean two places to look and two places
to clear.

"Read" and "To read" are her words for the two piles she thinks in. Mapping them to the two
statuses with those names, and leaving the other three to All, is what she will expect; a
"Read" bookcase that also held did-not-finish books would be wrong.

Not remembering keeps the shelf honest: she opens the app to see her books, and a filter left
on from last week would look like missing books. It also needs no new storage and no server
field.

# Consequences

- The header loses its Genre field on both screens; `genre-filter` styling moves to the bar.
- The page keeps one filter state object; everything that needs the shown books (the shelf, the
  header's count line, dragging) reads from it.
- The filtering itself is a pure module (`src/lib/shelfFilter.ts`) so it can be tested without
  the 3D shelf, and so the counts and the options have one source.
- Make a wish keeps taking its books from the whole shelf, not from the bookcase; only the
  starting genre it already picks up from the filter stays.
- Another bookcase or another filter later is a small addition in that one module and one row.

# Guidance for agents

- Never let a filter or a bookcase reach `localStorage`, the account or the URL.
- Compare tropes only through `src/lib/tropes.ts` (D-0042) and languages through the project's
  language list; never by raw string.
- Keep `reorderShown` in the drag path: dragging a filtered shelf must not reorder the books
  that are hidden.
- A minimum never passes a book that has no value for it; write the test for `undefined`,
  `0` and the exact boundary.
- Don't add a second place to set a filter, and don't clear one on her behalf.
