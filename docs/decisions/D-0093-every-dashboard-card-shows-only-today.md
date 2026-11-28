---
id: D-0093
title: "Every dashboard card shows only its today part, and hides on a day it has nothing to say"
description: "Building on D-0092: the dashboard keeps a bit of everything, but each card says only what is true today and hides when it has nothing; Reading today replaces the strip, Currently reading, Finish by and the week calendar; Today in your world replaces the Creatures, Garden and Bookshop blocks; Pick of the day replaces What next?, New for you and Give it another try; On this day comes back."
status: Accepted
date: 2026-11-28
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [dashboard, today]
---

# Context

After D-0092 the dashboard still held cards that were not about today (all lent books, the last books added, three kinds of suggestion, three big pictures) and showed the books she is reading three times. Hanna asked for "really only the today dashboard" and, asked what it is for, chose to keep a bit of everything. She settled every point below in a feature chat on 28 November 2026.

# Decision

1. **Each card shows only its today part, and hides on a quiet day.** A small "Hidden today: …" line under the cards names the hidden ones and opens one anyway for that visit.
2. **Reading today** replaces the strip at the top, Currently reading, Finish by and the week calendar: this week as seven dots (tap for the Calendar), the streak in one line, and per book its progress, finish day, where it is set (📍, tap for the map on Stats) and +1 / +10 steps to log today's reading without opening the book. Paused books in one line. The 📖 quick update is not shown on the dashboard.
3. **This month's challenge**: only this month's book, with its progress and the days left, or one Set up line; the year stays on the Challenges page.
4. **Today in your world** replaces the Creatures, Garden and Bookshop blocks: three short lines (cookies today with Feed, the garden's news, the shop's sales today with the note of the day), each a way in to its page; a line without news hides. The shop opens over the dashboard from there and from More › Bookshop.
5. **Pick of the day** replaces What next?, New for you and Give it another try: one kind a day, taking turns, with Another; shown while she reads fewer than three books.
6. **Fact of the day** stays; **On this day** comes back from the Stats page, only on a date she read something in an earlier year.
7. **Lent out** only names books lent a month or more ago; **Added today** only books added today.
8. Books read this year lives on the Stats page (it was already in "in numbers").

# Rationale

Hiding quiet cards gives her the short page she asked for on ordinary days without taking anything away: on the day something happens, its card is there. Folding the duplicates into one card per subject means each thing is said once.

# Consequences

- The blocks folded into the new cards are dropped from saved layouts and stars, as in D-0092; the new cards take their default places, Reading today first.
- Nothing new is saved: it is all worked out from her books, the choice log and the date.

# Guidance for agents

- A dashboard card decides for itself whether it has anything to say today (`quiet` in Dashboard.tsx); keep "Hidden today" in step with it.
- The sums behind the cards live in `src/lib/todayDashboard.ts`, with tests.
