---
id: T-0020
title: "Let her drag blocks within Favourites in Arrange, in an order of their own that follows her to every device"
description: "In Arrange the ★ Favourites blocks get the same ⠿ handle, drag and arrow keys as the other sections; a move reorders layout.favourites (separate from the block's own section), and the account sync sends it as an unstar and re-star of the shortest tail, worked out against the account's list, so a reorder isn't undone by the next pull and no server change is needed (D-0028)."
status: Doing
depends_on: []
decisions: [D-0003, D-0005, D-0014, D-0020, D-0022, D-0028]
raised_on: 2026-11-22
done_on: ""
result: ["https://github.com/SanderGeraedts/Hanna-s-Reading-List/pull/229"]
---

# Goal

From a feature chat with Hanna (2026-11-21). The dashboard has a **★ Favourites** section on top:
copies of the blocks she starred with ☆ in Arrange, in the order she starred them
(`layout.favourites`), dealt over two columns by `favouriteColumns` (left, right, left, …; on a
narrow screen `singleColumn` makes that one list in the same order). In Arrange the blocks in the
four sections have a ⠿ handle to drag them, and arrow keys to move them, but the Favourites copies
only have the star (`src/components/Dashboard.tsx`, "these are copies, not dragged from here"). She
wants to put her favourites in the order she likes, the same way as in the other sections.

## 1. Moving within Favourites

