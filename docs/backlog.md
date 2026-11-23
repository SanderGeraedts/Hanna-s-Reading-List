# Backlog: agreed with Hanna, waiting to be started

This is the queue of work Hanna agreed in feature chats, most of it on 22 November 2026,
that has **not been started yet**. On 23 November 2026 she asked the team to stop once the
book creatures are finished (T-0031 shop, T-0032 creatures come alive, T-0033 creature on
the shelf). On 23 November 2026 she asked for the next two items as well, the book panel
tabs and tropes & characters, which became T-0047 and T-0048. Later that day she asked for
the three shelf-and-room items — bookcases & filters, book poses and the cosy room extras —
which became **T-0051, T-0052 and T-0053**, built together on one branch because all three
are the 3D shelf and its room. The rest of the queue stays **paused until Hanna says to
continue.**

How to use it:

- Work through the items **in the order below**, one at a time.
- When an item is picked up, the architect turns it into a task file in `docs/tasks/`
  (with its size, *Done when* check and decisions), then removes the item from this list
  in the same pull request. An item marked "several tasks" may become more than one file.
- The briefs below are what Hanna agreed, including the team defaults she approved. Where
  a brief says "the architect decides", that choice was left to the team.
- Already done or in progress, so not listed: the book creatures, the world map, the
  badges, the hardcovers on phones, the header, the listening hours, the Arrange bar, the
  shelf polish, the country spellings, the book panel tabs (T-0047), tropes &
  characters (T-0048), the reading garden (T-0060 … T-0065, agreed 23 November 2026 and never
  part of this queue), the bookcases & filters, book poses and cosy room extras
  (T-0051, T-0052, T-0053), and all of better adding — covers & series (T-0070), batch scan
  (T-0071) and the wishlist (T-0072), and the better challenges (T-0090 … T-0093,
  agreed 22 November 2026 and taken out of this queue on 23 November 2026).

## The queue

### 1. Stats tab with year compare (ST1)

*Agreed 22 November 2026.*

- A new **Stats** tab, the fifth page tab next to Bookshelf, Dashboard, Challenges and
  Calendar.
- A year picker (every year with data, plus **All time**) and **compare with** another
  year: every number and chart is for the chosen year, with the other year's value next to
  it (for example "48 books ↑ 12 vs 2025").
- The big charts move here from the dashboard: the heatmap ("A year of reading"), pages per
  month, the genre flower, when I read most (rhythm), what I read (breakdown), and records.
- The dashboard gets one compact **My year** block (books, pages, hours, goal ring) with
  **Open ›** to Stats. "Books read" and "Reading goal" become part of it.
- Blocks she starred stay in Favourites.
- Check the dashboard layout migration (`dashboardLayout`): saved layouts and favourites
  that refer to removed blocks must keep working.

### 2. Year wrap-up story (ST2)

*Agreed 22 November 2026.*

- A year wrap-up she can play **any time**: "this year so far" or a past year.
- Full-screen slides she taps through: top book, author, genre, longest book, busiest
  month, pages, hours listened, new authors, the map, and so on.
- It ends in a summary picture she can share (reuse `shareImage`).
- Entry: the **Year in review** block becomes **▶ Play**, on the dashboard and on the
  Stats page.
- It opens only when she taps it (fits D-0013, no pop-ups).
- The monthly wrap-up stays as it is.

## Small follow-ups found by the team

Small fixes the testers and UX reviews found. Each can be a small task; pick them up when
the queue continues.

- **F13 (from T-0030, eggs and album; a known edge case):** two devices offline with
  different books, both hatching eggs, can reorder the hatches, so a named pet may go back
  to "waiting" (Keep restores it; nothing is lost). The full cure would be storing the hatch
  result, which D-0033 forbids. The architect may look at this again once Sander's #239
  events are live.
- **F14 (from Hanna, 2026-11-23, her phone):** in the creatures' den the cushion the creature
  sits on swallows its feet: the cushion's top is higher than the creature's seat, so the feet
  (and the bottom of the body) sink into it. Seat the creature on top of the cushion (raise it
  by the cushion's height at that spot, per growth stage) or lower and flatten the cushion,
  for every species and stage, in the den, the hatch view and the dashboard block's picture.

## Waiting for Sander

- **#165, a reading reminder at 20:00 on days without reading:** a draft pull request
  labelled `needs-sander`. Hanna asked for it (#163) and said Sander agreed on
  19 November 2026 to look at it. Only Sander can make the notification keys and put them on
  Netlify, check the changes to the server at his home (a new collection) and the scheduled
  function, and merge it. The team does not merge it or mark it ready.
