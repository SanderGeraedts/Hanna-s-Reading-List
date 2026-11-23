---
id: D-0035
title: "Books are hardcovers on every device again, drawn as one light piece on the shelf, with a Detailed books switch per device"
description: "Phones show the hardcovers (pages, boards, spine, ridges) again, as the computer does; on the shelf each hardcover is one merged piece of at most two draws, the full parts only for a book taken out; a Detailed books switch in the 🎨 room panel, kept per device and on by default, turns them into the simple blocks; the SafeBookshelf note stays."
status: Accepted
date: 2026-11-22
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [bookshelf, phone, performance, room]
---

# Context

On 21 November (T-0003, #181) Hanna's phone could not draw the shelf. One of the changes made
while the cause was unknown was to draw every book on a phone as one simple block instead of a
hardcover (pages, two boards, spine and four gilded ridges: about nine parts, some twelve draw
calls per book). The real causes turned out to be Chrome having blocked WebGL after the earlier
crashes ("Error creating WebGL context") and the shelf drawing on behind the other pages (about
25,000 draw calls a second behind the Dashboard). Both are fixed. In a feature chat on
2026-11-22 Hanna asked for the hardcovers back on her phone, made lighter to draw first, with a
switch to go back to the blocks.

# Decision

- **Every book is a hardcover on every device** while *Detailed books* is on.
- **On the shelf, a hardcover is one merged piece** per book (pages, boards and spine in one
  geometry) drawn with at most two materials (the paper and the spine's cloth), and its ridges
  add no draw call per book (painted into the cloth group or one instanced mesh for the whole
  shelf). The separate parts with the cover picture and the painted back are used only for the
  book that is taken out.
- **A *Detailed books* switch in the 🎨 room panel** turns the hardcovers into the simple blocks
  (as on phones since T-0003). It is part of the room settings, kept per device in
  `localStorage` like the rest of D-0022, on by default on every device; a saved room without
  the field counts as on. *Reset* switches it back on.
- **The SafeBookshelf note stays** as the fallback when the shelf can't be drawn.
- The app never changes the switch by itself.

# Rationale

The blocks were a guess at a memory problem that turned out to be something else. Merging the
parts gets the hardcover's draw cost close to the block's (two draws per book in both), so the
phone can have the look the computer has. A per-device switch gives Hanna a way back on a weaker
device without asking anyone, and keeps the setting off the server (no new field: group 1).

# Consequences

- `Room` gains an optional-in-storage `detailedBooks` field; `cleanRoom` treats anything other
  than `false` as on.
- The computer's shelf also draws the merged hardcover and gets lighter; it must look the same
  as before.
- The draw-call and memory budget in T-0034 is the yardstick for later changes to the books.

# Guidance for agents

- Keep the shelf hardcover at two draws per book or fewer, with no per-book draw for ridges.
- Don't switch *Detailed books* off on her behalf (for example after a lost context); offer it.
- Don't move the setting to the account: that is a change to the server (group 3).
- When a later change makes the hardcover heavier on the shelf, measure it the T-0034 way.
