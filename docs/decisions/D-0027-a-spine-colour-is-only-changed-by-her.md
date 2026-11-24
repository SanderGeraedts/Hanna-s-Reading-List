---
id: D-0027
title: "A book's spine colour is only changed by her: nothing in the app recolours a book on its own"
description: "book.color stays the one stored colour, with no flag for a chosen one; the app never recolours an existing book automatically, and only her own actions change it: a swatch, Back to automatic, or a new cover she picks."
status: Accepted
date: 2026-11-22
decided_by: architect
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [book-panel, spine, covers, data]
---

# Context

In a feature chat on 2026-11-21 Hanna asked to pick a book's spine colour from swatches taken from
its cover, in the book panel (T-0019). A chosen colour is only worth something if it stays. Today
`book.color` is written in these places: when a book is added (`AddBookDialog`, the Storytel import's
new books: the cover's colour, or `colorFromString(title)` without a cover), and when she picks a
new cover (`CoverPicker`: the new cover's colour). Nothing recolours an existing book on its own:
the Storytel refresh and the nightly sync (D-0007) don't touch `color`, merging duplicates keeps the
kept copy's colour (D-0009), and the shelf merge takes the copy edited last (`editedAt`). So a
chosen colour can't be overwritten today, and no field is needed to protect it.

# Decision

- `book.color` stays the one stored colour. There is **no new field** marking a colour as chosen
  (so no change to `Book`, `shelfMerge.ts` or syncing).
- **The app never changes the colour of a book that is already on the shelf by itself**: not a
  Storytel refresh, the nightly sync, a cover lookup or refresh, a metadata update, or anything added
  later.
- Only her own actions change it: tapping a swatch, "Back to automatic", or picking a new cover
  under "Change cover…" (which gives the new cover's automatic colour, as now; the swatches of the
  new cover are right there to choose again).
- Merging duplicates keeps the kept copy's colour (as D-0009 does now).

# Rationale

Like D-0007 and D-0023: what she set herself stays hers. Because nothing writes `color` on its own,
the rule costs nothing today and needs no stored flag; writing it down keeps a later feature (say, a
cover refresh) from quietly undoing her choices.

# Consequences

- A feature that would recolour existing books automatically needs a new decision, and then an
  optional field (D-0002) to tell a chosen colour from an automatic one.
- Picking a new cover replaces a chosen colour with the new cover's colour. That is on purpose: she
  changed the look of the book herself.

# Guidance for agents

- Never write `color` on an existing book from a background or automatic path (sync, refresh,
  lookups, migrations). New books still get their automatic colour when added.
- Don't add a "chosen colour" flag unless a new decision asks for automatic recolouring.
