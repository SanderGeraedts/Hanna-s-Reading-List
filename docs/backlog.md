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
  part of this queue), and the bookcases & filters, book poses and cosy room extras
  (T-0051, T-0052, T-0053).

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

### 3. Better adding: covers & series (AD1)

*Agreed 22 November 2026.* (Files: `AddBookDialog.tsx`, `AddFollowUp.tsx`,
`CoverPicker.tsx`.)

- After she taps a search result: a row of covers from all its editions (best first), plus
  **📷 Take a photo** of her own copy. She picks one before adding.
- A follow-up step **Part of a series?** with a rule-based guess (no AI, D-0017): the title
  matches one of her series on the shelf, or there are numbers in the title. One tap to
  confirm, or she types it.
- Not doing (for all of better adding): importing from Goodreads or StoryGraph.

### 4. Batch scan (AD2)

*Agreed 22 November 2026.* (Files: `BarcodeScanner.tsx`, `AddBookDialog.tsx`.)

- The barcode scanner stays open; each scanned book goes into a list with its cover.
- At the end: one **How I have it** for all of them (changeable per book), a price field per
  book (empty = no price; D-0024's rules: a price only for paperback, hardcover or e-book),
  and **Add all**.
- The same book scanned twice is added once; a book already on the shelf is marked.

### 5. Wishlist (AD3)

*Agreed 22 November 2026.*

- Its own list, **not on the shelf**.
- A dashboard block **Wishlist**, and **Add to wishlist** in + Add.
- Each wish has a cover, title, price and a link to buy it.
- Wishes are not in the TBR pile, the stats, suggestions, the map and so on.
- **I bought it ›** moves it to the shelf and asks how she has it and the price.
- Stored with her books and synced (an optional field or flag, D-0002), unless that needs a
  server change: then flag it for Sander, or pick another way.

### 6. Better challenges (CH1–CH4)

*Agreed 22 November 2026.* Several tasks. (Files: `ChallengesPage.tsx`, `ownChallenges.ts`,
`bingo.ts`.)

- **CH1, overview and rewards:** a row of small progress rings at the top of the Challenges
  page, one per challenge (tap one to jump to it). Finishing a challenge gives a short
  confetti burst (once, on the first visit after finishing; not a pop-up, D-0013) and a
  medal in the badge collection.
- **CH2, new ready-made challenges:**
  - *Around the world:* books set in 12 different countries this year (uses the places and
    the map);
  - *Seasonal:* by calendar season, for example 3 cosy or spooky books in autumn, 5 beach
    reads in summer (by genre, and by tropes (D-0042));
  - *Minutes a day:* at least 20 minutes a day read or listened, as a month grid (paper
    pages count as about 1.5 minutes a page, listen-only books their real minutes);
  - *Read the series:* pick series to finish this year, with progress per series.
- **CH3, own-challenge rules:** a pages or hours goal; author; decade published; trope;
  rated 4 or more; and mixing two rules (both must hold). Check how challenges are saved:
  `saveChallenges` in `src/server/shelf.ts` is a path only Sander may approve. If the server
  checks rule kinds, it needs Sander, or the new rules are encoded on the app side.
- **CH4, bingo swap:** on a card with nothing ticked yet, tap a square, then **Swap**, and
  pick from all squares. Ticked squares can't be swapped. Saved with her account; if that
  needs a server change, tell Hanna first (it would need Sander).

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
