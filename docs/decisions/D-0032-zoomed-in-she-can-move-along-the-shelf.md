---
id: D-0032
title: "Zoomed in, she can move along the shelf: ‹ › buttons, dragging the wall, the arrow keys and a one-finger swipe"
description: "When the shelf is zoomed in, round ‹ › buttons at its left and right edges move the view sideways on every device (hidden when not zoomed in, disabled at an end); on the computer she can also drag the empty wall with the mouse and use ← →, on the phone swipe with one finger; a press on a book still opens or moves the book, and the arrows are only the shelf's when nothing else has the keyboard."
status: Accepted
date: 2026-11-22
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [shelf, zoom, input]
---

# Context

The shelf can be zoomed in (1 to `ZOOM_MAX` = 3) with the + − buttons, Ctrl + scroll or a pinch
(`src/components/BookshelfScene.tsx`, `src/routes/index.tsx`). Zoomed in, only part of the case is
on screen. In issue #234 ("Zoom") Hanna wrote that she can't go left and right then, on her phone
and on the computer. The code had a sideways pan (`scroll.current.x`, `panBy`, Shift + scroll and a
touch swipe), but the camera kept looking at the middle of the case, so the view turned round the
middle instead of moving along it (T-0025). She agreed the controls below in a feature chat on
2026-11-22.

# Decision

- **Zoomed in, the view moves along the shelf**: panned to the right, the right-hand books are in
  the middle of the screen, as far as the case's right end, and the same to the left.
- **‹ › buttons on every device**: round buttons at the shelf's left and right edges, shown only
  while zoomed in far enough to have something to move to, each disabled once that end is reached.
- **On the computer**: a mouse drag that starts on the empty wall (anything that isn't a book)
  moves the view; the ← → keys move it too.
- **On the phone**: a one-finger sideways swipe moves the view.
- **Books keep their gestures**: a click or tap on a book opens it; dragging a book with the mouse,
  or a long press and drag on the phone, moves the book, as before.
- **The arrows are the shelf's only when nothing else wants them**: not while a book is open, not
  while another page or panel covers the shelf, not while typing or on a control that uses arrows.

# Rationale

- Buttons work the same on every device and can be found without knowing a gesture; the drag,
  keys and swipe are the quick ways for whoever knows them.
- Dragging the wall rather than anything is what keeps a book's own drag (moving it on the shelf)
  working, so arranging by hand is not lost.
- Arrows that act anywhere would take them from the search box, the room panel and the dashboard.

# Consequences

- The camera has to aim where it is panned to; parallax and the eased motion stay.
- Moving a book while zoomed in reaches the far end of the shelf by dragging it to a side edge,
  like the top and bottom edges already scroll (T-0025).
- An iPhone's own back swipe from the very edge of the screen belongs to the phone and can't be
  taken by a web page; a swipe that starts there may go back instead of moving the shelf.

# Guidance for agents

- Don't let the wall drag, the keys or the buttons open or move a book, and don't change how a
  book is opened or moved.
- Don't put the camera's look-at point back at x = 0 while panned; a test guards it (T-0025).
- Taking a control away, or adding one that needs a gesture she didn't agree to, is Hanna's
  choice: ask her first. Look, size and wording of the buttons are the UX designer's (D-0020,
  D-0014).
