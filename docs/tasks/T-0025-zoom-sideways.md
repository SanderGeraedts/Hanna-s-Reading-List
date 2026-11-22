---
id: T-0025
title: "Let her move left and right along the shelf when it is zoomed in"
description: "#234: zoomed in, the camera turns round the middle of the case instead of moving along it, so the ends can't be reached on the phone or the computer; aim the camera where it is panned to, and add ‹ › buttons at the shelf's edges, a mouse drag on the empty wall, the ← → keys and a working one-finger swipe (D-0032)."
status: Open
depends_on: []
decisions: [D-0002, D-0014, D-0020, D-0022, D-0032]
raised_on: 2026-11-22
done_on: ""
result: []
---

# Goal

Hanna wrote in issue #234 ("Zoom"): "When zoomed in on the bookshelf, you can not go left and right.
Make that possible." It fails on **her phone and on the computer**. In a feature chat on 2026-11-22
she agreed (D-0032 records it):

1. While zoomed in, **round ‹ › buttons** sit at the shelf's left and right edges, and work on the
   phone and the computer. A button is **hidden** when the shelf is not zoomed in (nothing to move
   to) and **disabled** once that end is reached.
2. On the **computer** she can **drag the empty wall** with the mouse to move along the shelf, and
   use the **← →** keys.
3. On the **phone** a **one-finger sideways swipe** moves along the shelf.

Zoomed in all the way and moved to an end, the last book on that side of every shelf is on screen.

## 1. The cause: the camera keeps looking at the middle

All of this is in `src/components/BookshelfScene.tsx`.

The sideways pan exists: `scroll.current.x` between `-xMax` and `xMax` (set in `useCameraRig`),
`panBy(px)` moves it, Shift + scroll and a horizontal trackpad scroll call it, and a touch swipe
calls `panBy(dx)` in `move()`. The frame loop then moves the camera: `c.position.x` eases to
`base.x + px` (`base.x = sc.x`). **But the next line is `c.lookAt(0, lookY.current, 0)`**: the camera
always aims at x = 0, the middle of the case. Moving the camera sideways while aiming at the middle
turns the view round the middle instead of sliding it along the shelf. The books slide a little
through perspective, so it feels as if the shelf "almost" moves, but the ends are never reached.

`lookAt(0, …)` comes from "Stop the view bobbing when the mouse moves" (1edfbee, 3 November), where
x = 0 kept the mouse parallax from turning the view; it was right then, because the camera never
moved sideways. Zooming and the pan came later (bd25ec7, 19 November) and didn't change the aim.

Worked out with Three.js for a phone at 390 × 844 (the case is 0.63 m wide, -0.315 to 0.315),
zoomed in 3×, panned all the way right (`x = xMax = 0.251`), on the plane of the spines:

| Camera aims at | Part of the case on screen |
|---|---|
| x = 0 (today) | -0.093 to 0.157: still round the middle; the right 0.16 m is never shown |
| x = the pan (the fix) | 0.134 to 0.367: the right end (0.315) is on screen |

The same sums hold on the computer, so it is **one cause for both devices**. It also means a search
that "pans to the first match" (the `highlight` effect) never really did when zoomed in.

### What else was checked on the phone, and isn't the cause

- **`touch-action`**: `<Canvas style={{ touchAction: 'none' }}>` puts it on react-three-fiber's
  wrapper `div` (v9.8), the canvas's parent; a browser applies the `touch-action` of every ancestor
  up to the nearest scroll container, so the canvas gets `none`. The browser doesn't take the swipe
  as page scroll or pinch, so it **doesn't fire `pointercancel`** mid-swipe. (Even if it did,
  `pointercancel` on `window` only ends the swipe; it doesn't undo it.)
- **Scroll container / overflow**: `.stage` is `position: absolute; inset: 0` with no overflow; the
  shelf page doesn't scroll, so no scroll container competes for the swipe.
- **`xMax` in portrait**: not 0 when zoomed in. At zoom 1 it is about 0.05 − 0.045 × case width
  (≈ 0.02 m on that phone, so a swipe at zoom 1 moves the view by 2 cm; harmless, and the buttons
  hide there, see 3). At zoom 3 it is 0.251 m (above).
- **How zoom is set on the phone**: a two-finger pinch (the `touches` map / `pinch` in the scroll
  effect) and the + − ⤢ buttons in `.zoom-controls` (bottom right, in `src/routes/index.tsx`), which
  show on the phone too. Both set the same `zoom` state, so both reach the pan.
- **The swipe code itself**: one finger, at least 8 px, started within `LONG_PRESS_MS` (350 ms):
  `scrollBy(dy)` and `panBy(dx)`, 1:1 with the finger (`worldPerPx`), and lifting the finger doesn't
  open a book (`pending.current = null`). Correct; it only looked broken because of the aim.
