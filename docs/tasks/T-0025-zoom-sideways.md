---
id: T-0025
title: "Let her move left and right along the shelf when it is zoomed in"
description: "#234: zoomed in, the camera turns round the middle of the case instead of moving along it, so the ends can't be reached on the phone or the computer; aim the camera where it is panned to, and add ‹ › buttons at the shelf's edges, a mouse drag on the empty wall, the ← → keys and a working one-finger swipe (D-0032)."
status: Doing
depends_on: []
decisions: [D-0002, D-0014, D-0020, D-0022, D-0032]
raised_on: 2026-11-22
done_on: ""
result: [https://github.com/SanderGeraedts/Hanna-s-Reading-List/pull/236]
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
- **Design checks** (UX designer) under *Design* ticked on the screenshots, including: ‹ › hidden
  at zoom 1 and with a book open; at each end the button on that side is `aria-disabled`, keeps
  keyboard focus and covers no book; names "Show books to the left" / "Show books to the right";
  `canvas.style.cursor` is `grab` over the empty wall when zoomed in and `grabbing` during a wall pan.
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

The UX designer took these, also without asking her:

10. **The buttons are centred between the header and the bottom of the screen**, 16 px in from
    each edge, and › never comes down onto the zoom column on a short window.
11. **They look exactly like the zoom buttons** (light, plum ‹ ›, no shadow), on both wallpapers
    and every wood.
12. **"Disabled" is `aria-disabled`, not the `disabled` attribute**, so pressing › with the
    keyboard until the end keeps focus on the button instead of dropping it.
13. **The names are "Show books to the left" / "Show books to the right"**, with the ← / → key in
    the tooltip, in a group called "Move along the shelf"; a press announces nothing extra.
14. **The empty wall shows a `grab` cursor while the shelf can pan**, `grabbing` during a wall pan;
    books keep theirs (their hover lift tells them apart from the wall).
15. **At an end the button covers no book**: if it would, the pan's end margin grows; the button
    doesn't shrink or move.

# Design

(UX designer)

Two new buttons and one new cursor; nothing else on the screen changes. Everything is made of what
the shelf already has: the zoom buttons' look, the tokens (D-0020, D-0022), no hint text (D-0014).

## The ‹ › buttons

### Place

- **‹ on the left edge, › on the right edge** of the screen, `var(--space-4)` (16 px) in from the
  edge, the same gutter the zoom buttons keep on the right.
- **Vertically centred on the shelf area**: halfway between the bottom of the header (the scene's
  `topInset`, `headerPx`) and the bottom of the screen, not halfway down the whole window (the
  header would push them too high on the phone). Both buttons at the same height.
- Worked out: on the phone (390 × 844) the buttons land roughly halfway down; the zoom column
  (+ − ⤢ 🎨, four 44 px buttons with 8 px gaps, 16 px from the bottom) starts about 628 px from the
  top, so › is well clear of it. On the computer (1280 × 800) the zoom column starts about 584 px
  from the top, and › sits well above it. The 📖 quick-update button sits bottom left, well below ‹.
- **Never over the zoom buttons**: on a short window, › stays at least `var(--space-2)` above the
  top of the zoom column (e.g. `top: min(<centre>, <zoom column top> − tap − space-2)`); ‹ follows
  the same height so the two stay level. The developer picks the CSS.
- In the DOM they come **after the canvas and before the zoom group**, ‹ first, so Tab goes
  ‹ → › → + − ⤢ 🎨. They sit at `z-index: 1` like the zoom group; the 🎨 room sheet (z-index 8) and
  the toasts lie on top of them, which is fine (the arrows are off while a panel is open anyway).
- A press on a button is the button's only: it never reaches the shelf under it (no book opens,
  no wall pan starts). Being HTML on top of the canvas already does this; don't forward the event.

### Over the books

When zoomed in, books fill the whole width of the screen, so a button in the middle of the pan
lies over a few spine edges, as the zoom column already does. That's acceptable, because those are
the books the button moves past. What must hold:

