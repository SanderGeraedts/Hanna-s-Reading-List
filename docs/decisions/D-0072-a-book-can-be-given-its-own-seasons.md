---
id: D-0072
title: "A book can be given its own seasons, and her pick replaces the app's guess"
description: "An optional seasons?: Season[] on Book, set as four chips under Genres on the book panel's Details tab; matchesSeason returns her picked seasons when the field has any and falls back to the genre-and-trope guess when it is empty, so the seasonal challenge and its suggestions follow what she said about a book."
status: Accepted
date: 2026-11-24
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [book, book-panel, challenges, seasons]
---

# Context

Hanna asked in #272: "What does seasons reads depend on and can I make a book a season read?"
She is reading *Kerst op een Eiland*, plainly a Christmas and winter book, and the seasonal
challenge never suggests it for winter.

Today `matchesSeason` (src/lib/seasonChallenge.ts, D-0065 §2) is the only judge: a book counts
for a season when one of its genres or tropes holds one of that season's words whole — winter
wants *fantasy, classic, historical, found family, quest, redemption arc*. A Dutch Christmas
romance has none of them, and no word list ever will have every one of them. The word lists are
the same for every book and cannot know what a book is about.

Her own wording settled the shape: "like something like genres, but if it's empty then it is
still good" — a field she fills in when she wants to, and the guess as it is when she doesn't.

# Decision

1. **One new optional field on `Book`** (D-0002, so older shelves still load):
   ```ts
   /** the seasons she says this book is for; empty/left out = worked out from genres and tropes (D-0072) */
   seasons?: Season[]
   ```
   An empty list is never written: taking the last season off removes the field, so a book she
   never touched and one she filled in and emptied again are byte-for-byte the same. An unknown
   word, `null` or a number in the list is ignored, exactly as `poseOf` ignores an unknown pose.

2. **It syncs like tropes and the pose: not at all, specially** (D-0042 §2, D-0044 §2). It is
   part of the book, rides up and down with the shelf and merges book-by-book on `editedAt`.
   Nothing in `src/lib/shelfMerge.ts`, `src/server/shelf.ts` or `deploy/nas/` changes.

3. **Her pick replaces the guess.** `matchesSeason(book, season)` answers
   `seasonsOf(book).includes(season)` when she has picked any season for that book, and falls
   back to the genre-and-trope word lists when she has not. She chose this over adding to the
   guess (feature chat of 24 November 2026) because it is the only shape that can also take a
   book **out** of a season it was wrongly guessed into.

4. **One place decides, so everything follows.** `matchesSeason` is the only judge of what a
   season holds, and the seasonal challenge card, its rings, its progress and the "For winter"
   suggestions of `seasonFits` all ask it. The field therefore needs no code of its own in any
   of them.

5. **Where she sets it:** the book panel's **Details** tab, directly under Genres, as four
   chips — 🌸 Spring · ☀️ Summer · 🍂 Autumn · ❄️ Winter — each a toggle, several allowed. The
   row says in one muted line what empty means, so the guess is not a secret.

6. **It counts straight away, for books already finished too.** The seasonal challenge is worked
   out from her shelf every time it is drawn, so a book she puts in winter counts for winter
   from that moment, including for a finish from last March — and stops counting for the season
   it used to be guessed into. Clearing the field puts it back exactly as it was.

# Rationale

Replacing rather than adding is what makes the field a correction and not just a second guess.
Adding would mean a book wrongly in autumn can never leave autumn, which is the same complaint
as #272 with the seasons swapped.

Keeping `matchesSeason` the single judge is what keeps this feature four lines of real logic:
every screen that shows a season already goes through it.

# Consequences

- `seasonChallenge.ts` gains `seasonsOf(book)` and a branch in `matchesSeason`; its tests grow.
- Her seasonal challenge progress can move the moment she fills a season in, for a year that is
  already over. That is the point of the field, and the PR says so in her words.
- Badges are untouched: `spooky-season` counts October finishes by its own genre list, not by
  `matchesSeason`.