- **iPhone back swipe**: iOS takes a swipe that starts at the very edge of the screen as "back" when
  there is history, whatever the page says. It's not the cause (Hanna's swipes elsewhere don't
  work either), but a swipe started on the edge, where the ‹ button sits, may go back. Nothing a web
  page can do about it; noted in D-0032.

## 2. Aim the camera where it is panned to

In `useCameraRig`'s frame loop, aim at the pan instead of at 0: ease a look-at x towards `base.x`
(`sc.x`) at the same rate as the camera's x (3), and aim at `(lookX, lookY, 0)`. The mouse parallax
`px` still moves only the camera, not the aim, so the parallax and "no bobbing" from 1edfbee stay.
The first-mount jump (`camera.lookAt(0, base.y, 0)`) aims at `base.x` too. Move the camera's
placing into a small exported function (e.g. `aimCamera(camera, target, parallax, dt)`, the name is
the developer's) so a test can check it without a canvas (see *Done when*).

## 3. The ‹ › buttons (every device)

- Two round buttons, ‹ at the left edge and › at the right edge of the shelf area, vertically
  centred on the screen (clear of the zoom buttons at the bottom right and the header), at least
  the 44 px tap size (`--tap`, D-0020). Look, labels and exact place are the UX designer's.
- **Shown** only when the shelf can be moved sideways: zoomed in (`xMax` above a small threshold,
  say 0.03 m, so the 2 cm at zoom 1 on a phone doesn't count), on the shelf (`!offShelf`), with no
  book open (`!selected`), with books on the shelf: the same conditions as `.zoom-controls`, plus
  "can pan".
- **Disabled** at an end: ‹ when `x` is within 1 mm of `-xMax`, › within 1 mm of `xMax`. A disabled
  button stays in place (so the other doesn't jump) and isn't announced as working.
- **Click / tap**: moves the view by **three quarters of the visible width** (`worldPerPx ×` the
  canvas width, at the case), clamped to the end; the camera's easing makes it a smooth glide.
  ‹ moves the view to the left (`x` down), › to the right.
- Zooming out until nothing can move hides them; zooming in again shows them where the pan is.
- The scene tells the page whether it can pan and whether it is at an end; only when that changes,
  not every frame. The page gives the scene a way to pan by a step (a callback ref or similar).
  Names and wiring are the developer's; the rule is that `scroll.current` stays the one source of
  the pan.

## 4. The computer: drag the empty wall, and ← →

### Mouse drag on the empty wall

Today the scroll effect ignores mouse pointers (`if (e.pointerType === 'mouse') return`), because a
mouse press on a book is the start of a click (open it) or a drag (move it, `onPointerDown` /
`onPointerMove` / `onPointerUp` on `BookMesh`, 6 px threshold). The wall drag must leave those
alone:

- **Where a press lands**: on a book when the book's `onPointerDown` set `pending.current`;
  anything else (wall, wood, floor, decorations, book nooks, series dividers, none of which has a
  pointer handler) is "the empty wall".
- **When it is decided**: not at `pointerdown`. The native `pointerdown` listener on the canvas runs
  **before** react-three-fiber's (which listens on the wrapper `div`), so `pending.current` isn't
  set yet then. Note the press at `pointerdown` (left button only, mouse, no book open, shelf can
  pan) and decide at the first `pointermove` past the **same 6 px** as a book drag: `pending.current`
  set → it's the book's (a book drag, exactly as today); not set → a **wall pan**.
- **A wall pan** moves the view with the mouse, 1:1 like the swipe (`panBy(dx)`), and also up and
  down (`scrollBy(dy)`) when the zoomed-in case is taller than the screen, as the swipe does. Ends
  at `pointerup` / `pointercancel` / losing pointer capture; capture the pointer so a drag that
  leaves the window still ends.
- **A click on the wall without moving** does what it does today: nothing (the backdrop only closes
  an open book).
- **Releasing a wall pan over a book** doesn't open it: `pending` was never set for this press.
- **Not zoomed in** (can't pan): a wall drag does nothing, as today.
- **Cursor**: while a wall pan is on, `grabbing`; over the empty wall while zoomed in, a hint that
  it can be dragged is the UX designer's call (books already show `grab`, which means "move this
  book"). Keep the existing cursor effect (`drag` / `hovered`) in charge over books.

### Moving a book while zoomed in

There is **no separate Arrange mode on the shelf**: a book is moved any time by dragging it (mouse:
press and move 6 px; phone: press and hold 350 ms, then drag). "Arrange by" is a sort menu and
Arrange on the dashboard is unrelated (D-0028); neither changes here. That drag stays exactly as it
is. One addition, so a book can be moved to a far end while zoomed in: **while a book is being
dragged and the shelf can pan, a pointer near the left or right edge pans** the same way the top
and bottom edges already scroll (`opts.dragging` in the frame loop: `state.pointer.x` beyond ±0.7,
speed up to 1.2 m/s). A wall pan and a book drag never run at once.

### ← → keys

- **Step**: one fifth of the visible width per `keydown`; holding the key repeats through the
  keyboard's own auto-repeat. Left moves the view to the left. No other keys are added.
- **One listener on `window`**, active only while the shelf can pan, the shelf is showing
  (`!offShelf`), no book is open (`!selectedId`) and no panel (🎨 room panel, Make a wish, quick
  update, wrap-up and the like) is open.
- **Only when nothing else has the keyboard**: act only when the key event's target is
  `document.body`, the canvas, or one of the shelf's own buttons (‹ › and the zoom buttons); with no
  Shift, Ctrl, Alt or Meta; and not when `event.defaultPrevented`. So the search box (caret), the
  room panel's controls, star ratings, the dashboard's Arrange (Shift + arrows, `Dashboard.tsx`) and
  the book panel keep their arrows. Call `preventDefault()` only when the shelf used the key.
- **Focus**: the canvas isn't focusable; clicking the wall or the shelf leaves focus on
  `document.body`, so after a click on the shelf the arrows work at once, with no extra tab stop.
  Tabbing to ‹ or › and pressing the arrows works too (and Enter / Space presses the button).
- **The book panel**: with a book open the shelf's arrows are off entirely, so they can never turn
  or move anything under it. (Today the book is turned by dragging; `grep` finds no arrow-key
  handler for turning it. If one is added later, it keeps the arrows, because the shelf's are off
  while a book is open.)

## 5. The phone: one-finger swipe

The swipe in the scroll effect stays as it is (8 px, 350 ms, 1:1, pinch with two fingers); with the
aim fixed (2) it moves along the shelf. Check that a long press and drag still moves a book, a tap
still opens one, a pinch still zooms, and that lifting a finger after a swipe opens nothing.

# Done when

- **Unit tests** in `src/lib/shelfPan.test.ts` for small pure helpers in `src/lib/shelfPan.ts`
  (names are the developer's):
  - clamping a pan: a step past either end stops at `±xMax`; with `xMax` 0 the pan stays 0;
  - the edges: "can pan" is false at or below the 0.03 m threshold; "at start" within 1 mm of
    `-xMax`, "at end" within 1 mm of `xMax`; both false in the middle;
  - the steps: a button step is 0.75 × the visible width, a key step 0.2 ×; ‹ / ← move `x` down,
    › / → move it up;
  - the arrow-key rule: ← and → on `document.body`, the canvas or a shelf button give a step;
    `null` for any other key, with Shift / Ctrl / Alt / Meta, when `defaultPrevented`, with a book
    open, off the shelf, with a panel open, when the shelf can't pan, and for a target that is an
    `input`, `textarea`, `select`, `[contenteditable]` or any other element outside the shelf's
    buttons;
  - the mouse press rule: past 6 px with `pending` set → book drag; not set, left button, shelf
    can pan, no book open → wall pan; not zoomed in, right button, or a book open → nothing;
    under 6 px → still undecided (so a click stays a click).
- **Camera test** in `src/components/cameraAim.test.ts` with a real `THREE.PerspectiveCamera` (no
  canvas), the phone numbers from section 1 (390 × 844, case -0.315 to 0.315, zoom 3): panned to
  `xMax` and settled, the case's right end on the spines' plane projects inside the screen
  (NDC x ≤ 1) and the left end outside it; panned to `-xMax`, the other way round; with the pan at
  0, the case's middle projects to NDC x ≈ 0; with a parallax offset the camera moves but the aim
  stays on the pan. This test **fails on today's `lookAt(0, …)`**.
- **Component test** for the ‹ › buttons (where the developer puts them, e.g.
  `src/components/ShelfPanButtons.test.tsx`): not rendered when the shelf can't pan; ‹ disabled at
  the start, › disabled at the end, both enabled in the middle; a click on › asks for one step to
  the right, ‹ one to the left; both have an accessible name.
- **The existing tests pass**, including `SafeBookshelf.test.tsx`, `contextLoss.test.ts`,
  `BookMesh.test.ts` and `Dashboard.favourites.test.tsx` (its arrow keys still move blocks).
- **Clicked through** on a local dev server with no backend (`pnpm run dev`, never a production
  `POCKETBASE_URL`; a shelf of at least 60 books seeded in localStorage), screenshots in
  `docs/tasks/T-0025-screens/` on **lavender and midnight**:
  - **1280 × 800, mouse**: zoomed in to 3×: the buttons show, ‹ disabled at first only if the view
    starts at the left end; › pressed until disabled shows the last book of each visible shelf at
    the right; ‹ back to the left end likewise. Dragging the empty wall moves the view both ways;
    releasing it over a book opens nothing. A click on a book still opens it; dragging a book still
    moves it (the order changes and is saved as today), and dragging it to the right edge pans.
    After a click on the wall, ← → move the view; typed into the search box, ← → move the caret
    and the shelf stays put; with a book open, ← → do nothing to the shelf. At zoom 1 the buttons
    are hidden and ← → do nothing. Shift + scroll and a trackpad's sideways scroll still pan.
  - **390 × 844, touch emulated** (touch events, not mouse): zoom in with + (and a pinch if the
    tool can send two touches): a one-finger sideways swipe moves the view to both ends; ‹ › work
    and disable at the ends; a tap opens a book; press, hold and drag still moves a book; at zoom 1
    the buttons are hidden.
  - screenshots: zoomed in at the left end, the middle and the right end, at both sizes; no console
    errors, no horizontal page scroll.
- **Design checks** (UX designer) added under *Design* and checked on the screenshots.
- `pnpm test`, `pnpm run build` and `pnpm exec harness check` pass; `src/routeTree.gen.ts`
  unchanged.
- **Hanna** tries it on her phone and her computer on the live site and says it works. Until she
  has, the task stays Doing with a `Remaining:` line.

# Notes

- **Group 1** (app code only), nothing for Sander: no change to `Book`, the shelf's saving or sync
  (`shelfMerge.ts`, `src/server/shelf.ts`, `library.ts`), `src/server/` or `deploy/nas/`. No
  outside service, no new package (React, Three.js and react-three-fiber are enough). The pan is
  not saved anywhere; a reload starts in the middle as today.
- **Files:** `src/components/BookshelfScene.tsx` (the aim, the wall drag, the edge pan while
  dragging a book, the keys, telling the page about the pan), `src/routes/index.tsx` (the ‹ ›
  buttons next to `.zoom-controls`, with the same show conditions), `src/styles.css` (the buttons,
  tokens only), new `src/lib/shelfPan.ts` with its test, the camera test, the buttons' test.
- **D-0020 / D-0022:** tokens only, the 44 px tap size, light buttons with plum text like the zoom
  buttons, readable on lavender and midnight. **D-0014:** no hint text explaining the gestures; a
  button's `title` / accessible name is fine. **D-0002:** stays in react-three-fiber.
- Don't break: the mouse parallax and "no bobbing" (1edfbee), the pinch and Ctrl + scroll zoom, the
  vertical scroll on a phone, the top/bottom edge scroll while dragging a book, the search that
  scrolls (and now really pans) to the first match, the book panel's drag to turn the book.
- Closes #234 (the PR description must say "Closes #234"; close the issue by hand if auto-merge
  doesn't).

## Choices made by the team

Hanna decided points 1 to 3 of the goal in the feature chat (2026-11-22). The rest was open and
the architect took these without asking her:

1. **Fix the aim, keep the pan**: the camera aims at the pan; the existing `scroll.current.x`,
   `xMax`, `panBy` and swipe stay, rather than a new way of moving.
2. **A button press moves three quarters of the screen**, so a little of what was on screen stays
   in view and she doesn't lose her place; **an arrow key a fifth**, held for more.
3. **"Hidden" means the shelf can't move more than 3 cm**, so the 2 cm a phone has at zoom 1 doesn't
   show buttons; **"at the end" means within 1 mm**.
4. **The wall drag is decided at 6 px of movement, not at the press**, the same distance as a book
   drag, because the canvas hears the press before it knows whether a book was hit.
5. **The wall drag also moves up and down** when the zoomed-in case is taller than the screen, like
   the phone swipe, so it behaves like dragging a map.
6. **Dragging a book to a side edge pans** while zoomed in, like the top and bottom edges already
   scroll, so moving a book by hand still reaches every place on the shelf.
7. **The arrows listen on the page, but only when focus is on nothing in particular or on the
   shelf's own buttons**, with no modifier keys, and never with a book or a panel open; no extra
   tab stop on the canvas. Up and Down, Home and End are not added.
8. **The pan isn't remembered** across reloads or devices.
9. **A new decision, D-0032**, since taking away or changing these controls would need a talk with
   Hanna.

# Design

To be written by the UX designer.

# Test

To be written by the tester.

# Log

- 2026-11-22 architect: wrote the task from #234 and the feature chat; found the cause (the camera
  always aims at x = 0, so the pan turns the view round the middle instead of moving along it, on
  both devices; touch-action, pointercancel, overflow and xMax ruled out); recorded D-0032. Handed
  to the ux-designer for the ‹ › buttons and the wall-drag cursor.