- **At an end, the button on that side covers no book.** Panned to `xMax` at zoom 3 on the phone,
  the view ends about 0.05 m past the case's right end (section 1), which is about 85 px of wall;
  the › button takes the outer 60 px (16 + 44), so it lies on the wall and the last book of every
  shelf is fully visible to the left of it. The same on the left with ‹, and the same check at
  1280 × 800. The tester checks it on the end screenshots; if a book is cut by the button, the
  developer widens the margin at the end of the pan (a little more `xMax`), not the button.
- The buttons are small and round (44 px), with no bar or strip behind them, so they hide as
  little of the shelf as possible.

### Look

Exactly the zoom buttons: the same rule (`.zoom-controls .btn`) or a shared class, so a later
change to one changes both.

| | Value |
|---|---|
| Size | `var(--tap)` × `var(--tap)` (44 × 44 px), `padding: 0`, glyph centred (`display: grid; place-items: center`) |
| Shape | round (`--radius-pill` from `.btn`) |
| Background | `rgba(255, 255, 255, 0.78)`, `#fff` on hover, as the zoom buttons |
| Border | `1px solid rgba(45, 32, 56, 0.2)`, as the zoom buttons |
| Glyph | ‹ and › (U+2039, U+203A), `var(--fs-large)`, colour `var(--pill-ink)` |
| Press | `.btn:active` (1 px down), as every button |
| Focus | `.btn:focus-visible`: 2 px `var(--accent)` outline, 2 px offset |

The same values on **lavender and midnight**: the light button with plum text doesn't depend on
the wallpaper, and the zoom buttons already read well on both. Over the **woods**: white-washed is
the light one, and the plum border keeps the button's edge visible there; ebony, walnut and cherry
are dark and the light button stands out. No new colour, no shadow.

### States

| State | What she sees | What it does |
|---|---|---|
| **Hidden**: not zoomed in far enough to move (`xMax` ≤ 0.03 m), a book open, off the shelf (dashboard, calendar, challenges), or no books | No buttons at all (not rendered, not in the tab order, not in the accessibility tree) | – |
| **Ready** | Both buttons at full strength | Click / tap / Enter / Space moves the view by three quarters of the screen (section 3), gliding |
| **At the left end** | ‹ dimmed (`opacity: 0.5`, as `.btn:disabled`), cursor `default`, no hover change; › ready | ‹ does nothing |
| **At the right end** | › dimmed likewise; ‹ ready | › does nothing |
| **Zoomed out until nothing can move** | Both disappear at once | – |
| **Zoomed in again** | Both appear, each ready or dimmed for where the pan is | – |

- **Disabled means `aria-disabled="true"`, not the `disabled` attribute.** A `disabled` button
  loses keyboard focus: pressing › with Enter until the end would throw focus back to the page, and
  a screen reader would jump. With `aria-disabled` the focus stays on ›, it is announced as
  unavailable, and its click handler does nothing. Style `[aria-disabled='true']` the same as
  `.btn:disabled` (opacity 0.5, `cursor: default`, no hover background). The component test checks
  `aria-disabled`.
- A dimmed button keeps its place, so the other never jumps.
- They don't fade or slide in; they appear and disappear at once, like the zoom buttons' own
  states (so nothing to switch off for reduced motion).

### Names (words exactly)

| Button | `aria-label` | `title` (tooltip) |
|---|---|---|
| ‹ | Show books to the left | Show books to the left (← key) |
| › | Show books to the right | Show books to the right (→ key) |

- The two buttons sit in a wrapper with `role="group"` and `aria-label="Move along the shelf"`,
  as the zoom buttons sit in `role="group"`, `aria-label="Zoom"`. If the wrapper spans the screen,
  it doesn't catch clicks (`pointer-events: none` on it, `auto` on the buttons).
- The `title` names the key, as "Zoom in (Ctrl + scroll)" does; that is the only place the
  shortcuts are mentioned (D-0014: no hint text). The glyphs ‹ › are not read; the label is.

## The cursor (computer)

| Where the mouse is | Cursor |
|---|---|
| Over the empty wall (wall, wood, floor, decorations, nooks, dividers), shelf can pan, no book open | `grab` |
| During a wall pan (button held, past 6 px), wherever the mouse is, also over a book or outside the window (pointer captured) | `grabbing` |
| Over the empty wall, shelf can't pan (zoom 1) | `auto`, as today |
| Over a book | as today: `grab` on hover (the book also lifts forward), `grabbing` while dragging it |
| A book open (the turn-the-book drag) | as today: `grab` / `grabbing` |
| Over ‹ › | `pointer` (from `.btn`); `default` when dimmed |

