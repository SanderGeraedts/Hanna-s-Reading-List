# Book creatures: the agreed brief

Hanna agreed this in feature chats on 2026-11-22 (grilled by the architect). It is the requester's
brief for T-0027 to T-0033; the rules it sets are recorded in D-0033 (the game) and D-0034 (saving
her choices). Nothing here is technical: the tasks say how.

## Who

Hanna, on her phone and her computer, signed in to her account. Sander approved saving her choices
with her account on 2026-11-22 ("The Harness should allow to do one without me, but it has my
blessing anyway").

## Features, in the order to build them

1. **The creatures' looks** (T-0027): 20 cute 3D creatures (koala/cat style), real animals and
   fantasy ones. The base look of each animal is designed once by an agent running on the Fable
   model (dev tooling only; the app stays AI-free, D-0017). Everything else is built from those
   designs by the normal agents.
2. **Saving her choices with her account** (T-0028, waits for Sander's review): purchases, names,
   outfits and the like follow her to every device.
3. **First creature and growing** (T-0029): a welcome egg (just the egg, no cookies) from which she
   **chooses** her first creature among the five commons. Every minute she reads or listens earns 🍪 cookies
   (a page ≈ 1.5 min, a finished book a special treat, sleep reads half); feeding grows the
   creature, and on days she reads it also grows a little by itself. Baby → young → grown-up, with
   levels in between and after. A suggested cute name she can keep or change. After a few days
   without reading it looks a bit sad and sleepy, and cheers up as soon as she reads: never hungry,
   never lost. A new **Creatures** tab and a small dashboard block (current creature, food bowl,
   next unlock). New things show in Waiting for you, never in a pop-up (D-0013).
4. **Eggs and the album** (T-0030): free eggs at reading milestones (streaks 7/30/100 days, every
   5th book, every 10 hours, a finished series, a full bingo card, a challenge done; bigger
   milestones give rarer eggs). Eggs hatch a surprise. An album with a card for each of the 20
   (unknown ones as silhouettes), rarity from the IUCN Red List for real animals (a small label
   with the source on each card), fantasy creatures legendary. **All 20 have a shiny variant**
   (gold, purple and night-sky twists). Duplicates: she chooses keep as a new pet / turn into
   cookies / power up her existing one; duplicates are more often shiny. She can **release a pet**
   after a clear confirm step; a shiny is never swapped, used up or released by accident: it needs a
   "This is a shiny!" warning and press-and-hold on top.
5. **The shop** (T-0031): food, outfits and accessories (hats, scarves, glasses...), home upgrades
   (cushions, lamp, mini bookcase, window with weather), eggs of every rarity (a common egg about a
   week of reading, legendary noticeably longer), toys and playtime (ball, yarn, slide...),
   habitats (forest, ice, beach, castle library...) and extra decorations for the 3D reading room.
6. **Their own page comes alive** (T-0032): creatures roam the den, sleep, sit on cushions, play
   with toys and each other; tap to pet, drag a cookie to feed, name/level/mood; tricks learned as
   they grow with a "Trick!" button; moods (happy after a long session, sleepy late at night). On
   phones little to no movement. A share picture of a creature card or the whole album.
7. **A creature on the shelf** (T-0033): one favourite creature of her choice in a fixed spot on
   the 3D shelf: sits, yawns, stretches, sleeps on a pile of books at night, looks at her when
   tapped, cheers when she finishes a book, sits next to the book she's reading, holds a tiny sign
   on streak days. Light on the phone.

## Later

More creatures when she asks for them or has collected all 20.

## Out of scope

- A creature walking along the shelf; several creatures on the shelf at once.
- Creatures that get hungry, ill or run away; anything she can lose without choosing to.
- Live Red List lookups (they need a key): the statuses are checked at build time and kept in the
  code.

## Open

Nothing waits on a decision: Sander approved the account part. Hanna and Sander asked for a way
without changing the server; the architect looked again and found no safe one (the reasons, in
plain words, are in T-0028). So its pull request still needs **one review from Sander** on GitHub;
after that it merges and deploys by itself. The game doesn't wait for it: until then each device
keeps its own choices.

The questions taken while Hanna slept were answered on 2026-11-22 (T-0027, *Questions re-asked*):
she kept the numbers and the look, and changed four things this brief already shows (welcome gift
just an egg, she chooses her first creature, pets can be released with care, all 20 have a shiny).
