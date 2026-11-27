---
id: D-0092
title: "The dashboard is about today; on a phone, a page bar at the bottom"
description: "The dashboard keeps only what is about today or what to read next; the looking-back blocks move to the Stats page and A–Z and Book bingo stay only on Challenges, so each thing lives in one place. On a phone (720 px wide or less) a bar at the bottom with Shelf, Dashboard, Calendar, Challenges and More replaces the tabs at the top."
status: Accepted
date: 2026-11-27
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [dashboard, stats, phone, navigation]
---

# Context

Hanna said three things about getting around the app on her phone: it took **too many taps**
to get anywhere, the **dashboard was too long**, and **the same things showed in several
places** (her year on the dashboard and on Stats, bingo and A–Z on the dashboard and on
Challenges). The tab row at the top was full and hard to reach with a thumb.

# Decision

1. **The dashboard is about today.** It keeps: Waiting for you, Currently reading, This week,
   Finish by, Lent out, Give it another try, Monthly challenge, Fact of the day, Creatures,
   Garden, Bookshop, What next?, New for you and Newly added.
   - **This week** is the calendar block cut down to the current week, with "Open ›" for the
     whole month.
   - The lone "Today" heading is gone.

2. **Each thing lives in one place.** These blocks leave the dashboard (`OFF_DASHBOARD` in
   `src/lib/dashboardLayout.ts`):
   - My year, Favourite authors, Series, Want-to-read pile, My ratings, On this day, Badges,
     Tropes & characters, Cover wall and Where your books are set go to the **Stats** page, in
     a new section "Your books, all the years". Year in review was already there.
   - A–Z and Book bingo stay only on the **Challenges** page, where they already were.

3. **Saved layouts still load.** A saved dashboard order or a star that names a block that
   moved loads without it; nothing she arranged breaks.

4. **On a phone (720 px wide or less), a page bar at the bottom:** Shelf, Dashboard, Calendar,
   Challenges and More. **More** opens Stats, Creatures, Garden and Bookshop (Bookshop opens
   the dashboard with the shop open). The tabs at the top are hidden on a phone. The round
   quick-update button, the zoom buttons and messages move up above the bar
   (`--bottom-bar-h`), so the bar never covers them.

5. **On a computer nothing changes:** the tabs stay at the top.

# Rationale

A bar at the bottom is where a thumb is, and four pages plus More fit it without crowding.
Cutting the dashboard to today makes it short enough to take in at once, and giving each
looking-back block one home on Stats means she never wonders which copy is the real one.
Nothing was deleted: every block still exists, at most one tap further away.

# Consequences

- The Stats page is longer; it is the page for looking back, so that is where length belongs.
- Tests that counted dashboard blocks follow the new list.
- Anything fixed to the bottom of the screen on a phone must sit above `--bottom-bar-h`.

# Guidance for agents

- **Preserve one home per block.** Don't put a block back on the dashboard that lives on Stats
  or Challenges; if Hanna asks for it there, move it, don't copy it.
- **Keep old saved layouts loading.** A layout that names an unknown or moved block skips it
  and never fails.
- **On a phone, keep fixed things above the bar** with `--bottom-bar-h`.
- **Don't change the computer layout** to match the phone without asking Hanna.
