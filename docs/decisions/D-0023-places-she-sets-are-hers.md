---
id: D-0023
title: "Where a book is set is hers once she edits it: Open Library fills it once, never over her places"
description: "Set in in the book panel shows a book's places; once Hanna adds or removes one, the list is hers and Open Library never looks it up or overwrites it again, also when she empties it; a made-up place she types counts as an imaginary land."
status: Accepted
date: 2026-11-21
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [book-panel, open-library, data]
---

# Context

The world map block "Where your books are set" (#220) fills `Book.places` once per finished book
from Open Library's subject places, only while `places` is undefined. In a feature chat on
2026-11-21 Hanna asked to see and change those places in the book panel ("Set in"), to add
countries and made-up places herself, and that her places replace Open Library's.

# Decision

- `Book.places` stays the one list (optional, D-0002). Open Library fills it **only while it is
  undefined**; any edit by Hanna sets it to an array, so the lookup never runs for that book again.
- **An emptied list stays empty** (`[]`), and is never looked up again.
- A lookup that was already under way when she edited must not overwrite her list: it writes only
  if `places` is still undefined at the moment it writes.
- A made-up place she types is stored so the map counts it as an imaginary land (with the
  `(Imaginary place)` suffix Open Library uses), and countries she picks are stored with the map's
  own country names.

# Rationale

Like D-0007 for Storytel: what she set herself stays hers. Keeping one list (no second field or
flag) needs no change to how the shelf is saved or merged.

# Consequences

- No new `Book` field; no change to `shelfMerge.ts` or syncing (group 1).
- To get Open Library's places back for a book she would have to ask for that as a new feature.

# Guidance for agents

- Never set `places` back to `undefined` from the app, and never make the lookup run when
  `places` is an array, empty or not.
