---
id: T-0020
title: "Let her drag blocks within Favourites in Arrange, in an order of their own that follows her to every device"
description: "In Arrange the ★ Favourites blocks get the same ⠿ handle, drag and arrow keys as the other sections; a move reorders layout.favourites (separate from the block's own section), and the account sync sends it as an unstar and re-star of the shortest tail, worked out against the account's list, so a reorder isn't undone by the next pull and no server change is needed (D-0028)."
status: Open
depends_on: []
decisions: [D-0003, D-0005, D-0014, D-0020, D-0022, D-0028]
raised_on: 2026-11-22
done_on: ""
result: []
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

# Design

To be written by the UX designer.

# Test

To be written by the tester.

# Log

- 2026-11-22 architect: task written from Hanna's feature chat of 2026-11-21. Checked the account
  sync: it keeps only the set of favourites, so a reorder is never sent and is undone by the next
  pull, and the server route can only unstar and append. D-0028 records the order as separate from
  the sections and syncs a move as an unstar and re-star of the shortest tail, worked out against
  the account's list, with no server change; group 1, nothing for Sander. Choices under *Choices
  made by the team*. Handed to the UX designer.
