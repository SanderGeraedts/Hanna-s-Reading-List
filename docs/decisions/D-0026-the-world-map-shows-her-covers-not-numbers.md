---
id: D-0026
title: "Where your books are set shows her covers, never numbers"
description: "The world map block fills each country with the covers of the finished books set there and shows imaginary lands as rows of tiny covers; no counts appear anywhere in the block (map, tooltip, list, lands, screen-reader label or waiting line)."
status: Accepted
date: 2026-11-22
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [dashboard, world-map, covers]
---

# Context

The block "Where your books are set" (#220, `BooksWorldMapCard`) shaded countries by how many
books are set there and listed counts ("United Kingdom 2", "Hogwarts 4 · Narnia 2", T-0015). In a
feature chat on 2026-11-22 Hanna asked for the covers of her books inside the countries instead,
and for no numbers anywhere in the block: she wants to see *which* books took her there, not a
score.

# Decision

- Each lit country is filled with a patchwork of the covers of **all** her finished books set
  there; a book without a cover shows as a tile in its spine colour (`book.color`). Countries
  without books stay plain.
- Imaginary lands show one row per land: its name and tiny covers of its books.
- **No numbers in the block**: not on the map, not in the hover text, not in the list of
  countries, not after the lands, not in the screen-reader label, and not in the "still looking
  up" line. Order still follows how many books a place has (most first, ties alphabetical), so the
  biggest places come first without saying how many.

# Rationale

The block is a picture of her reading, like the genre flower; the covers are what she recognises.
Counts already exist elsewhere (insights, challenges).

# Consequences

- The shading by count goes: every lit country is covers.
- `worldMap()` gives the books per country and per land, not counts.

# Guidance for agents

- Don't add counts, "n books", "and n more" or other numbers back to this block; a number there
  is Hanna's choice to ask about. Use the books' titles where words are needed.
