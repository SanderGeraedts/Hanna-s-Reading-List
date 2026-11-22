---
id: D-0028
title: "Favourites keep the order she drags them into, apart from their sections, on every device, through the existing star and unstar route"
description: "In Arrange she can drag blocks within Favourites; the order is the order of layout.favourites, separate from each block's place in its own section, and it follows the account by sending a move as an unstar and re-star of the shortest tail, worked out against the account's list when it is sent, so the server on the NAS doesn't change."
status: Accepted
date: 2026-11-22
decided_by: architect
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [dashboard, favourites, sync]
---

# Context

In a feature chat on 2026-11-21 Hanna asked to drag blocks within the ★ Favourites section in
Arrange, as in the other sections (T-0020). The favourites are `layout.favourites`, a list in the
order she starred them; `favouriteColumns` deals it out over two columns, left, right, left. Since
T-0009 (#200) the list follows the account (D-0003: through the app's server functions only).

How it syncs today (checked in `src/components/useDashboardLayout.ts`, `src/lib/favourites.ts`,
`src/server/favouritesStore.ts` and `deploy/nas/pb_hooks/favourites.pb.js`):

- A save sends only **what changed as a set**: `favouritesChange(before, after)` gives the blocks
  starred and unstarred. A reorder gives `{ add: [], remove: [] }`, and `setLayout` sends nothing.
- On every pull (opening the dashboard, coming back into view) the device **adopts the account's
  list in the account's order** (`adopt`, `sameList`). So a reorder on one device today is **lost on
  the next pull** and never reaches another device.
- The route on the server (`POST /api/collections/libraries/favourites`, in `pb_hooks`) applies
  `remove`, then appends `add` in the given order, in one transaction. A block named in both `add`
  and `remove` of one request is left out. It has no way to say "put X here".

Options considered:

1. **A new `order` (or `move`) field on the server route.** The cleanest, atomic, but it changes
   `deploy/nas/pb_hooks/`, which rebuilds the server at Sander's home (D-0005): group 3 in
   `docs/hanna-guardrails.md`, so it needs Sander.
2. **Send the whole list.** The route can't take it, and a plain overwrite would bring back the
   lost-star race T-0009 fixed.
3. **Express a move with the route as it is**: unstar the blocks that have to come after the moved
   one, then star them again in the new order (two requests, because one request ignores a block
   named in both lists). Only app code changes.

# Decision

- In Arrange, a block in Favourites can be **dragged and moved with the keyboard within
  Favourites**. Its place there is **separate from its place in its own section**: moving it in
  Favourites never changes `layout.sections`, and moving it in its section never changes
  `layout.favourites`. Blocks are not dragged between Favourites and a section (the ☆/★ star is the
  way in and out).
- **The order of Favourites is the order of `layout.favourites`.** No new stored field, no change
  to `Book`, the shelf, `src/server/` or `deploy/nas/`.
- **The order follows the account with option 3:**
  - A move is kept in the device's unsent queue as a **move**: the block, and the blocks before it
    in her new order (its anchors).
  - When it is sent, the device first **reads the account's list as it is then**, places the block
    right after the last of its anchors still on the account (first when none is), and works out
    the **shortest tail** that must be unstarred and starred again to get there (a move to the end
    is just the block itself). That move is replaced in the queue by two plain changes,
    `{ remove: tail }` then `{ add: tail }`, which go up one at a time like any star.
  - A block unstarred on the account meanwhile is not starred again: the tail is worked out from the
    account's list, not from this device's. A move of a block that is no longer on the account is
    dropped.
  - Signed out, or while the server doesn't keep favourites, the order stays on the device, as the
    stars do.
- Pulls stay as they are: the account's order wins once this device has nothing unsent.

# Rationale

Option 3 gives Hanna what she asked for on every device without anything for Sander, using the
route and its one-writer-at-a-time transaction that T-0009 tested. Working the tail out against the
account's list at send time keeps stars and unstars made on another device, which a tail fixed on
this device could undo (a phone that reordered offline would bring back a block unstarred on the
laptop). Keeping the tail short keeps the window between the two requests small and touches as
few blocks as possible.

# Consequences

- Between the unstar and the re-star (one round trip, or longer if the device goes offline in
  between) another device that pulls may briefly miss the tail's blocks; they come back on its next
  pull. An unstar of a tail block made on another device inside that window can be undone. Both are
  rare and harmless (no book is touched), and are accepted.
- Two devices moving at the same moment: the move sent last decides where its block goes; the
  other blocks keep their order.
- When Sander next changes the favourites route anyway, an atomic `order` field (option 1) can
  replace this; that needs a new decision.

# Guidance for agents

- Never send the whole favourites list to the account, and never change `pb_hooks/`, the
  migrations or `src/server/` for this on Hanna's instance.
- A reorder must not add or remove a favourite, and must not change any section.
- Keep the tail worked out against the account's list at send time; don't queue a fixed
  remove/add made on the device.