- `grab` on the wall is what a map does, and it is what the gesture is. A book shows the same
  `grab`, but it also lifts forward when hovered, so the book itself tells her it is a book.
- When a wall pan ends (button released), the cursor goes back to what is under the mouse at once:
  `grab` over the wall or a book.
- One place decides the cursor (the existing effect, extended with "can pan" and "wall pan on"),
  so the wall's `grab` never overwrites a book's hover, a book drag, or the open book's cursor.
- Touch has no cursor; nothing changes on the phone.

## Phone (390 × 844) and computer (1280 × 800)

- **Same buttons, same place rule** on both. On the phone they are the way to reach the ends
  without knowing the swipe; on the computer, the drag and ← → are extras.
- **Phone**: ‹ sits 16 px from the left edge. A swipe that *starts* on a button is a tap on the
  button, not a swipe. A swipe that starts in the first few pixels of the screen may be the
  iPhone's own back swipe (D-0032), which the page can't stop; the 16 px gutter keeps the button
  itself out of that strip.
- **Landscape phones and short windows**: the "stay above the zoom column" rule keeps › clear; no
  other change.
- **Woods**: the buttons are the same on every wood (see *Look*); check them on walnut (the
  default) on both wallpapers, and on white-washed and ebony, the lightest and the darkest.

## What a screen reader hears

- Tabbing from the header past the shelf: "Move along the shelf, group. Show books to the left,
  button." → "Show books to the right, button." → "Zoom, group. Zoom in, button." and so on.
- At an end: "Show books to the right, button, dimmed" (VoiceOver) or "unavailable" (NVDA).
  Pressing it does nothing; focus stays.
- Pressing a ready button moves the shelf; **nothing extra is announced**: the 3D shelf has no
  text for a screen reader to read, and "moved" on every press would only be noise. When a press
  reaches the end, the dimmed state is read the next time the button is read; it isn't announced
  on its own.
- Hidden buttons are not in the tree, so zoom 1 sounds exactly like today.
- The ← → keys also work while focus is on ‹ or › (section 4).

## Screenshots needed

In `docs/tasks/T-0025-screens/`, named `<what>-<width>-<wallpaper>.png` (or `.jpg`), zoomed in to
3×, at 1280 × 800 (mouse) and 390 × 844 (touch emulated), walnut unless named:

| What | 1280 lavender | 1280 midnight | 390 lavender | 390 midnight |
|---|---|---|---|---|
| `pan-left-end`: ‹ dimmed, the first book of each shelf fully visible beside ‹ | ✓ | ✓ | ✓ | ✓ |
| `pan-middle`: both ready | ✓ | ✓ | ✓ | ✓ |
| `pan-right-end`: › dimmed, the last book of each shelf fully visible beside › | ✓ | ✓ | ✓ | ✓ |
| `zoom-1`: no ‹ ›, zoom buttons as today | ✓ | | ✓ | |
| `pan-middle-white-washed`, `pan-middle-ebony`: the button's edge on the lightest and darkest wood | ✓ | ✓ | | |
| `pan-focus`: › focused by keyboard, the gold ring | ✓ | | | |
| `pan-right-end-focus`: › dimmed and still focused after Enter to the end | ✓ | | | |
| `book-open`: a book open while zoomed in, no ‹ › | | | ✓ | |

A cursor doesn't show in a screenshot; the tester reads `canvas.style.cursor` for each row of the
cursor table and writes the values in *Test*.

## Design checks (for the review and the tester)

- [x] ‹ and › are 44 × 44 px, round, 16 px from the screen's left and right edges, level with each
      other, centred between the header and the bottom; › doesn't touch the zoom column at either
      size.
- [x] They look exactly like the zoom buttons (background, border, plum glyph, hover, focus ring)
      on lavender and midnight, and their edge is visible on white-washed and ebony.
      *(Size and dimmed hover fixed in 5463b50; see the re-review below.)*
- [x] Hidden at zoom 1, with a book open, off the shelf and with no books; shown again when zoomed
      in, in the right state for where the pan is.
