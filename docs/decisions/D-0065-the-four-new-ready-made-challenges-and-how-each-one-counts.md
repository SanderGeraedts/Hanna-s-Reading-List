---
id: D-0065
title: "The four new ready-made challenges count from the books alone, except the series she picks, which ride in her own challenges as a finish-series rule"
description: "Around the world counts the map's countries among the year's finished books (12); Seasonal counts a season's finishes that match that season's genres or tropes; Minutes a day turns the reading log into real minutes — a paper page is 1.5 minutes, a book she only listens to its own minutes, a book with neither counts nothing — and asks for 20 minutes a day; Read the series keeps her picks as own challenges with a new finishseries rule, so nothing new is saved and nothing waits for Sander."
status: Accepted
date: 2026-11-23
decided_by: architect
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [challenges, places, tropes, listening, series]
---

# Context

Hanna agreed CH2 on 22 November 2026: four new ready-made challenges — *Around the world*
(books set in 12 different countries this year), *Seasonal* (by calendar season, judged by
genre and, now that they exist, tropes, D-0042), *Minutes a day* (at least 20 minutes a day
read or listened, as a month grid; paper pages about 1.5 minutes a page, listen-only books
their real minutes) and *Read the series* (she picks series to finish this year, with
progress per series).

Three of the four are worked out from the books, like every other ready-made challenge, so
they save nothing. *Read the series* is the odd one: it needs to remember **which** series
she picked. Her own challenges are already saved with her account (`challenges` on the
`libraries` record), validated by `cleanChallenges` in `src/lib/ownChallenges.ts` — which is
**not** a code-owner path, and which the server function imports, so a new rule kind is an
app-side change (D-0042 *Context*). Picks stored as own challenges therefore need nothing
from Sander, no migration and no new field.

The reading log holds a *share* of a book per day (`readingLog[day]`, 0…1), not minutes, so
"minutes a day" has to turn shares into minutes. `amountUnit` in `src/lib/readingLog.ts`
already decides how much of a book an amount is: `time` for a book she listens to, `pages`
for one with pages, `percent` when it knows neither.

# Decision

1. **Around the world** (`world`). Goal **12 countries**. It counts the **map's** countries
   (`placesOf(b.places, MAP_COUNTRY_SET)`, the same source as D-0026, D-0037 and the
   `countries-N` badges) over the books **finished in the challenge's year**, each country
   once, sleep reads left out. Imaginary lands do not count. A book with no `places` yet
   (not looked up) simply counts nothing; nothing is looked up for the challenge (D-0018).
2. **Seasonal** (`season`). Four sub-challenges in one card, one per calendar season, using
   `seasonOf` from `src/lib/garden/seasons.ts` (meteorological, northern hemisphere, already
   leap-day safe) on the **finish day**. A book counts for a season when it was finished in
   that season **and** matches that season's words, by **genre or trope** (D-0042, folded):
   - spring — 3 books: *romance*, *contemporary*, *coming of age*, *friends to lovers*,
     *second chance*, *slow burn*;
   - summer — 5 beach reads: *romance*, *beach*, *holiday*, *adventure*, *fake dating*,
     *one bed*, *forced proximity*;
   - autumn — 3 cosy or spooky reads: *horror*, *thriller*, *mystery*, *gothic*,
     *paranormal*, *academic rivals*, *locked room*, *dark academia*;
   - winter — 3 books: *fantasy*, *classic*, *historical*, *found family*, *quest*,
     *redemption arc*.
   A season word matches a genre or trope when the folded text **contains that word whole**:
   "Romance" and "Historical romance" match *romance*, "Romantasy" does not. The ring's
   `done` is the number of **seasons completed**, its goal 4.
3. **Minutes a day** (`minutes`). Goal **20 minutes a day**, a month grid of the days of the
   chosen month, each day filled when it reached 20. A day's minutes are the sum over every
   book of `readingLog[day] × that book's length in minutes`, where the length is:
   - `amountUnit(book) === 'time'` → the book's own `minutes` (a book she only listens to,
     or one with minutes and no pages) — **its real minutes**;
   - `amountUnit(book) === 'pages'` → `pages × 1.5` minutes;
   - `amountUnit(book) === 'percent'` → **nothing**, because the app does not know how long
     the book is and guessing would put minutes in her grid that she never read.
   The ring counts **days reached in the challenge's year** against the days of that year that
   have already happened (so a year in progress is not measured against 365).
4. **Read the series** (`series`). Her picks are **own challenges** with a new rule kind
   `finishseries`, `value` the series key (`seriesGroups`) and `target` the number of books of
   that series on her shelf when she picked it. The card lists her picked series with a bar
   each, and **＋ Add a series** picks from the series on her shelf. The Challenges page keeps
   `finishseries` entries **out** of the generic own-challenge cards, so each series shows once.
   A series with one book on the shelf is not offered (`seriesGroups` needs two), and a saved
   pick whose series has since shrunk to one book shows as it is, not as finished.
5. **Earlier years are shown, not changed**, like every other challenge: the year switch picks
   the year, and only this year's cards can be added to or edited.
6. **No new saved data and no server change.** Three of the four are derived; the fourth uses
   the challenges list that already syncs. Nothing in `src/lib/shelfMerge.ts`,
   `src/server/shelf.ts`, `deploy/nas/`, `.github/` or `netlify/` changes, so this stays in
   the guardrails' group 1.

# Rationale

Counting from the books is what keeps every other challenge the same on every device with
nothing to sync, and it is free. For the one challenge that must remember a choice, the
challenges list is exactly the right store — it is *her challenges* — and extending the rule
kinds there was already shown (D-0042) to need nothing from Sander. 1.5 minutes a page is
Hanna's own number; a book whose length the app does not know counts nothing, which is the
honest answer and the one that can never flatter the grid.

# Consequences

- *Around the world* is only as good as the places looked up on her finished books; an empty
  card says so in its empty-state line, not in a hint text (D-0014).
- The seasonal word lists are a constant and may be changed freely; they are not saved.
- A `finishseries` challenge counts towards the `challenges-N` medal family like any other.

# Guidance for agents

- The genre/trope match for *Seasonal* is one helper in `src/lib/seasonChallenge.ts`; nothing
  compares season words by itself.
- A paper page is `MINUTES_PER_PAGE = 1.5` in `src/lib/minutesChallenge.ts`. Never hard-code
  1.5 anywhere else.
- Never look a place, a genre or a trope up for a challenge (D-0017, D-0018, D-0042 §8).
- `finishseries` goes in `RULE_LABELS` as **"Finish a series"**, and `cleanChallenges` keeps it.
