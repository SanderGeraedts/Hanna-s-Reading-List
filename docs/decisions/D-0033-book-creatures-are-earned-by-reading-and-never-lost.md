---
id: D-0033
title: "Book creatures are earned by reading and never lost: what she earns is worked out from her reading log, only her choices are saved, and real animals' rarity follows the IUCN Red List"
description: "A reading game of 20 creatures (15 real animals, 5 fantasy): cookies, growth and milestone eggs are worked out from the reading log from a fixed start day, so fixing a past day changes them; only her choices are saved (D-0034); she chooses her first creature, later hatches are a fixed result of the egg; rarity of a real animal is its IUCN Red List category kept in the code; all 20 have a shiny; releasing a pet needs a confirm step and a shiny an extra hold-to-confirm; nothing ever gets hungry; Fable designs only the base looks."
status: Accepted
date: 2026-11-22
decided_by: architect
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [creatures, game, dashboard, shelf, sync]
---

# Context

Hanna asked for book creatures, a reading game, and agreed the brief in feature chats on 2026-11-22
([the brief](../book-creatures-brief.md)). Several choices in it would need a discussion to
reverse once she has played for a while (what earns cookies, how rare an animal is, what a hatch
gives), so they are recorded here. The architect took the numbers while she slept; she answered on
2026-11-22 (T-0027, *Questions re-asked*), kept the numbers, and changed four things that this
record already holds: the welcome gift is just an egg, she chooses her first creature, a pet can be
released with care, and all 20 have a shiny.

# Decision

1. **Earned is worked out, never stored.** Cookies earned, growth by itself, milestone eggs and the
   welcome egg are computed from her books (`readingLog`, `finished`, streaks, series, bingo,
   challenges) on every device, from a fixed start day in the code (`CREATURES_START`, the day
   T-0029 goes live). Fixing a past day changes them. Only her **choices** are saved (D-0034).
2. **Cookies.** A day's minutes for a book are that day's share in `readingLog` × the book's
   length in minutes: listening minutes for a book she only listens to (D-0008), otherwise pages ×
   1.5; a book with no length counts as 280 pages (as D-0030). **1 🍪 per 5 minutes**, counted on
   the total so nothing is lost to rounding, plus **10 🍪 for each finished book** (a finish day on
   or after the start). Sleep reads (`sleepReadIds`) earn half. Re-reads count. The balance is
   earned − spent (spent includes nothing for a free egg); after a fix to a past day it may go below zero: nothing is taken
   back, buying waits until it is positive again.
3. **Welcome gift and first creature.** At the start: one common egg and **no cookies**; earning
   starts on the start day. When she hatches it, **she chooses** her first creature from the five
   commons (not a surprise); that choice is saved like any other (D-0034). Every later egg hatches a
   surprise (§7).
4. **Rarity.** Real animals follow the IUCN Red List category, checked at build time and kept in
   the code with the source (no live lookup: it needs a key): Least Concern and domestic animals
   not on the list = **common**, Near Threatened = **uncommon**, Vulnerable = **rare**, Endangered
   = **very rare**, Critically Endangered = **epic**; fantasy creatures = **legendary**. Each card
   shows the category as a small label with its source. When the Red List changes a category, the
   list in the code changes with it (a creature she has keeps its card; only the label and tier
   change).
5. **The 20 creatures** (verified 2026-11-22, sources in T-0027): common: house cat (domestic), red
   fox, capybara, Eurasian red squirrel, Adélie penguin; uncommon: European hedgehog, Eurasian otter,
   platypus; rare: koala, giant panda, polar bear; very rare: red panda, emperor penguin, ring-tailed
   lemur; epic: African penguin, axolotl; legendary: book dragon, library owl, bookmark fox, starlight
   unicorn. **All 20 have a shiny variant** (a whole other palette, T-0027 Design §7).
