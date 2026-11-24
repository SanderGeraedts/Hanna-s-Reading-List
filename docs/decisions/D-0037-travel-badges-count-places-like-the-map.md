---
id: D-0037
title: "Travel badges count the places of her finished books exactly as the world map does, each country on one continent (four on two), dated by the first finish of the book that earned them"
description: "Countries, continents, imaginary lands and the Netherlands badge count the finished books the world map counts (status read or read at least once, places known, placesOf with the map's country names), the same land in other spellings once; each badge's day is the first finish day of the book that brought it; every map country belongs to one of six continents after Natural Earth, except Russia, Turkey, Kazakhstan and Egypt, which count for both continents they lie in, and the French Southern and Antarctic Lands count for none."
status: Accepted
date: 2026-11-23
decided_by: architect
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [badges, world-map, places]
---

# Context

Hanna asked (feature chat, 2026-11-22) for travel badges: countries 5/10/25/50, every continent,
imaginary lands 3/10 and a secret badge for a book set in the Netherlands, counted "like the map"
and dated by the finish day of the book that earned each one (T-0040). The map
(`worldMap()` in `src/lib/places.ts`) only knows countries by their world-atlas names; it has no
continents. A few countries lie on two continents, and one map shape (French Southern and
Antarctic Lands) lies on none of the six.

# Decision

- **What counts:** the books the world map counts: finished (`status === 'read'` or read at
  least once), with `places` known, read through `placesOf(places, MAP_COUNTRY_SET)`. Countries
  are the map's country names; an imaginary land in other capitals or spacing (`landKey`) counts
  once. A book counts once however often it was read.
- **The day:** the first finish day of the book that brought the badge over its line (books in
  order of their first finish). A book marked read without a finish day still counts, and a badge
  it completes has no day, as other badges do today.
- **Continents:** six: Europe, Asia, Africa, North America (with Central America, the Caribbean
  and Greenland), South America, Oceania. Each map country belongs to the continent Natural Earth
  gives it, with two exceptions: **Russia, Turkey, Kazakhstan and Egypt count for both continents
  they lie in** (Europe+Asia; Egypt Africa+Asia), and **Fr. S. Antarctic Lands counts for none**.
  The list lives in one place in `src/lib/` and covers every name in `MAP_COUNTRIES`.

# Rationale

Counting exactly like the map means a country lights up on the map on the same day its badge
moves; one rule, no surprises. Natural Earth is where the map's own names come from. A book set
in Siberia or Sinai is set in Asia, so the four large two-continent countries count for both:
generous, which suits a badge.

# Consequences

- Places Hanna sets herself (D-0023) count the moment she sets them; removing a place can take a
  badge away again (badges are worked out from the books, nothing is saved).
- A new country name in the atlas needs a continent; a test keeps the list complete.

# Guidance for agents

- Don't count places the map doesn't light up, and don't count unfinished books.
- Keep no numbers in the world map block (D-0026); counts and progress belong in the badges block.
- Changing which continent a country counts for is reversible: record it as a new decision.