- In Arrange, every block in Favourites gets the **⠿ handle** next to its ★, as in the sections
  (no × Hide there: hiding stays in the block's own section).
- **Dragging** a Favourites block works like in a section: the block follows the pointer, a drop
  line shows where it will land (before a block, or at the end of a column), and letting go puts it
  there. A drop only lands **within Favourites**: Favourites blocks don't go into a section, and
  section blocks don't go into Favourites (the ☆/★ star is the way in and out).
- **Where it lands:** `favouriteColumns` deals the list out over two columns, so a place in the
  grid is a place in the list. Dropping into column `c` (0 left, 1 right) before the block at row
  `r` of that column (counting without the dragged block) puts the block at list position
  `2r + c` of the others, or at the end when that is past the end. The other favourites keep their
  order and are dealt out again (some may switch column); that is how the section works by nature.
  On a narrow screen (one column) the place in the column is the place in the list.
- **Keyboard** on the handle, like the sections:
  - two columns: **Up / Down** move it one row up or down in its column (list position −2 / +2);
    **Left / Right** move it to the other column on the same row (list position −1 from the right
    column, +1 from the left column, when there is a block or room there);
  - one column (narrow): **Up / Down** move it one place (−1 / +1); Left / Right do nothing;
  - **Shift + arrows do nothing** in Favourites (there is no other section to go to);
  - at an edge nothing happens, and keys are not swallowed then (as now: no `preventDefault`);
  - **focus stays on the moved block's handle** after a move, also when it changes column, so she
    can press the key again.
- The handle has an accessible name that says it moves the block within the favourites (the UX
  designer words it, in the style of the sections' "Move <block>: drag it, or use the arrow keys").

## 2. An order of its own

- A move in Favourites changes **only** the order of `layout.favourites`: never
  `layout.sections`, `hidden` or `folded`, and it never adds or removes a favourite.
- A move in a section changes **only** that section's columns, never the order of the favourites
  (as now).
- Starring a block still puts it **at the end** of Favourites; unstarring takes it out; Reset keeps
  the favourites and their order (as now, `resetLayout`).
- While a block is dragged in one place, its copy in the other place doesn't move or show as
  dragged (the drag knows whether it started in Favourites or in a section).

## 3. The order follows the account (D-0028)

Today a reorder is **not** synced, and is even **undone**: `favouritesChange` only sees added and
removed blocks, so `setLayout` sends nothing, and the next pull (opening the dashboard, or coming
back to it) adopts the account's list in the account's old order. The server route
(`pb_hooks/favourites.pb.js`) can only unstar and append. Changing it needs Sander, so:

- A move is queued in the device's unsent list as a **move** (the block, and the blocks before it in
  her new order).
- When it goes up, the device **reads the account's list first**, places the block right after the
  last of those blocks still on the account (first when none is), works out the **shortest tail**
  to unstar and star again (a move to the end: only the block), and replaces the move in the queue
  by `{ remove: tail }` and then `{ add: tail }`, sent one at a time like other changes (so they
  survive being offline or a closed app).
- A block unstarred on the account meanwhile is not brought back; a move of a block no longer on
  the account is dropped; stars made elsewhere stay.
- Signed out, or while the server doesn't keep favourites, the order stays on the device.
- After it has gone up, the next pull leaves her order as it is, here and on her other devices.

# Done when

- Unit tests in `src/lib/dashboardLayout.test.ts` for the pure moving functions (names are the
  developer's; e.g. `moveFavourite(layout, id, column, row)` and `favouritePlace(layout, id)`):
  - with favourites `[a, b, c, d, e]` (columns `[a, c, e]` / `[b, d]`): moving `e` to column 0
    row 0 gives `[e, a, b, c, d]`; moving `a` to column 1 row 1 gives `[b, c, d, a, e]`; moving `a`
    past the end of column 1 gives `[b, c, d, e, a]`; the result's `favouriteColumns` shows the block
    at the column and row it was dropped on whenever the list is long enough;
  - the keyboard steps: Up/Down are −2/+2 with two columns and −1/+1 with one; Left/Right are −1
    from the right column and +1 from the left one; at an edge the layout is unchanged;
  - a favourites move leaves `sections`, `hidden` and `folded` deep-equal, and the same set of
    favourites; a section move (`moveBlock`) leaves `favourites` in the same order;
  - `cleanLayout` keeps the favourites' order (saved and loaded again).
- Unit tests in `src/lib/favourites.test.ts` for working out a move against the account's list
  (e.g. `moveToChanges(account, id, before)` giving `[]` or `[{ remove: tail }, { add: tail }]`):
  - applying the two changes with `applyChange`, one after the other, gives the account's list with
    the block right after its last anchor still there, every other block in the same order;
  - a move to the end gives a tail of just the block; the tail is never longer than needed (a test
    on a move down and one on a move up);
  - a block unstarred on the account meanwhile is not in the tail and stays unstarred; a block
    starred elsewhere stays; when the moved block is no longer on the account the result is `[]`;
    when none of the anchors is on the account the block goes first.
- Two-device tests in `src/lib/favouritesSync.test.ts` (the existing in-memory stand-in for
  PocketBase, real `favouritesStore.ts` on top), via `useDashboardLayout`:
  - a reorder on device A is on the account in A's order, and device B shows that order after its
    next pull;
  - **a reorder is not undone by A's own next pull** (the bug today);
  - a reorder made offline goes up when the server is back, also after the app was closed;
  - device A reorders while device B unstars one of the blocks A moves past: after both are sent the
    block stays unstarred and A's moved block is where A put it;
  - device A reorders while device B stars a new block: both stay, and no block is in the list
    twice;
  - a reorder sends only stars and unstars, never the shelf (like the existing "never touches the
    books" test), and never more than one save at once (`mostAtOnce` is 1);
  - signed out, a reorder stays on the device and the server is never asked.
- A component test for the Dashboard in Arrange (with the server functions mocked like the other
  dashboard tests): each Favourites block has a handle with an accessible name and no Hide button;
  arrow keys on it change the Favourites order and not the section's; Shift+arrows do nothing there;
  focus stays on the moved block's handle after a Left/Right move; outside Arrange there are no
  handles.
- Clicked through on a local dev server with no backend (`pnpm run dev`, never a production
  `POCKETBASE_URL`; layout seeded in localStorage `hannas-reading-list:dashboard:local` with 4–5
  favourites), screenshots at 390×844 and 1280×800 on **lavender and midnight** in
  `docs/tasks/T-0020-screens/`: Favourites in Arrange with the handles, a drag in progress with the
  drop line, the order after the drop, the same blocks in their own section unchanged, and after
  Done and a reload the new order still there. No console errors.
- Design checks (UX designer) added under *Design* and checked on the screenshots.
- `pnpm test`, `pnpm run build` and `pnpm exec harness check` pass.

# Notes

- **Group 1** (app code only), nothing for Sander: no new stored field, no change to `Book`, the
  shelf or its sync (`shelfMerge.ts`, `src/server/shelf.ts`, `library.ts`), `src/server/` or
  `deploy/nas/`. The favourites route on the server stays as it is (D-0028 explains why a new
  `order` field there was not chosen: it would need Sander). T-0009 is still *Doing* only for its own
  remaining check; where the server doesn't keep favourites, this works on the device alone.
- **Files:** `src/lib/dashboardLayout.ts` (the pure moving functions next to `favouriteColumns`),
  `src/lib/favourites.ts` (working out a move against the account's list; the unsent queue's
  change type gains a move), `src/components/useDashboardLayout.ts` (`setLayout` queues a move when
  the favourites have the same set in another order; `flush` turns a move into the two changes after
  reading the account; `readUnsent` keeps a move), `src/components/Dashboard.tsx` (the handle,
  drag and keys in the Favourites grid, a drop function for that grid, and a drag that knows its
  place), `src/styles.css` (reuse `.block-handle`, `.drop-before`, `.drop-end`).
- **The drag's drop place:** the sections' `dropAt` only looks at `.dash-section-grid`; the
  Favourites grid needs its own (or a flag), and its blocks need their own data attribute so the
  sections' drop never lands on a Favourites copy and the reverse.
- **A star and a move in one `setLayout`** don't happen (the star button and the handle are
  separate), but if the set changed, send the stars and unstars as now and no move.
- **Queue from an older app version:** an older version reads a queued move as an empty change and
  sends nothing harmful; no migration needed.
- **Hidden blocks:** a block hidden on this device is not in its local favourites (`cleanLayout`)
  but may be on the account; the anchors make the move land in the right place among the blocks she
  can see, wherever the hidden one is.
- D-0014: no new hint text; the existing "Star blocks with ☆ to see them here, on top." stays.
  D-0020 / D-0022: tokens only, readable on lavender and midnight.

## Choices made by the team

Hanna agreed on the scope above and asked to take the recommended option for anything still open.
These were taken by the architect; the UX designer may refine the visual ones under *Design*.

1. **The order syncs through the route that exists** (unstar and re-star the shortest tail, worked
   out against the account's list when sent), not a new field on the server, so nothing waits for
   Sander (D-0028).
2. **Today a reorder is undone by the next pull;** this task fixes that as part of syncing the
   order.
3. **Favourites and sections stay apart:** no dragging from Favourites into a section or the other
   way; the star is the way in and out.
4. **Only the handle in Favourites, no × Hide there:** hiding happens in the block's own section.
5. **A drop place is a list place** (`2 × row + column`); the other favourites are dealt out again
   and may switch column. No live reshuffle while dragging: the drop line shows where it lands, as in
   the sections.
6. **Keys in Favourites:** Up/Down by row, Left/Right to the other column, Shift+arrows do nothing;
   one column on a narrow screen.
7. **Focus stays on the moved block's handle** after a keyboard move, also across columns.
8. **A new star still goes to the end**, and Reset keeps the favourites' order.
9. **A decision record (D-0028)** for the separate order and how it syncs, so a later change doesn't
   quietly send the whole list or change the server route on Hanna's instance.

Added by the UX designer (2026-11-22), taking the recommended option each time:

10. **A drop past the end shows its line where the block will really land.** In two columns a
    drop below the last block of a column can land at the end of the list, and the end of the list
    may be in the other column. The drop line then goes at the end of that other column, so the line
    never shows a place the block won't take.
11. **A screen reader hears where the block went** after every move in Favourites (keys or drag)
    through one hidden polite status line. In two columns it names the column and row, because
    that is the order a screen reader reads the grid in (left column first). The sections stay as
    they are; giving them the same line would be a separate small task.
12. **A move that hasn't gone up yet shows nothing**, just like a star today: no "not synced"
    mark, no error text (D-0014). The new order shows at once on this device and stays there after
    a reload. It goes up by itself when the server can be reached.
13. **The handle stays with 1 favourite**, even though nothing can move. It keeps the tools the
    same on every block, and a drag or key there just does nothing.
14. **A drag that goes outside Favourites keeps its line in Favourites**, at the nearest place,
    and letting go drops it there, as in the sections (letting go always lands where the line is;
    there is no cancel zone).

# Design

The Favourites grid in Arrange gets the same look and behaviour as a section grid in Arrange. No
new colour, text size, spacing or corner value (D-0020), no new visible text (D-0014). Everything
below that isn't listed under **What differs** is exactly the same as in a section: reuse
`.block-tools`, `.block-handle`, `.dash-block.moving`, `.dash-block.drop-before` and `.drop-end`
as they are.

## What stays the same as in a section

- **Block tools:** top right of each block, `position: absolute; top: 0.6rem; right: 0.6rem`, gap
  0.3rem, buttons on `--surface-solid`. The card gets the same dashed `--accent-line` outline in
  Arrange (already true, because the Favourites grid has `dashboard-grid arranging`).
- **The handle:** `button.btn.icon.small.block-handle` with `<span aria-hidden>⠿</span>`,
  `title="Drag to move"`, `cursor: grab` (`grabbing` while dragging), `touch-action: none`. On a
  touch screen it grows to the 44 px tap size like every `.btn.small` (`pointer: coarse`).
- **While dragging:** the block follows the pointer with `transform: translate(dx, dy)` and gets
  `.moving` (raised, `opacity: 0.9`, the big shadow). The page scrolls along near the top and bottom
  edges, as in the sections.
- **The drop line:** the 3 px gold (`--accent`) bar with rounded ends, either above a block
  (`.drop-before`, sitting in the gap between two blocks) or at the end of a column (`.drop-end`).
  The Favourites grid has the same `gap: 1.25rem` and column gap as a section grid, so the line
  sits in the same place.
- **Focus:** the gold focus ring every button has.
- **Outside Arrange** there are no tools at all, as now.

## What differs from a section

1. **Tools are ⠿ then ★, no ×.** Order: handle first, then the star (as in a section, without the
   × after it). The star does what it does now (takes the block out of Favourites).
2. **Accessible name of the handle:** `Move <block> within the favourites: drag it, or use the
   arrow keys`, e.g. "Move Finish by within the favourites: drag it, or use the arrow keys". There is
   no "(Shift for another section)", because Shift does nothing here. The same name on a narrow
   screen (the arrow keys still work there).
3. **The drag only knows Favourites.** The Favourites grid gets its own class (e.g.
   `dash-favourites-grid`) and its blocks their own data attribute (e.g. `data-favourite`), and its
   drop function only looks at that grid. So:
   - a drag that starts on a Favourites handle only ever shows its line inside Favourites; when the
     pointer goes over a section, the line stays at the nearest Favourites place (nearest column,
     then before the first block whose middle is below the pointer, or that column's end);
   - a drag that starts in a section never shows a line in Favourites, as now;
   - only the dragged copy gets `.moving`; the same block in its own section stays where it is and
     looks normal (and the reverse).
4. **The drop line in two columns.** The line follows the pointer column by column, like a section:
   before the block whose middle is below the pointer, counting without the dragged block, or at the
   end of that column. The place it stands for is list place `2 × row + column` of the other
   favourites (the architect's rule). Only one case differs from a section:
   - **past the end:** when that place is past the end of the list (dropping below the last block of
     a column with not enough blocks after it), the block goes to the end of the list. The line then
     shows at the end of the column where the last place is: the left column when the other
     favourites are an even number, the right column when odd. So with 3 other favourites, a drop
     below the left column's last block shows the line at the end of the right column (choice 10).
   - After the drop the others are dealt out again and some may switch column; there is no
     animation for that (the dashboard has none for the sections either).
5. **One column on a narrow screen** (the existing `(max-width: 860px)`, so the phone at 390): the
   favourites are one list in their order, the line is before a block or at the end of the list,
   and the place is the list place. Left/Right do nothing.
6. **Keys** as in the task: two columns, Up/Down ±2, Left from the right column −1, Right from the
   left column +1; one column, Up/Down ±1. Shift+arrows do nothing. At an edge nothing happens and
   the key is not swallowed. Focus stays on the moved block's handle, also when it changes column
   (the handle element must be found again after the re-render, by its block, and focused).
7. **A status line for screen readers** (new; choice 11). One
   `<p className="visually-hidden" role="status" aria-live="polite">` inside the Favourites section,
   present (empty) for the whole time she's in Arrange, so it is in the page before the first
   message. After every move in Favourites that changed the order (keys or drag) it gets:
   - two columns: `<block>: left column, row 2 of the favourites.` (or `right column`), with the row
     counted from 1;
   - one column: `<block>: place 2 of 5 in the favourites.`
   Each message replaces the last one (if the same text comes twice, e.g. moving back and forth,
   clear it first so it is read again). Nothing is said when nothing moved (an edge, or a drop where
   it already was). The text is never visible. It is emptied when she presses Done.

## Phone (390) and computer (1280), lavender and midnight

- **1280:** Favourites is two columns, the handle and star top right of each block. The drop line
  runs across one column's width.
- **390:** one column, the blocks the full content width; the tools are 44 px each (two of them, so
  they take less room than the three in a section and never cover the block's title more than a
  section's do).
- **Both wallpapers:** the tools and blocks are walnut (`--surface`, `--surface-solid`), the same on
  lavender and midnight. The drop line is the gold `--accent` the sections already use on both
  wallpapers, so no new colour pair for `colours.test.ts`. The "★ Favourites" heading sits on the
  wallpaper as now.

## States

- **0 favourites, in Arrange:** as now: the heading and the empty note "Star blocks with ☆ to see
  them here, on top." No handles, no line, no status message.
- **1 favourite:** the block has ⠿ and ★ (choice 13). A drag shows the line before or after it in
  its own column; letting go changes nothing, saves nothing and says nothing. Arrow keys do
  nothing.
- **2 favourites:** at 1280, side by side; Left/Right swaps them, Up/Down do nothing. On the phone
  one above the other; Up/Down swaps them.
- **Many favourites (taller than the screen):** the page scrolls along while dragging near the top
  or bottom, as in the sections.
- **A favourite that is hidden on this device** isn't in Favourites (as now); "Waiting for you" is
  shown in Arrange even when nothing waits (as now), so it can be moved too.
- **Favourites folded:** in Arrange Favourites is always open (the head is disabled), as now.
- **Offline, a move that hasn't gone up, or a send that failed:** she sees nothing different
  (choice 12). The order shows at once, stays after a reload, and goes up on its own later, like a
  star. No banner, mark or error text.
- **Another device changed the favourites meanwhile:** when the next pull brings the account's list
  (after her move has gone up), the grid simply shows it, as now for stars; no message.
- **Signed out:** the same look; the order stays on this device.

## Design checks (on the screenshots and in the dev server)

- In Arrange each Favourites block has exactly two tools, ⠿ then ★, top right, the same size and
  look as in the sections; no × in Favourites; no tools outside Arrange. The same height as the
  sections' tools in the 390 shots (36 px on a touch screen; changed in the review below).
- A drag in Favourites shows the 3 px gold line, the dragged block raised with its shadow, and the
  same block in its own section unchanged; at 1280 the line is in one column; at 390 the
  favourites are one column.
- A drop below the last block of a column, when the block will land in the other column, shows the
  line at the end of that other column, and after the drop the block is there.
- A drag that goes over a section keeps its line in Favourites; a section drag never shows a line
  in Favourites.
- The handle's accessible name is "Move <block> within the favourites: drag it, or use the arrow
  keys"; after a key move the status line reads the column and row (two columns) or the place
  (one column), and focus is still on that block's handle, also after Left/Right.
- With 0 favourites only the empty note shows; with 1 a move changes nothing and says nothing.
- No visible text other than what was there before; lavender and midnight look the same apart
  from the wallpaper; no console errors.

## Review after building (2026-11-22)

**Verdict: changes needed: one must-fix (the Reset/Done bar), then new screenshots.** I looked at all
38 screenshots and at `git diff main...HEAD -- src` (`Dashboard.tsx` above all). Everything else
matches the design.

**What matches**

- Tools: ⠿ then ★, top right, no × in Favourites, the same buttons as the sections' tools; no tools
  outside Arrange (`1280-*-6`). Handle name "Move <block> within the favourites: drag it, or use the
  arrow keys", `title="Drag to move"`.
- Drag: only the dragged copy is raised (`.moving`, translated, shadow). The same block in its own
  section stays put and looks normal (`*-5`). The gold 3 px line runs across one column at 1280 and
  across the single column at 390 (`*-2`).
- Past the end (choice 10): with 4 others, a drop below the right column's last block shows the
  line at the end of the left column, and the block lands there (`1280-*-4`, `4b`).
- Drag over a section (choice 14): the line stays at the nearest Favourites place (`1280-*-4c`).
  Section drags only look at `place: 'section'` markers, so they never show a line in Favourites.
- Keys, focus and the status line (choice 11) are built as designed: Shift does nothing, nothing is
  swallowed at an edge, focus is found again by `data-favourite`, the same words twice are cleared
  first, and the line is emptied on Done. The run's printed messages match the wording.
- 0, 1 and 2 favourites (`*-7`, `8`, `9`), lavender and midnight differ only in the wallpaper, and
  there is no new visible text.

**The developer's deviation: handles 36 px on touch, not 44 px. Accepted.** The design meant "the
same size and look as in the sections" and wrongly took `.btn.small` to be 44 px under
`pointer: coarse`. It is 36 px (`styles.css`). If only the Favourites handles were 44 px, the tools in
one Arrange view would have two sizes. I changed the design check above to say so. Raising every
block tool (sections and Favourites together) to the 44 px tap size of D-0020 is a **follow-up for
the architect**, not this task. At 390 it has to be weighed against the section tools covering more
of a block's title.

**The developer's own choices. Both accepted.**

1. *Anchor = the last block before it in her order that is still on the account.* That is what the
   task asks for ("right after the last of those blocks still on the account"), and it keeps the
   block next to the one she put it under.
2. *More than one block moved in one `setLayout`: a move for each, in her order.* This can't happen
   from the handle, the user sees nothing different, and it builds the same order on the account.

**The finding: the sticky Reset/Done bar covers the top of Favourites. Must be fixed here, not in a
follow-up.** It was already like this before the change, but this task makes it worse. In Arrange at
the top of the page the bar sits about 70 px below its own place, over the "★ Favourites" heading.
That hides:
- the heading itself, on every Arrange shot (`*-1`, `*-9`);
- the empty note's top (`1280-midnight-7`);
- at 390 with 1 favourite, the block's **⠿ and ★ themselves** (`390-lavender-8`), so the new tools
  can't be reached without scrolling;
- the drop line before the first row. "Move to the top" is the most likely move in Favourites, and
  at the top of the page there is no room to scroll further up to show its line. The screenshots had
  to drag to row 2 to show a line at all.
When scrolled, the bar also stays about 270 px down the screen (`1280-*-4c`, `*-5`, `390-*-2`), over
the middle of the blocks, instead of just under the header.

**Must fix (for the developer):**

1. **The Arrange bar must not cover anything at the top of the page.** In Arrange at scroll 0, at
   390 and 1280, the bar sits in its own place between the Today strip and "★ Favourites". The
   heading, the empty note, the first row of blocks and their ⠿ / ★ tools are fully visible below it.
   When scrolled, it sticks just below the header (the tabs), not further down. Likely cause, for
   the developer to confirm: `.dashboard` is the scroll container and already starts under the
   header through its `padding-top`, and the bar's sticky `top` (`max(5rem, header height + space)`,
   and `max(4.75rem, …)` under 720 px) counts the header a second time. A small `top` like
   `var(--space-2)` in both rules is probably enough. Only CSS; check that the sections and any other
   page with `.dashboard-bar.arranging` still look right.
2. **New screenshots** in `docs/tasks/T-0020-screens/` at 390 and 1280, lavender and midnight,
   replacing the old ones: `1` (Arrange at the top: heading and first row clear of the bar), `7`
   (0 favourites: heading and note clear), `8` (1 favourite: ⠿ and ★ clear). Add a new
   `2b-drop-before-first`: a drag at the top of the page with the line before the first block in
   Favourites (in the left column at 1280). Then one shot scrolled down in Arrange, with the bar
   just under the header.
3. Add one line to `docs/lessons.md` for this rework (G-0014).

After that, back to me for a quick look at the new shots, then to the tester.

# Build notes

Added by the developer (2026-11-22).

- **Moving functions** (`src/lib/dashboardLayout.ts`): `moveFavouriteTo(layout, id, index)` (list
  place among the others, the end when past it), `moveFavourite(layout, id, column, row, columns)`
  (`2 × row + column`, or `row` with one column), `favouritePlace(layout, id, columns)` and
  `stepFavourite(layout, id, key, columns)` for the arrow keys (the same layout object back at an
  edge). They only ever touch `favourites`.
- **The queue** (`src/lib/favourites.ts`): an unsent entry is now a star/unstar or a
  `{ move, before }`; `cleanUnsent` reads both (junk becomes an empty change, as an older app reads a
  move). `orderMoves(before, after)` finds the one block moved; `moveToChanges(account, id, before)`
  places it right after the last of its anchors still on the account (first when none is) and
  returns `[{ remove: tail }, { add: tail }]` for the shortest tail, or `[]`.
- **Sync** (`src/components/useDashboardLayout.ts`): `setLayout` queues a move when the set is the
  same and the order changed (a set change still sends stars and unstars only). `flush` meets a
  move by reading the account, then puts its two changes at the front of the queue in its place and
  sends them one at a time like any star, so a move survives being offline or a closed app. Pulls
  are unchanged: the account's order is taken over only when nothing is unsent, which is what stops
  a reorder from being undone.
- **Dashboard** (`src/components/Dashboard.tsx`): the Favourites grid gets `dash-favourites-grid`
  and its blocks `data-favourite`; a drag knows its `place` (`section` or `favourites`), so only the
  dragged copy gets `.moving` and only its own grid shows a line. `favDropAt` looks only at the
  Favourites grid (nearest column, then the first block whose middle is below the pointer, counted
  without the dragged one) and shows a past-the-end line at the end of the column where the last
  place is. Keys go through `stepFavourite`; focus is found again by `data-favourite` after the
  re-render. One hidden `role="status"` line in the section while arranging, cleared on Done. No
  new CSS: `.block-handle`, `.moving`, `.drop-before` and `.drop-end` as they are.
- **Choices taken by the developer** (recommended option each time, Hanna not asked):
  1. *Which anchor counts* when the anchors are in another order on the account: the last one in
     her order that is still on the account (the block she put it right after).
  2. *More than one block moved in one `setLayout`* (doesn't happen from the handle): a move for
     each block in her order, which builds the same order on the account.
  3. *Handle size on a touch screen*: the handles are the sections' handles exactly (`.btn.small`,
     which the existing CSS makes 36 px tall under `pointer: coarse`, not 44 px as *Design* says).
     Kept the same as the sections rather than changing every small button; for the UX designer.
- **Found, not fixed here** (for the architect): in Arrange the sticky bar with Reset/Done
  (`top: max(5rem, header height + space)`) sits over the top of the ★ Favourites section when the
  page is at the top, so the heading, the empty note and a drop line before the first row are
  partly behind it (seen at 390 and 1280, before this change too). The screenshots drag to row 2 so
  the line is visible.

## Screenshots (`docs/tasks/T-0020-screens/`)

`<width>-<wallpaper>-<n>-…jpg` for 390 and 1280 on lavender and midnight, local dev server with no
backend, layout seeded in `hannas-reading-list:dashboard:local`:
`1` Arrange with Favourites (⠿ then ★, no ×), `2` a drag with the drop line, `3` after the drop,
`4` / `4b` (1280) a drop below the right column's last block with 4 others: the line at the end of
the left column, and the block landing there, `4c` (1280) a drag over the Today section with the
line kept in Favourites, `5` the same blocks in their own section unchanged, `6` after Done and a
reload, `7`–`9` 0, 1 and 2 favourites in Arrange. What the run printed: the drags left `sections`
deep-equal; the status line read "Reading goal: right column, row 2 of the favourites." (1280) and
"Reading goal: place 2 of 5 in the favourites." (390); focus stayed on the handle after a key; with 1
favourite a drag and a key changed nothing and said nothing; with 2, Right (1280) / Down (390)
swapped them; no handles outside Arrange; the order was the same after Done and a reload; no
console errors.

# Test

To be written by the tester.

# Log

- 2026-11-22 architect: task written from Hanna's feature chat of 2026-11-21. Checked the account
  sync: it keeps only the set of favourites, so a reorder is never sent and is undone by the next
  pull, and the server route can only unstar and append. D-0028 records the order as separate from
  the sections and syncs a move as an unstar and re-star of the shortest tail, worked out against
  the account's list, with no server change; group 1, nothing for Sander. Choices under *Choices
  made by the team*. Handed to the UX designer.
- 2026-11-22 ux-designer: designed. The Favourites grid reuses the sections' Arrange look (handle,
  raised drag, gold drop line); differences: ⠿ and ★ without ×, a handle name "within the
  favourites", a drag that only knows Favourites, a drop past the end shown in the column it lands
  in, one column under 860 px, and a hidden status line naming where the block went. Nothing shown
  for a move that hasn't synced. New choices 10–14; design checks under *Design*. Handed to the
  developer.
- 2026-11-22 developer: built the handle, drag and arrow keys within Favourites, the status line,
  and the order's sync as a queued move sent as an unstar and re-star of the shortest tail worked out
  against the account (D-0028); no CODEOWNERS path, `src/server/` or `deploy/nas/` touched. Tests:
  6 in `dashboardLayout.test.ts`, 7 in `favourites.test.ts`, 10 two-device tests in
  `favouritesSync.test.ts` (8 of them fail on the old `useDashboardLayout.ts`, among them "is not
  undone by the device's own next pull") and 6 in `Dashboard.favourites.test.tsx`. `pnpm test`:
  "Test Files 84 passed | 1 skipped (85), Tests 685 passed | 9 skipped (694)"; `pnpm exec tsc
  --noEmit`: no errors; `pnpm run build`: "✓ built"; `pnpm exec harness check`: tasks, decisions,
  engineers and generated files ✓. Screenshots in `docs/tasks/T-0020-screens/` (38), no console
  errors. Choices and one finding under *Build notes*. Handed to the UX designer for review.
- 2026-11-22 ux-designer: reviewed: changes needed. The build matches the design. Accepted: 36 px
  handles like the sections (44 px for all block tools is a follow-up for the architect) and both
  developer choices. Must fix here: the sticky Reset/Done bar covers the ★ Favourites heading, the
  first row's ⠿ / ★ and the drop line before the first block; then new screenshots 1, 2b, 7 and 8
  and one scrolled shot. Details under *Review after building*. Back to the developer.
