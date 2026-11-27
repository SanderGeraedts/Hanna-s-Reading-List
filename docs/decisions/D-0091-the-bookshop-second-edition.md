---
id: D-0091
title: "The bookshop, second edition: a quicker start, sixteen things to buy, staff picks, best sellers, a board of customer notes and a livelier picture"
description: "Adds to D-0084 without undoing it: 4 coins a copy and cheaper first buys, eight more things (sixteen in all), up to three staff picks in the window that earn a coin extra per copy sold, best sellers and a book of the week, kind made-up customer notes kept on a board, and a wider, moving, evening-lit room with the garden's weather and the season's decorations; still nothing stored but what she chooses."
status: Accepted
date: 2026-11-27
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [bookshop, game, dashboard]
---

# Context

Hanna lived with the bookshop (D-0084) for a day and asked for more of it: a quicker start,
more to save up for, a way to show off the books she loves, and a shop that feels alive when
she looks in. She went through it with Claude in a feature chat on 27 November 2026.

**How this relates to D-0084.** This decision **adds to** D-0084 and leaves it Accepted:
§1–§3 (her reading stocks the shelves, customers buy while she is away, nothing is lost by not
opening it), §5's rule that only her choices are saved and only as `s:` keys, §6 (every number
in one module) and §8 (a block, not a tab) all stand. It changes three points:

- **§4:** there are now sixteen things to buy, not eight.
- **§5:** besides `s:up:<thing>`, the shop now also saves staff picks as `s:pick:` keys, so the
  log is no longer limited to eight keys for ever (still one event per thing or per book).
- **§7:** still flat and drawn in code, with nothing to fetch, but the open shop now moves.

Where this record and D-0084 disagree on those points, this one wins. Read the two together.

# Decision

1. **A quicker start.** A copy sells for **4 coins** instead of 2, and the first buys are
   cheaper: the sign 30, the till 60, the second shelf 120. The shop is worked out again from
   her reading log each time, so the new price counts **from opening day** (26 November 2026),
   not from today. Hanna agreed to that: her shop is richer than it was, and nothing she bought
   is lost.

2. **Sixteen things to buy.** The eight of D-0084 plus fairy lights (1600), a rolling ladder
   (1900), a children's corner (2300), a record player (2700), a window seat (3200), a fireplace
   (3700), a shop dog (4300) and a bookbinding table (5000). Every one of them shows in the
   picture, as D-0084 §4 promised for the first eight.

3. **Staff picks.** She can put up to **three** of her books in the shop window. A pick is a
   `place` event in the creatures choice log with the key `s:pick:<short hash of the book id>`
   and the fields: on or off, the book, `since` (the day first picked) and `until` (the day she
   took it out). The newest event per key wins; picking a book again keeps its first `since`,
   so taking a pick out of the window **never takes back a coin** already earned.
   - A pick is **not** sold first: it sells like any other book, and earns **+1 coin per copy
     sold** on the days it was picked.
   - A pick that **sells out leaves the window by itself.** That is worked out, not written,
     and its place is free. Picking a new book when the window is full writes `off` for the
     oldest sold-out pick.

4. **Best sellers and a book of the week.** The three best-selling books since opening day
   wear a ribbon on their spine; the book that sold most in the last seven days is the book of
   the week.

5. **Customer notes on a board.** Made-up, always kind notes from customers (also about a book
   she rated low), written about each day's three best sellers, and the same every time for a
   given day and book. They hang on a magnetic board in the shop: **every note stays**, newest
   first, with "Older notes" for the rest. Hanna chose "every note stays" over keeping only the
   ones she picks. The notes are worked out again from the shop's own sales each time, so
   **nothing is saved** for them.

6. **A livelier picture.** A wider room with a door and a bell, a rug, plants, frames, a
   hanging light, piles of books and the notes board. Customers walk in, browse, pay at the
   till and leave with a book; the cat wanders along the counter, the dog wags, the tea steams.
   - **Evening** from 19:00 to 07:00, the same hours as her bookshelf room: lamp-lit, an "Open
     late" sign, and a night owl reading in the chair.
   - **The window shows the garden's weather** for the day (`weatherOf`, D-0083).
   - **Decorations by date:** Sinterklaas from 15 November to 5 December, Christmas all of
     December, autumn and Halloween in October, and her birthday (from the date kept on her
     device only, D-0039).
   - In the open shop, **tap a shelf** to zoom in and **tap a book** to see how many copies are
     left.

7. **The dashboard block stays a still picture.** It adds one customer note and the book of the
   week; the moving picture is only in the open shop.

8. **What does not change.** Still no timers, no caps, no collect button and no streaks
   (D-0084 §3). Coins and cookies stay separate, and the shop still writes no `buy` events.
   Nothing needs Sander: no change on the server, only `s:` keys in the log the app already
   keeps.

# Rationale

The first edition was slow to get going and ran out of things to want after eight buys. A
higher price per copy fixes the start without adding a timer, and counting it from opening day
keeps the shop worked out purely from her reading, which is what makes D-0084 §3 hold.

Staff picks and the notes make the shop about **her books**, which was the point of it. A bonus
per copy sold rewards picking a book she has in stock without bending which books sell. Working
the notes out from the sales instead of storing them keeps the log small and means nothing can
get out of step between devices.

# Consequences

- `src/lib/bookshop/numbers.ts` holds the new price, the sixteen things, `MAX_PICKS` and
  `PICK_BONUS`; `picks.ts` reads and writes the `s:pick:` keys; `shop.ts` works out the bonus,
  the best sellers, the book of the week and the notes; `season.ts` the decorations by date.
- The open shop is a moving scene, so it does a little more work while it is open; the
  dashboard block does not.
- Coin totals jumped on the day this shipped, because of §1. That is expected.

# Guidance for agents

- **Preserve** D-0084 §1–§3, §5's "only her choices are saved", §6 and §8.
- **Never store a note, a best seller, a coin or a copy.** If it seems to need saving, work it
  out from her reading log and the shop's choices instead.
- **Never take back a coin.** A change to picks must keep `since` from the first pick and count
  the bonus only on picked days.
- **Never write a `buy` event** and never touch cookies.
- **Notes are always kind,** whatever the rating. A note that could read as unkind about one of
  her books is a bug.
- **Stop and ask** before anything that would need a change on Sander's server, a timer, a cap
  or a streak.
