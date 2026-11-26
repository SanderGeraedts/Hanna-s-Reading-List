---
id: D-0079
title: "A fact never comes round twice: the count of facts only ever goes forward, kept as one mark in the choice log, and each reading day's fact shows on the calendar"
description: "Facts were picked purely by how many reading days she had, so a day that went away (a corrected day, a slider nudged back, a book removed) pulled the whole run back and handed her a fact she had read; a high-water mark rides in the creatures choice log as one `place` event keyed `f:seen`, the count is max(reading days, mark), and the calendar's day panel shows the fact that day unlocked."
status: Accepted
date: 2026-11-26
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [facts, calendar, dashboard, choices]
---

# Context

Hanna, 26 November 2026: "make sure that I am not getting facts twice. I am pretty sure that I
had the fact of today before." Asked which of the two ways it can happen she was seeing, she
said it was **not** yesterday's fact: it was one from further back.

Two things were checked first and ruled out: the lists hold no duplicates at all (625 book
facts, 212 general ones, none repeated within a list and none in both), and the deliberate
behaviour where a day without reading keeps the last fact and says "Read today for a new fact."

The real cause is in `facts.ts`. A fact is not pinned to a date: the day's fact is its
**position** in the list of reading days. Any of these takes a day out of that list:

- correcting a past day down to nothing on the calendar (T-0045) — `logPatch` deletes the day
  when the amount reaches zero;
- sliding a book's progress back, which subtracts from that day and can empty it;
- removing a book, or merging two copies, which takes its reading days with it.

Lose one day and every later day shifts back a step, so today lands on a fact she has read. The
dashboard's "All my facts" list hides it, because it de-duplicates what it shows.

# Decision

1. **The count of facts only ever goes forward.** The number of facts she has been given is
   `max(reading days up to today, the mark)`, never just the day count.

2. **The mark is one `place` event in the creatures choice log** (D-0034), keyed `f:seen` with
   the count in `n`, exactly as a swapped bingo square rides there (D-0067). The route is
   already live, so **nothing changes in `deploy/nas/` and nothing waits for Sander**. `place`
   is a setting kind, so `mergeLogs` keeps only the newest event per key: the mark costs **one**
   event however many years she reads, and it follows her to every device.

3. **The mark is read as the highest `f:seen` count in the log, not the newest**, so two devices
   that have not met yet cannot pull it backwards while both their events are there.

4. **Where it is moved on:** `useFactMark` on the page, not in the Fact of the day block. A fact
   is unlocked by a reading day, not by looking at the block, so the mark must keep up on a day
   she only opens the shelf and when she has hidden the block.

5. **The calendar's day panel shows the fact that day unlocked** (`factForDay`), under what she
   read and before what comes out: "💡 Your fact that day: …". A day she did not read on has
   none and says nothing. Her choice over showing only today's fact, or marking the days on the
   month grid (feature chat, 26 November 2026).

6. **Nothing else changes.** A day without reading still keeps the last fact and still says
   "Read today for a new fact." A new fact still arrives with a reading day. The lists are
   untouched.

# Rationale

A mark is the only thing that can hold a count that the data underneath is allowed to shrink.
Pinning a fact to its date instead was the alternative; it needs no mark, but with ~837 facts
and a date-based pick, chance repeats come back by another door, and every past day's fact would
change the day it shipped.

Riding in the choice log beats a new saved field or a per-device note: her phone and her laptop
agree, nothing new is sent to the server, and `mergeLogs` keeps it at one event forever.

# Consequences

- The app has no record of what she saw before this, so the mark starts from where she is the
  day it ships. If her run has already slipped, the facts in that gap can still come round once.
- The first reading day after a day was corrected away gives no new fact: the count had already
  passed that point. The fact she gets is the one the mark holds, and the next reading day moves
  on as usual.
- A device that writes the mark while it is still behind another device can lower it by a few
  (the newest `place` per key wins on merge). Her facts then climb back from there. This is the
  price of the mark costing one event instead of one per reading day, and is written in
  `factsSeen`'s own comment.
- `dailyFact` and `unlockedFacts` take the mark as their last argument; `unlockedSequence` takes
  an `atLeast` length. Called without them, everything behaves exactly as before.