- [x] At each end the button on that side is dimmed (`aria-disabled="true"`, opacity 0.5), keeps
      its place, keeps focus when it got there by keyboard, and covers no book. *(On the phone the
      right end of each row is a decoration, so › lies beside the case's side; see the review.)*
- [x] Names and titles exactly as in *Names*; the group is "Move along the shelf"; Tab order
      ‹ → › → zoom buttons.
- [x] A tap or click on ‹ › never opens, lifts or moves the book under it.
- [x] Cursor: `grab` over the empty wall when the shelf can pan, `grabbing` during a wall pan,
      `auto` on the wall at zoom 1, books' cursors unchanged. *(From the code and the developer's
      checks; the tester reads `canvas.style.cursor` again.)*
- [x] No hint text anywhere; no new colour, size or spacing beyond the tokens and the zoom
      buttons' existing values.

## Review after building (2026-11-22)

**Verdict: changes needed (two small CSS fixes), then on to the tester.** I compared
`git diff main...HEAD -- src` and the 21 screenshots in `docs/tasks/T-0025-screens/` with the design,
state by state. The shelf now really slides: at 1280 the left end shows Book 32 whole beside ‹, the
right end Book 60 whole beside ›, and on the phone Book 8 whole beside ‹. The buttons sit where the
design put them (16 px in, level, centred under the header, › 103 px above the zoom column on the
phone), hide at zoom 1 and with a book open, dim at the ends and keep focus there
(`pan-right-end-focus`), and the names, titles, group and tab order are word for word. On
white-washed and ebony the plum border and the light fill keep the button's edge clear.

### Must fix

1. **A dimmed ‹ › changes on hover.** The base `.btn:hover:not(:disabled)` in `styles.css` still
   matches an `aria-disabled` button, and it is more specific than `.shelf-pan .btn`, so hovering a
   dimmed button turns its fill into `--surface-hover` (almost transparent) with the gold
   `--accent-line` border: a ghost ring that looks as if it reacts. The design says a dimmed button
   has *no hover change*. Keep the zoom buttons' fill and border on
   `.shelf-pan .btn[aria-disabled='true']:hover` (`rgba(255, 255, 255, 0.78)`,
   `rgba(45, 32, 56, 0.2)`). New screenshot: `pan-right-end-hover-1280-lavender`, with the mouse
   over the dimmed ›.
2. **Make the zoom buttons 44 × 44 too, so the two groups match (choice 19).** At 1280 › sits
   straight above + − ⤢ 🎨 and is visibly bigger (44 against 38 px); on the phone the zoom buttons
   are 38 × 44, so not round. The design asks for one look shared by both groups and D-0020 asks
   for 44 px; the zoom buttons are the ones that are off, because `.btn.icon` (later in
   `styles.css`) overrides `.zoom-controls .btn`. Fix it on the zoom side (e.g. drop `icon` from the
   four zoom buttons, or a `.zoom-controls .btn.icon` rule), not by shrinking ‹ ›. The ‹ › `top`
   sum already counts the zoom column as four 44 px buttons, so › stays clear of it. Re-take
   `pan-middle-1280-lavender`, `pan-middle-390-lavender` and `zoom-1-390-lavender`.

### The developer's choices

- **16, the sideways wheel's direction: accepted.** Scrolling right now shows the books to the
  right, as every page and map does; the old sign only went unnoticed because nothing moved.
- **17, any open dialog counts as a panel: accepted.** It covers panels added later without wiring.
  For the tester: open and close the 🎨 room panel, Make a wish and quick update, then check that
  ← → work again, so a closed panel left in the page with `role="dialog"` can't switch the arrows
  off for good.
- **18, no hover lift during a wall pan: accepted.** Books lifting under a passing drag would look
  like grabbing them; this keeps the wall pan reading as moving along the room.
- **19, ‹ › 44 px while the zoom buttons are 38 px: not accepted as is;** see must-fix 2.
- **20, the end margin stays 0.05 m, and the phone right-end shots: accepted.** At every end the
  button lies on the wall or the case's side and cuts no book. On the phone each row ends in a
  decoration (the cat, the koala), so the end shot shows the cat beside the dimmed ›, not a spine.
  That *is* the end of the shelf, and the last book went past one step earlier. On the phone the
  check "the last book of each shelf fully visible beside ›" reads "the last thing on the row". No
  wider margin needed.
