---
id: D-0100
title: "A Series page with every series as covers; Read the series opens the next unread book"
description: "A Series tab after Dashboard (on a phone in More) shows every series of two or more books on her shelf as a row of covers in order, read ones in colour and the rest greyed, the one she reads with a progress bar and a dashed spot for a skipped number; A–Z by default, or in progress first, by author or recently read (kept per device). The Series block leaves the Stats page. In the Read the series challenge, tapping a series opens its next unread book."
status: Accepted
date: 2026-11-28
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [series, navigation, challenges]
---

# Context

Hanna asked for a tab next to Dashboard that shows her series with their covers and which ones she has read, sortable, and for the Read the series challenge to take her to the next unfinished book of a series.

# Decision

1. **Series** is a page: a tab right after Dashboard on a computer, More › Series on a phone (the bar stays at five).
2. It shows every series with two or more books on her shelf (not the wishlist), its books as covers in series order. Read books are in colour, unread ones greyed; the one she is reading is in colour with a thin progress bar. A number the series skips shows as a dashed spot "not on your shelf". The heading has the series, its author, "x of y read" and ★ when all are read. Tap a cover to open the book.
3. Sort: A–Z (default), In progress first, By author, Recently read; the choice is kept on the device. A search box finds a series.
4. The Series block leaves the Stats page (one place for each thing, as in D-0092).
5. In **Read the series**, a series she hasn't finished shows "next: <title>" and opens that book when tapped.

# Consequences

Nothing new is saved but the device's sort choice.

# Guidance for agents

`allSeries`/`sortSeries` in `src/lib/seriesPage.ts`, `nextInSeries` in `src/lib/seriesChallenge.ts`.
