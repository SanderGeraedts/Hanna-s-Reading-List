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
  (T-0051, T-0052, T-0053), all of better adding — covers & series (T-0070), batch scan
  (T-0071) and the wishlist (T-0072) — the Stats tab with year compare and the year wrap-up
  story (T-0080 and T-0081, taken off this queue on 23 November 2026 and built together on one
  branch, because the wrap-up's entry point sits on the Stats page), and the better challenges
  (T-0090 … T-0093, taken off this queue on 23 November 2026 and built together on one branch,
  because all four are the Challenges page).

## The queue

Empty: everything Hanna agreed on 22 November 2026 has been taken off it and built. The
small follow-ups below are what is left.

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