- **The dimmed › on midnight** is faint over the dark wall (`pan-right-end-1280-midnight`), as the
  dimmed + is; that is what dimmed means and it matches the zoom buttons, so it stays.

### Follow-up, not in this task

- **Opening a book while zoomed in on the phone** shows no book in front and doesn't dim the room
  (`book-open-390-lavender`: the sheet comes up over the zoomed shelf, no book lifted out). It is on
  main as well, so it comes from the zoom, not from this change, and fixing it means changing how
  the open book is placed in front of a zoomed camera: a different part of the scene, with its own
  check. Putting it here would hold up the fix Hanna asked for. Because she will now zoom and open
  books more, the architect raises it as its own task straight after this one.

### Re-review (2026-11-22)

**Verdict: pass.** Commit 5463b50 fixes both must-fixes; nothing else on screen changed.

1. **Dimmed hover:** `.shelf-pan .btn[aria-disabled='true']:hover` keeps the white 0.78 fill and
   plum border and is more specific than `.btn:hover:not(:disabled)`. In
   `pan-right-end-hover-1280-lavender` the dimmed › under the mouse looks just like the unhovered
   one: no see-through fill, no gold ring.
2. **Zoom buttons 44 × 44:** the four zoom buttons dropped `icon`, so `.zoom-controls .btn` sizes
   them; nothing else in `src` relied on `.zoom-controls .icon`. In `pan-middle-1280-lavender`,
   `pan-middle-390-lavender` and `zoom-1-390-lavender`, › and + − ⤢ 🎨 are the same round size and
   line up in one column, and › stays clear of the column at both sizes.

All eight design checks are ticked. On to the tester; the follow-up above stays with the architect.

# Build notes