6. **Eggs.** Free milestone eggs (from the start day): welcome = common; every 5th finished book =
   common (every 25th = rare instead); every 10 hours read or listened = common (every 100 hours =
   rare instead); a 7-day streak = uncommon, 30 days = very rare, 100 days = epic; a finished series
   = uncommon; a challenge done = uncommon; a full bingo card = very rare; every 50th finished book =
   legendary. Shop prices: common 60, uncommon 90, rare 120, very rare 160, epic 200, legendary 300
   (a common egg is about a week at 45 minutes a day). These numbers live in one file and may be
   tuned without a new decision; the rules around them may not.
7. **A hatch is a fixed result of its egg.** Every egg has a stable id (`m:books-5`, `m:streak-30`,
   `shop:<purchase id>`, `welcome`). The species is a seeded hash of the egg id over its tier's
   species (except the welcome egg, where she chooses, §3); whether it is shiny is a second seeded
   hash, also for the welcome egg (1 in 20; 1 in 5 for a duplicate, where "duplicate" is decided by
   earlier eggs in the order they were earned). So every device shows the same hatch, before or
   without the account.
8. **Duplicates.** When an egg hatches a species she has, she chooses: keep as a new pet (own name,
   outfit, level), turn into cookies (half the shop price of its tier), or power up her existing one
   (+3 levels). The album counts each species once.
9. **Releasing, and shiny safety.** She may **release a pet**, with care: a clear confirm step
   that names the pet ("Release Biscuit? This can't be undone."). A release is a saved choice like
   any other (D-0034): the pet leaves her pets, the album still counts its species as found, and no
   cookies come back. Her last pet can't be released (she always keeps one), and a released pet that
   was on the shelf or current is replaced by her first remaining pet. A shiny hatch is kept as a
   pet by default. **A shiny** turned into cookies, used as a power-up or released needs one more
   step on top: a "This is a shiny!" warning and press-and-hold (about 2 seconds) to confirm.
   Tests cover all of it.
10. **Never hungry, never lost.** Creatures don't starve, fall ill or leave; the only way a pet goes
    is her own release (§9). After 3 days without
    reading they look a bit sad and sleepy, and cheer up the first day she reads. On days she reads,
    each creature grows a little by itself; skipped days pause it.
11. **Growth.** Baby → young → grown-up are visible stages with levels in between that unlock
    tricks; levels go on after grown-up (more tricks, a little ⭐ by the name).
12. **No pop-ups** (D-0013): a new egg, a hatch waiting and a level-up show in Waiting for you.
13. **Light on the phone.** On phones the creatures mostly hold still (small idle animations at
    most, movement only on a tap or a trick); full roaming only on the computer; every creature
    scene stops when its page is not visible or another page is over it.
14. **Fable designs only the base looks.** The base 3D look of each of the 20 is designed once by an
    agent running on the Fable model (Agent tool `model: "fable"`); growth stages, shiny colours,
    outfits, animations and all wiring are built by the normal agents from those designs. This is
    dev tooling: the app itself has no AI (D-0017).

# Rationale

Working out what she earns from the reading log means nothing can get out of step and nothing is
lost: the log is already saved and merged safely (D-0006), and fixing a past day simply counts.
Saving only choices keeps the new stored data small (D-0034). A hatch fixed by its egg id gives the
same surprise on every device without saving it first. The Red List rule was hers; the numbers are
balanced so a common egg takes about a week, as she asked.

# Consequences

- Every count used for cookies and eggs needs a test, because a change to it changes her balance.
- A change to how the reading log or finishes are stored must keep the creature counts the same.
- The IUCN list in the code needs a check when a Red List update comes out.
- Prices and milestone numbers can be tuned in one file; the rules above need a new decision.

# Guidance for agents

- Never store cookies earned, levels or hatch results: derive them. Store only choices (D-0034),
  among them her pick of the first creature.
- Never let a pet be released without the confirm step, and never let a shiny be released, turned
  into cookies or used as a power-up without the extra warning and hold; any new action that
  removes a pet gets the same steps.
- Keep phone animation minimal and stop rendering when the page is hidden.
- Only the base looks are Fable's work; don't send other creature work to Fable.
- Don't add a live Red List lookup.
