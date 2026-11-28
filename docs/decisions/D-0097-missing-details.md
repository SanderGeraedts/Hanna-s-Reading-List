---
id: D-0097
title: "Missing details: look up back texts, genres and countries for her to review, and go through the rest one book at a time"
description: "A Missing details list (☰ menu on a phone, a button on a computer) shows per detail which books miss a back text, genres, a country, tropes or characters; Look them up asks Open Library, shows the finds per book with a tick to keep, and saves only what she keeps into empty fields; Go through them one by one opens each book on the tab where its missing detail goes."
status: Accepted
date: 2026-11-28
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [books, open-library]
---

# Context

Hanna asked Claude to go through the books on her shelf for missing back texts, tropes, genres, characters and countries and fill them in or list them. Claude may not read or write her real shelf (G-0019; the 9 November incident), so it is a tool she runs in the app on the live site.

# Decision

1. **Missing details** lists, per detail (back text, genres, country, tropes, characters), the books on her shelf (not the wishlist) that miss it.
2. **Look them up** asks Open Library (the free source the app already uses) for back texts, genres and countries, a few books at a time, and shows what it found per book, each find ticked to keep. **Save** writes only what she kept, and only into fields that are still empty at that moment. Nothing she typed or picked is ever changed.
3. What Open Library doesn't know is remembered on that device ("not found online") so it isn't asked again every time.
4. Tropes and characters have no source online: they are hers to fill in. Tapping a book opens its panel on the tab where the detail goes.
5. **Go through them one by one** opens the books that still miss anything, one at a time, with a bar saying what is still missing and Next book ›.

# Consequences

No new field on `Book`, nothing for Sander; the lookups use the existing server routes for Open Library.

# Guidance for agents

Never fill a detail she has set; `foundPatch` checks emptiness at the moment of saving.
