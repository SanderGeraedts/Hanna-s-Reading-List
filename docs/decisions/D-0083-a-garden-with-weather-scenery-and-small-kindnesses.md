---
id: D-0083
title: "The garden gets weather invented from the date, scenery that arrives with her reading, and small kindnesses that are never needed"
description: "Three things that make the garden feel alive without anything new being saved on the server: a day's weather worked out from the date and the season and never fetched, five to seven pieces of scenery that arrive at reading milestones (never bought, never placed), and three small kindnesses — water, seed, sweep — each remembered as one `place` event with a `g:k:` key in the existing choice log, with nothing that wilts, no streak and no nag."
status: Accepted
date: 2026-11-26
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [garden, game, interaction]
---

# Context

The garden has been read, not arranged, since D-0071: plants stand in the order she finished
the books, she can look at another season or at the night, and the only thing she places is a
garden item (D-0052). It is calm, and it is also a little still — the same picture every day
until a book is finished.

Hanna asked for a garden that feels alive. Talked through in a feature chat on 2026-11-26,
three things were agreed, and one thing was explicitly turned down.

**Real weather was considered and refused.** A weather service means a key or an account, a
call that can be slow or down, and two devices that disagree while one of them is waiting.
Weather invented from the date costs nothing, is the same on her phone and on the computer,
can never fail, and can be tested — so the April showers really are April showers every year.
She chose that over real weather.

Everything here stays inside the existing route and the existing log (D-0034, D-0052 §1):
**no change in `deploy/nas/`, no new field, nothing waiting for Sander.**

# Decision

1. **The garden has weather, invented from the day.** Each `yyyy-mm-dd` day has one weather —
   bright, cloudy, showers, rain, mist, snow or frost — drawn from that **month's** own
   weighted list with the hash the creatures already use (D-0033 §7). Showers in April, long
   bright days in July, mist in November, snow in the deep of winter. It is **never fetched**,
   it never waits for the internet and it never fails, and the same day gives the same weather
   on every device, for ever.
2. **Weather sits beside the season, never against it.** Winter's snowy ground stays the
   season's (D-0050); `snow` only adds the falling flakes to it. A day that does not exist
   gets the quietest sky there is rather than nothing, so no caller has to handle a null.
3. **Both views show it, cheaply.** The flat garden draws one layer of plain shapes — a wash
   of sun, a veil of cloud, slanting lines of rain, a band of mist, flakes, a cold shine of
   frost. The 3D garden reuses the one Points object it already had for snow and leaves, and
   the day's weather only changes its colour, its size, how fast it falls and how much of the
   sun gets through. Nothing new is loaded and nothing is a texture (D-0051 §2, §3, §6).
4. **Weather is a look, never a setting.** Like a season or the night (D-0071 §6), the "Have a
   look" row switches it, the card says what she is looking at, **Now** puts it back, and it
   is gone when she leaves the tab. The dashboard's block always shows the real day.
5. **Scenery arrives with her reading.** Seven pieces — a hedge, stepping stones, a fence, a
   brook, a birdhouse, a potting shed and a beehive — **arrive on their own** at reading
   milestones, some from finished books and some from the days she read at all, so a long slow
   book still brings something. They are never bought, never placed and never moved, and once
   a piece has arrived it stays.
6. **Scenery is worked out, not saved.** It comes from her shelf exactly as the plants do
   (D-0050 §1): books finished and reading days in, scenery out. Nothing about it is written
   anywhere, so every device shows the same garden with no sync at all.
7. **Scenery is a different thing from the garden items she places.** The items of D-0050 §8
   (`g:i:` keys, placed with a tap, taken away again) are untouched: no id, no key and no
   place in the garden is shared. Scenery stands in the grass border round the beds; items
   stand in the strip along the bottom.
8. **An arrival is said quietly, once.** The garden says "A hedge has grown up along the
   back." under the drawing the first time she sees it, the line is in the screen-reader
   sentence, and "Waiting for you" can carry it. **No pop-up** (D-0013), and the one line
   about what is on its way is never a goal: nothing has to be done for it.
9. **Three small kindnesses: water a plant, scatter seed, sweep the path.** Each gives the
   garden a little something for the day — a plant comes into flower, a bird comes down, a
   butterfly follows the swept path — in the garden of the year she is reading in.
10. **They are never needed and never a chore.** Nothing wilts and nothing dies (D-0050),
    there is no streak, no count, no reminder and no nag. The gift lasts the day and then
    quietly goes. A month of not touching them costs **exactly nothing**: the garden is then
    the garden of someone who never watered, which is a perfectly good garden.
11. **A kindness is remembered the way a swapped bingo square is** (D-0067): one `place`
    event in the existing creatures choice log (D-0034), through the route that is already
    live. The key is `g:k:<kindness>` with the day in `day`.
12. **The log can never grow because of this.** `place` is a setting kind, so `mergeLogs`
    keeps only the newest event per key: **at most one event per kindness, three in all, for
    ever**, however many years she waters for. The `g:k:` prefix cannot collide with the
    garden's `g:i:` and `g:p:` (D-0052 §2), bingo's `b:` (D-0067), the den's `home:`, or the
    marks `f:seen` (D-0079) and `c:earned`.

# Rationale

Weather is the cheapest thing that makes a garden feel like a place: nothing in it is earned,
nothing is lost, and it is different when she opens the app tomorrow. Inventing it from the
date gives all of that with none of a weather service's costs, and makes it testable, which a
real sky never is.

Scenery that arrives is the opposite of a shop: there is nothing to choose, nothing to
arrange and nothing to regret, and it marks her reading in the place where her reading already
lives. Deriving it from the shelf keeps the garden's rule — only choices are saved (D-0050 §1)
— and means it needs no sync to be the same everywhere.

The kindnesses are the one thing here she can *do*, and the whole point is that she never has
to. A garden that punishes her for a week away is a garden she will come to dread; one that is
exactly as lovely either way is one she can visit when she feels like it. Keeping one event
per kindness rather than one per day means the log is bounded by design and not by luck.

# Consequences

- The garden looks different most days, with nothing saved and nothing fetched.
- Her reading now brings two kinds of thing: items she places (`g:i:`) and scenery that
  arrives on its own. They never meet.
- The choice log grows by at most three events in total for the kindnesses, ever.
- The 3D garden gains one mesh for all the scenery and keeps its budget (60 draw calls,
  20,000 triangles) in every weather.
- A kindness done on one device shows on the other as soon as the log syncs, like everything
  else in that log.

# Guidance for agents

- **Never fetch weather.** It is worked out from the day in `src/lib/garden/weather.ts`;
  changing that to a service is a new decision and needs Sander.
- Weather, like a season and the night, is a **look**: never save it, and never let the
  dashboard's block follow one.
- Scenery is derived and never saved. Do not give it a key, a slot or a place in the choice
  log, and never reuse a garden item's id for a piece of it.
- A kindness writes exactly one `place` event with a `g:k:` key and the day. Never add a
  second key per day, a count, a streak or a reminder, and never make anything in the garden
  wilt, die or expire because a kindness was skipped.
- Anything the garden wants to save that is not a spot, a swap or one of these marks is a new
  decision and a `needs-sander` task (D-0052 §6).
