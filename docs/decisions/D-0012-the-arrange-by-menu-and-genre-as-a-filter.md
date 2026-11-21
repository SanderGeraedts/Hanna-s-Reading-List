---
id: D-0012
title: "Arrange by offers title, author, series, language, year, reading status, rating and spice; genre is a filter"
description: "Genre left Arrange by for a filter menu of its own, and colour, how I have it and date added left the menu at Hanna's request; they stay valid saved arrangements, so a shelf saved that way still loads."
status: Accepted
date: 2026-11-13
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [bookshelf]
---

# Context

Recorded as the current state of the menu, after three requests from Hanna:

- #41 (2026-11-07): "Instead of sorted by genre remove it there and have it as a filter instead."
  #42: a **Genre** menu next to Arrange by (*All genres*, each genre with its count, *No genre*); a
  book shows under each of its genres; moving books while filtered swaps only the shown ones.
- #45 (2026-11-07): remove sorting by colour (#47).
- #126 (2026-11-13): sort by Rating and by Spice, and *How I have it* and *Date added* hidden from
  the menu, like Genre and Colour.

In every case the old keys stay in `src/lib/sortKeys.ts`, the list the app and the server share
(#23), so a shelf saved with them keeps its order and still loads.

# Decision

- **Arrange by** lists Title, Author, Series, Language, Year, Reading status, Rating and Spice.
- **Genre is a filter,** not an arrangement.
- Colour, How I have it, Date added and Genre stay valid sort keys for saved shelves, but are not
  offered in the menu.

# Rationale

She uses genre to narrow the shelf down, not to order it, and asked for the arrangements she
doesn't use to go.

# Consequences

- Removing a key from `SORT_KEYS` would break saved shelves and the server's check; hiding it from
  the menu is the way to take an arrangement away.

# Guidance for agents

- Never remove a key from `SORT_KEYS`; hide it from the menu instead.
- New arrangements go in `SORT_KEYS` (the server's database field allows 20 characters).
- Adding a hidden arrangement back to the menu is Hanna's choice.