- **The aim (2):** new `src/components/cameraAim.ts`. `frameCase(caseWidth, caseHeight, aspect,
  portrait, zoom)` is the rig's old framing sums moved out unchanged (`toCase`, `viewH`, `viewW`,
  `xMax` with the same 0.05 m end margin, `fitsH`); `aimCamera(camera, target, aim, parallax, dt)`
  eases `lookX` to the pan at rate 3 (as the camera's x), `lookY` at 6 and the tilt at 3, moves the
  camera to `target.x + parallax.x`, and calls `lookAt(lookX, lookY, 0)`. `useCameraRig` calls both;
  the first-mount jump aims at `base.x`. `FOV` lives there now.
- **Pure rules:** new `src/lib/shelfPan.ts`: `clampPan`, `panEdges` (0.03 m threshold, 1 mm ends),
  `sameEdges`, `buttonStep` (0.75) / `keyStep` (0.2), `keyTarget(target, canvas)` → `body` /
  `canvas` / `shelf-button` (a `button` inside `[data-shelf-controls]`) / `other`,
  `arrowKeyDirection(...)`, `mousePress(...)` → `undecided` / `book` / `wall` / `none`.
- **Scene (`BookshelfScene.tsx`):** `scroll.current.x` stays the one source of the pan (it also
  keeps `viewW`, the visible width at the case). A `useFrame` works out `panEdges` and, only when it
  changes, sets local state and calls the new `onPan` prop. The new `panControl` prop (a ref) gets a
  function that moves one ‹ › step. ← → are one `keydown` listener on `window`, there only while no
  book is open and the shelf is showing; it acts through `arrowKeyDirection`. The wall drag is in
  the scroll effect: a mouse `pointerdown` on the canvas notes the press, the first `pointermove`
  past 6 px decides through `mousePress` (with `pending` set by the book's handler → the book's, as
  before), a wall pan captures the pointer on the canvas and moves `panBy` / `scrollBy` 1:1, and
  ends on `pointerup` / `pointercancel` / `lostpointercapture`. The edge pan while a book is dragged
  sits next to the top/bottom edge scroll in the frame loop (`pointer.x` beyond ±0.7, up to
  1.2 m/s). The cursor effect adds `grab` on the wall when the shelf can pan and `grabbing` during a
  wall pan, and leaves the cursor alone while a book is open.
- **Page and CSS:** `ShelfPanButtons` (`src/components/ShelfPanButtons.tsx`) renders in
  `index.tsx` after the canvas and before the zoom group, with the zoom group's conditions plus
  "can pan". Both groups have `data-shelf-controls`. CSS: `.shelf-pan .btn` joins the zoom buttons'
  rules (background, border, plum glyph, hover, 44 × 44); the wrapper spans the stage with
  `pointer-events: none`; `top: min(centre between --header-h and the bottom, above the zoom column
  − space-2)`; `[aria-disabled='true']` gets opacity 0.5, `cursor: default`, no hover, no press.
- **Developer choices (recommended option, Hanna not asked):**
  16. **The sideways wheel now goes the right way:** `panBy` follows a finger (finger right → view
      left), and the wheel handler called it with the wheel's delta, so a trackpad scroll to the
      right (and Shift + scroll down) moved the view to the **left**. It couldn't be noticed while
      the camera aimed at the middle. Now `panBy(-sideways)`: scrolling right shows the books to the
      right, as a browser page does. One sign, in the wheel handler only. (Deviation: the task says
      only that it should "still pan".)
  17. **"A panel is open"** means any `[role="dialog"]` or open `<dialog>` in the page (room
      panel, Make a wish, quick update, wrap-up, adding a book, the cover picker), checked at the
      key press, so a new panel is covered without wiring.
  18. **Books don't lift under a wall pan:** hover is ignored while a wall pan is on, so dragging
      the wall across books doesn't look like grabbing them.
  19. **The ‹ › buttons are `.btn` without `.icon`**, so they really are 44 × 44 px. The existing
      zoom buttons measure 38 × 38 px on the computer and 38 × 44 on the phone, because `.btn.icon`
      (later in `styles.css`) overrides the width/height of `.zoom-controls .btn`. Not changed here
      (see the Log).
  20. **The end margin stays 0.05 m:** on every end shot the button lies on the wall or the case's
      side, beside the last book, not on it, so `xMax` wasn't widened.
- **Clicked through** on `pnpm exec vite dev --port 3136 --strictPort` (no backend, no
  `POCKETBASE_URL`), 90 books seeded in `hannas-reading-list:v1`, playwright-core with Chrome.
  1280 × 800 with a mouse, 44 checks, all passed. The checks: ‹ › hidden at zoom 1, and ← → do
  nothing there. At 3× both are ready in the middle, and › / ‹ run to each end and disable. Cursors:
  `auto` on the wall at zoom 1, `grab` zoomed in, `grabbing` during a wall pan and a book drag,
  `grab` again after. A wall drag moves the view both ways, also up a row like a map, and releasing
  it over a book opens nothing. A click on the wall opens nothing and leaves focus on `body`. → took
  6 presses to the right end, and ← moved back. Shift + ← and ↑ leave the shelf alone. In the search
  box ← moved the caret 3 → 1 and the shelf stayed put. A click opens a book, the buttons hide, and
  ← with a book open did nothing. Dragging a book changes the saved order, and dragging one to the
  right edge pans to the end and drops it there. Shift + scroll and the sideways wheel pan. Tab
  goes ‹ → › → Zoom out (Zoom in is disabled at 3×). After Enter to the end, › is dimmed
  (`aria-disabled`, opacity 0.5) and keeps focus, and ← works with focus on ›. › is 44 × 44, 16 px
  from the edge.
  390 × 844 with `hasTouch` / `isMobile` and real CDP touch events (`Input.dispatchTouchEvent`), 32
  checks, all passed. The checks: a two-finger pinch zooms in and the buttons appear. + to 3×. A
  vertical swipe scrolls and leaves the pan alone. One-finger sideways swipes reach the right end
  (2 swipes) and the left end (4), and lifting the finger opens nothing. › / ‹ taps reach each end
  (3 taps), and a tap on the dimmed › does nothing. › sits 103 px above the zoom column. A tap
  opens a book and the buttons hide. Press, hold and drag moves a book (the saved order changes);
  dropped near the right edge, it also panned. Zoom 1 hides the buttons. No console errors and no
  horizontal page scroll at either size.
- **Screenshots:** 21 JPEGs in `docs/tasks/T-0025-screens/`, every row of the *Screenshots needed*
  table (`pan-left-end`, `pan-middle`, `pan-right-end` at 1280 and 390 on both wallpapers; `zoom-1`
  at both sizes; `pan-middle-white-washed` / `-ebony` at 1280 on both; `pan-focus`,
  `pan-right-end-focus`, `book-open-390-lavender`). On the phone every row near the top ends in a
  decoration (the koala, the cat), so its right-end shots show the case's right side and the
  decoration next to the dimmed ›, not a spine. On midnight the dimmed › over the dark wood is
  faint, as the disabled zoom buttons are.

# Test

To be written by the tester.

# Log

- 2026-11-22 architect: wrote the task from #234 and the feature chat; found the cause (the camera
  always aims at x = 0, so the pan turns the view round the middle instead of moving along it, on
  both devices; touch-action, pointercancel, overflow and xMax ruled out); recorded D-0032. Handed
  to the ux-designer for the ‹ › buttons and the wall-drag cursor.
- 2026-11-22 ux-designer: designed (the ‹ › buttons' place, look, states and names, the wall
  cursor, what a screen reader hears, the screenshots and design checks). Handed to the developer.
- 2026-11-22 developer: built it as specified, with these files: `cameraAim.ts` (the aim at the
  pan), `shelfPan.ts`, the ‹ › buttons, the wall drag, ← →, the edge pan while dragging a book, and
  the cursor. Also fixed the sideways wheel's direction (choice 16). Checks run:
  `pnpm test`: 90 files passed, 1 skipped, 865 tests passed, 9 skipped. The new tests are
  `shelfPan.test.ts`, `cameraAim.test.ts` and `ShelfPanButtons.test.tsx`; `cameraAim.test.ts` fails
  3 of 5 with the old `lookAt(0, …)`, checked by putting it back. `pnpm exec tsc --noEmit`: clean.
  `pnpm run build`: built. `pnpm exec harness check`: all ✓. `src/routeTree.gen.ts` unchanged.
  Clicked through on both sizes: 44 + 32 checks passed, 21 screenshots, no console errors. For the
  architect, not fixed here: (a) the zoom buttons are 38 px, not the 44 px tap size, because
  `.btn.icon` overrides `.zoom-controls .btn` (D-0020); (b) on the phone, opening a book while
  zoomed in shows no book in front and doesn't dim the room. It is the same on main's code (checked
  by stashing this work), so it comes from the zoom and not from this change. Handed to the UX
  designer for review. Draft PR #236.
- 2026-11-22 ux-designer: reviewed: changes needed. Must fix: (1) a dimmed ‹ › must not change on
  hover; (2) the zoom buttons 44 × 44 like ‹ › (D-0020). Accepted choices 16, 17, 18 and 20.
  Follow-up for the architect: on the phone, a book opened while zoomed in shows no book in front
  and doesn't dim the room (also on main), as its own task next. Handed back to the developer.
- 2026-11-22 developer: fixed both must-fixes. (1) `.shelf-pan .btn[aria-disabled='true']:hover`
  keeps the zoom buttons' fill and border: hovering the dimmed › reads `rgba(255, 255, 255, 0.78) |
  rgba(45, 32, 56, 0.2) | 0.5`, the same as before hovering (the ready › still turns `#fff`); new
  shot `pan-right-end-hover-1280-lavender`. (2) The four zoom buttons dropped `icon`, so
  `.zoom-controls .btn` sizes them: all six buttons measure 44 × 44 at 1280 and 390 (zoom 1 and 3),
  › lines up with the zoom column (x 1220) and stays clear of it (70 px at 1280, 103 px at 390);
  re-took `pan-middle-1280-lavender`, `pan-middle-390-lavender`, `zoom-1-390-lavender`. 14 checks on
  `vite dev --port 3136` (no backend), all passed, no console errors; vite stopped, 3136 free.
  `pnpm test`: 90 files passed, 1 skipped, 865 tests passed, 9 skipped; `tsc --noEmit` clean;
  `harness check` all ✓. Lesson added. Handed back to the UX designer.
- 2026-11-22 ux-designer: reviewed: pass. Both must-fixes checked on the diff and the four new
  screenshots; all design checks ticked. Handed to the tester.
