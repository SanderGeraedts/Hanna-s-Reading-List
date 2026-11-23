---
id: T-0026
title: "Show the taken-out book in front of a zoomed-in shelf and dim the room, and keep the search pop-up on screen"
description: "Zoomed in, a book she opens flies to a spot inside the bookcase and the dimming sheet sits behind the case (phone at 1.5× and more; the dimming also at 3× on the computer); the camera steps back while a book is out so both land in front of the case. Also: at 1024–1400 px the search pop-up opens half off the left edge."
status: Doing
depends_on: []
decisions: [D-0002, D-0014, D-0020, D-0022, D-0032]
raised_on: 2026-11-22
done_on: ""
result: [https://github.com/SanderGeraedts/Hanna-s-Reading-List/pull/238]
---

# Goal

Two bugs the team found while building T-0025 (its *Log*, the UX review's *Follow-up* and the
tester's *Not checked here*). Requester: Hanna. Night mode: she wasn't asked anything; the team's
picks are under *Choices made by the team*.

1. **On the phone, opening a book while zoomed in shows no book and doesn't dim the room.** The
   sheet with the book's details comes up, but the book leaves its place and disappears, and the
   room stays bright (`before-open-zoom3-390-lavender.jpg`). It happens on main too. Now that she
   can move along a zoomed-in shelf (T-0025) she will zoom and open books more. After the fix, a
   book opened at any zoom, panned anywhere, on the phone and the computer, stands whole in front of
   the dimmed room, the same size and in the same place on screen as at zoom 1, and closing it puts
   her back at the same zoom and pan.
2. **On the computer the search pop-up opens half off the left edge** at 1280 × 800
   (`before-search-1280-lavender.jpg`: the field starts at x = −322 px). Reproduced on main. After
   the fix the whole pop-up is on screen at every width.

## 1. The cause: the open book and the dimming are placed at fixed distances from the camera

All in `src/components/BookshelfScene.tsx` and `src/components/BookMesh.tsx`.

- **The book** flies to `cameraBase.z − dist` (BookMesh's frame loop), where
  `dist = h / (2 · tan(FOV/2) · fill)` is the distance at which the book fills `fill` of the view's
  height. `dist` doesn't depend on the zoom.
- **The dimming** (`Backdrop`) is a dark plane at `cameraBase.z − 1.25`, a fixed 1.25 m in front of
  the camera.
- **Zooming in moves the camera towards the case**: `frameCase` divides the distance by the zoom,
  down to 0.35 m. The case's front is at z = `SHELF.depth / 2` = 0.15 (its back at −0.15).

Once the camera is closer to the case than `dist` (book) or 1.25 m (dimming), they land inside or
behind the bookcase. The books in front hide them: the book "vanishes" into the shelf, and the
dimming is drawn behind the books, so nothing darkens.

**Why the phone more than the computer:** on a phone held upright the sheet covers the bottom of
the screen, so `portraitInspect` makes the book fill less of the view (`fill` ≈ 0.38 at the default
sheet height 0.45, against 0.6 on the computer). A smaller `fill` means a larger `dist` (0.85–0.98 m
for the books on a 60-book shelf, against 0.54–0.62 m), so the book reaches into the case already
at zoom 1.5–2, while on the computer it just stays in front even at 3×.

Worked out with the real `fitShelf` / `computeLayout` / `frameCase` for 60 books (heights
0.28–0.325 m), sheet at 0.45, header 0.1 (z values; the case's front is 0.15, in front is larger):

| Screen, zoom | Camera z | Dimming z | Book z (tallest – shortest) | What she sees |
|---|---|---|---|---|
| 390 × 844, 1 | 2.507 | 1.257 | 1.160 – 1.345 | book in front; the **tallest books sit behind the dimming** and are dimmed themselves (`before-open-zoom1-390-lavender.jpg`: the cover looks dark) |
| 390 × 844, 1.5 | 1.721 | 0.471 | 0.374 – 0.560 | the tallest books behind the dimming |
| 390 × 844, 2 | 1.328 | 0.078 | −0.018 – 0.167 | **book inside the case, dimming inside the case** |
| 390 × 844, 3 | 0.936 | −0.314 | −0.411 – −0.226 | **book behind the case's back, dimming behind the case**: the bug Hanna will see |
| 1280 × 800, 1 | 2.890 | 1.640 | 2.032 – 2.150 | fine |
| 1280 × 800, 2 | 1.520 | 0.270 | 0.662 – 0.780 | fine |
| 1280 × 800, 3 | 1.063 | **−0.187** | 0.205 – 0.323 | book just in front (so the tester saw it centred), **but the room isn't dimmed**: the dimming is behind the case (`before-open-zoom3-1280-lavender.jpg`) |

So the computer is not entirely fine: at 3× the book is centred (T-0025 fixed that) but the room
stays bright. One cause, both devices; the phone shows it worst.

### Checked, and not the cause

- **The near plane** (`near: 0.05` on the `<Canvas>` camera): the book is never closer than 0.5 m
  to the camera; nothing is clipped by it.
- **The pan**: the book and the dimming use `cameraBase.x`, which is the pan, and since T-0025 the
  camera looks straight ahead at the pan, so sideways they are right (the tester's
  `shelfPanFraming.test.ts` checks that). The fault is only in depth (z).
- **Portrait framing of the book on screen** (`portraitInspect`: between the header and the sheet,
  narrow enough for the widest cover): correct; it is the reason `dist` is large, not a fault.
- **The dimming's own material** (`depthWrite: false`, transparent, `renderOrder` 10): fine once
  it is in front of the case; the problem is only where it stands.

## 2. The fix: the camera steps back while a book is out

The book must stay the size and place on screen it has today (that is what `fill` and `yShift`
are for), so its distance to the camera can't shrink. Instead, **while a book is out, the camera's
target is never closer to the case than the book and the dimming need**, and when the book goes
back the camera eases back to the zoom and pan she had. The room behind is dimmed while this
happens, so the step back is barely seen.

- **Order in depth, front to back**: camera → (at least the near plane plus a margin) → the book,
  `dist` in front of the camera → a gap of half the book's largest size (its cover's width, so a
  book she turns by dragging never cuts through the dimming) plus a margin → the dimming → a margin
  → the front of the case, including what may stick out of it (a search match comes forward
  `MATCH_FORWARD` = 0.06, a hovered book 0.035).
- **The camera target's z while a book is out** = the larger of the zoomed-in z (`cameraZ(toCase)`)
  and the z that order needs for the open book with the current `fill` (the phone's `fill` changes
  as she drags the sheet, so this follows it). x and y stay the pan and the scroll:
  `scroll.current` is not touched, so closing the book returns her exactly where she was.
- **The dimming stands between the book and the case**, worked out from the same order, not at a
  fixed 1.25 m. That also fixes the tallest books being dimmed at zoom 1 on the phone.
- At zoom 1 on the computer nothing changes (the camera is already far enough away).
- **One pure function** does these sums, so a test can check them without a canvas, e.g.
  `inspectPlacement({ cameraZ, caseFront, bookH, bookW, fill, fov })` →
  `{ cameraZ, bookZ, backdropZ }` (names and file are the developer's; next to `cameraAim.ts` is
  natural). `useCameraRig`, `BookMesh` and `Backdrop` use it. `portraitInspect` moves where the
  test can import it.
- The book's flight (pull out, then fly) and the camera's easing run together; check that no frame
  shows the book cut by the near plane or passing through other books once it is out of its slot.
  If the flight looks wrong while the camera eases back, the developer may base the flight on the
  camera's eased position instead of its target; that is theirs to pick, the settled placement is
  the rule.

## 3. The search pop-up

`.search-pop` in `src/styles.css` is `position: absolute; right: 0` inside `.search`, so it opens
**leftwards from the right edge of the search button**. That only works when the search sits at
the right of the header. The header (`.topbar`) wraps: from 721 px up to about 1400 px the toolbar
doesn't fit beside the title and drops to a second row starting at the left (x = 24), and the
search button is its first item. A 24rem (384 px) pop-up anchored to the right of a 38 px button at
x = 24 starts at x = −322.

Measured on main (vite, no backend, 70 books):

| Width | Toolbar starts at | Pop-up left – right |
|---|---|---|
| 1024 | x 24, second row | **−322 – 62** |
| 1280 | x 24, second row | **−322 – 62** |
| 1440 | x 593, first row | 247 – 631 (on screen) |

Fix: **anchor the pop-up to the left of the search** (`left: 0; right: auto`). The search is always
the toolbar's first item and the toolbar is wider than the pop-up, so opening rightwards stays on
screen in both header layouts; the existing `width: min(24rem, 100vw − 2rem)` stays. The phone rule
(≤ 720 px: `position: fixed`, 16 px from both edges) is unchanged. If the developer finds a width
where that isn't enough, clamping in CSS (e.g. `max-width` from the button's left) is fine; no JS
measuring for this.

# Done when

- **Unit test of the placement math** (e.g. `src/components/inspectPlacement.test.ts`), with the
  real `fitShelf` / `computeLayout` / `frameCase` like `shelfPanFraming.test.ts`, a 60-book shelf,
  its shortest and tallest book, and a real `THREE.PerspectiveCamera` (FOV 35, near 0.05) placed at
  the settled result:
  - screens and zooms: **390 × 844 at zoom 1, 1.5, 2 and 3** (`fill` from `portraitInspect` with
    the sheet at 0.45, and also at the smallest and largest sheet, `SHEET_MIN_PX` / 844 and
    `SHEET_MAX` 0.88, exported from the book panel if needed), and **1280 × 800 at zoom 1, 2 and 3** (`fill` 0.6); pan at 0 and at ±`xMax`;
  - for each: `bookZ < cameraZ − 0.05 − margin`; `backdropZ ≤ bookZ − bookW / 2 − margin`;
    `backdropZ ≥ 0.15 + MATCH_FORWARD + margin` (in front of the case and anything sticking out);
  - the book's size on screen is unchanged: its height in NDC is `2 × fill` (± 1 %), and its centre
    is at NDC y = `2 × yShift` (± 1 %) and NDC x = 0, whatever the zoom and pan;
  - on the phone the whole book (its width at the widest cover, aspect 0.82) projects inside
    NDC x ±1 and between the header and the sheet;
  - at 1280 × 800 zoom 1 the camera z is unchanged (no step back where none is needed);
  - **it fails before the fix**: with today's sums (camera at `cameraZ(toCase)`, dimming at
    camera − 1.25, book at camera − `dist`) it is red at least for 390 × 844 zoom 2 and 3 (book z
    −0.018 / −0.411) and 1280 × 800 zoom 3 (dimming z −0.187). The developer shows that in the
    *Log* (e.g. by running the test against a copy of the old sums), like T-0025's camera test.
- **The existing tests pass**, including `cameraAim.test.ts`, `shelfPanFraming.test.ts`,
  `BookMesh.test.ts`, `SafeBookshelf.test.tsx` and `contextLoss.test.ts`.
- **Clicked through** on a local dev server with no backend (`pnpm run dev` or `vite dev` on a free
  port, never a production `POCKETBASE_URL`; 60+ books seeded in `hannas-reading-list:v1`), on
  **lavender and midnight**, screenshots in `docs/tasks/T-0026-screens/` (the `before-*` shots
  there are main, taken by the architect):
  - **390 × 844, touch emulated** (`hasTouch` / `isMobile`, real touch events): at zoom 1, 2 and 3
    (+ and a two-finger pinch), in the middle and panned to each end: a tap on a book shows it whole
    in front, between the header and the sheet, the room dimmed, the book itself not dimmed;
    dragging to turn it never cuts it with the dimming; dragging the sheet up and down keeps it
    whole and in front; closing it (× and a tap on the dimmed room) brings back the same zoom and
    pan, with ‹ › back as before. A mid-flight screenshot (about 0.3 s after the tap) shows no book
    cut off or inside the case.
  - **1280 × 800, mouse**: the same at zoom 1 and 3, panned to an end: book in front and centred,
    **room dimmed at 3×**; closing returns to the same zoom and pan.
  - **Search pop-up** at 1024, 1280, 1440 and 1920 wide (800 high) and 390 × 844: open it, type
    "title": the pop-up's `getBoundingClientRect()` has `left ≥ 0` and `right ≤ innerWidth`, the
    results list is on screen and a click on a result opens that book. At 390 it looks as on main.
  - No console errors, no horizontal page scroll.
  - Screenshots: `open-zoom3-390-*`, `open-zoom3-panned-390-*`, `open-zoom1-390-*`,
    `open-zoom3-1280-*`, `open-flight-390-lavender`, `search-1280-*`, `search-1024-lavender`
    (the full list is under *Design*, section 4).
  - **Reduced motion** (`reducedMotion: 'reduce'` emulated, 390 × 844, zoom 3): opening and
    closing a book moves the camera in one frame, with no easing; with the setting off it eases.
  - **The tallest book's cover** opened at zoom 1 on the phone is not dimmed (compare with
    `before-open-zoom1-390-lavender.jpg`).
- **Design check** (UX designer, light pass on the screenshots): the open book looks the same size
  and place as at zoom 1, the room is as dark as at zoom 1 on both wallpapers, nothing in the step
  back looks like a jump, and the search pop-up sits under the search button.
- `pnpm test`, `pnpm run build` and `pnpm exec harness check` pass; `src/routeTree.gen.ts`
  unchanged.
- **Hanna** opens a book while zoomed in on her phone on the live site and says it shows. Until she
  has, the task stays Doing with a `Remaining:` line.

# Notes

- **Group 1** (app code only), nothing for Sander: no change to `Book`, the shelf's saving or sync,
  `src/server/` or `deploy/nas/`; no new package, no outside service.
- **Files:** `src/components/BookshelfScene.tsx` (`useCameraRig`: the step back while a book is
  out; `Backdrop`: its z; `portraitInspect`: exported or moved), `src/components/BookMesh.tsx` (the
  book's target z), a new pure module with its test (e.g. `src/components/inspectPlacement.ts`),
  `src/styles.css` (`.search-pop`).
- **D-0032 / T-0025:** the pan, the ‹ › buttons, ← → and the swipe stay as they are;
  `scroll.current` stays the one source of the pan and isn't changed by opening a book. **D-0002:**
  stays in react-three-fiber. **D-0020 / D-0022:** no new colours; the dimming keeps its colour and
  strength. **D-0014:** no hint text.
- Don't break: the book panel's drag to turn the book, the soft light near the viewer (it follows
  `cameraBase`, so it moves with the step back; check the open book is still well lit), the
  search's glow and pan to the first match, the mouse parallax being off while a book is open.
- Before-screens: `docs/tasks/T-0026-screens/before-*.jpg` (main at a044da1, swiftshader, 70
  books).

## Choices made by the team

Hanna wasn't asked anything (night mode). The architect took these:

1. **Step the camera back while a book is out**, rather than making the book smaller or drawing it
   on top of everything. It keeps the book exactly the size and place she knows from zoom 1, and
   uses the same scene; drawing it "on top" would need a second render pass for little gain.
   **Re-ask Hanna in the morning:** "When you open a book while zoomed in, the shelf behind it now
   moves back a little (it's dimmed, so you hardly see it), and when you close the book you're back
   where you were. Is that how you'd like it?" The fix ships before her answer; it is easy to change.
2. **Closing the book returns to the same zoom and pan**: the zoom and pan aren't changed by
   opening a book, only the camera's distance while it's out.
3. **The dimming moves with the book** (between the book and the case) instead of a fixed 1.25 m,
   which also stops the tallest books being dimmed at zoom 1 on the phone.
4. **The search pop-up opens to the right of the search button**, at every width above the phone
   layout, rather than measuring the screen in code; the phone layout is unchanged.
5. **Both bugs in one task**: the search fix is one CSS rule, found by the same team, and tested in
   the same click-through.
6. **No new decision record**: both are bug fixes within D-0032 and D-0020, easy to undo.

# Design

(UX designer, light pass: two bug fixes, no new screens, no new words, no new colours.)

## 1. The open book on a zoomed-in shelf

**Looks right when** a book opened at zoom 2 or 3, panned anywhere, can't be told apart from the
same book opened at zoom 1:

- **The book**: whole, the same size and in the same place on screen as at zoom 1 (on the phone:
  centred between the header and the top of the sheet, as in `before-open-zoom1-390-lavender.jpg`;
  on the computer: centred). Its cover is in full light, never dimmed, never cut by a shelf, a
  neighbouring book or the edge of the dimming, also while she turns it by dragging.
- **The room**: as dark as at zoom 1 on both wallpapers (the same colour and strength, D-0020),
  covering the whole case behind the book. The books on the shelf behind it may look a little
  smaller than they did at that zoom: that is the step back, and fine.
- **Fixed by the same rule at zoom 1 on the phone**: today the tallest books open with a darkened
  cover (`before-open-zoom1-390-lavender.jpg`, "Title 5" looks dull). After the fix the cover is
  as bright as a short book's.
- **Closing** (× or a tap on the dimmed room): the book flies back into its slot and the shelf
  comes back to exactly the zoom and pan she had; the ‹ › buttons show as before.
- Nothing else changes: the book panel, its drag to turn the book, the search glow, the zoom
  buttons.

## 2. Motion

- **The step back is smooth, not a jump.** The camera eases back with its usual easing (the same
  soft ease-out the zoom and pan use, about the length of the book's own flight), starting at the
  tap, together with the book's flight and the dimming's fade-in. Because the room is fading to
  dark at the same moment, it reads as "the room recedes while the book comes forward". No
  bounce, no overshoot, no pause before the book moves.
- **Closing is the same in reverse**: the dimming fades out, the book flies home and the camera
  eases forward to her zoom, all together.
- **Dragging the sheet on the phone**: the book's placement follows the sheet as it does today;
  any small camera correction this causes follows the finger smoothly, never in steps.
- **Never in any frame**: the book disappearing into or behind the case, the book cut off, the
  dimming in front of the book, or the room flashing bright between closing and opening another
  book.
- **`prefers-reduced-motion: reduce`**: no camera movement at all. The camera **goes straight to**
  its stepped-back distance in the frame the book is opened (and straight back to her zoom in the
  frame it is put back), so only the dimming's fade is seen moving the room. The book's own flight
  stays as it is today (it isn't part of this task; see the question for the morning). The scene
  doesn't read this setting yet; checking `matchMedia('(prefers-reduced-motion: reduce)')`, as
  `DashboardMore.tsx` does, is enough.

## 3. The search pop-up

**Looks right when** the pop-up hangs directly under the search button, its left edge in line
with the button's left edge, and opens to the right over the toolbar, at every width above the
phone layout (721 px and up), whether the toolbar sits on the title's row or on a row of its own.
Nothing of it is cut off by the window; the results list under the field is fully on screen; it
keeps its width, shadow and look. On the phone (≤ 720 px) it looks exactly as on main.

## 4. Screenshots for the developer

In `docs/tasks/T-0026-screens/`, on a local dev server with no backend, 60+ books; lavender and
midnight where `*` stands:

1. `open-zoom1-390-*`: phone, zoom 1, a tall book open (compare the cover with the before-shot).
2. `open-zoom3-390-*`: phone, zoom 3, middle of the shelf, book open.
3. `open-zoom3-panned-390-*`: phone, zoom 3, panned to an end, book open.
4. `open-flight-390-lavender`: phone, zoom 3, about 0.3 s after the tap (mid step-back).
5. `open-closed-zoom3-390-lavender`: phone, after closing that book: same zoom and pan as before
   opening, ‹ › visible.
6. `open-zoom3-1280-*`: computer, zoom 3, panned to an end, book open, room dimmed.
7. `open-zoom3-390-reduced-lavender`: phone, zoom 3, with reduced motion emulated
   (`reducedMotion: 'reduce'`), taken about 0.1 s after the tap: the camera is already stepped
   back (the shelf behind already at its final size).
8. `search-1024-lavender`, `search-1280-*`, `search-1440-lavender`, `search-1920-lavender`,
   `search-390-lavender`: the pop-up open with "title" typed and results showing.

## Questions for Hanna in the morning

Night mode: nothing was asked; the fix ships with these picks and each is easy to change.

1. (The architect's question, kept.) "When you open a book while zoomed in, the shelf behind it
   now moves back a little, and when you close the book you're back where you were. Is that how
   you'd like it?"
2. "If your phone is set to reduce motion, the shelf now jumps back instead of gliding. The book
   still flies out of the shelf as before. Should the book also just appear, without flying?"
   (Only relevant if she uses that setting; if so, it is a small follow-up task.)

## Review after building (2026-11-22)

(UX designer. Looked at: `git diff origin/main...HEAD -- src`, the 21 screenshots in
`docs/tasks/T-0026-screens/` (4 before, 17 after) and the checks in the developer's *Log*.)

**Verdict: matches the design. No must-fix items.** Hand to the tester.

### State by state

| Design says | Seen | |
|---|---|---|
| Book at zoom 3 on the phone: whole, same size and place as at zoom 1, between the header and the sheet | `open-zoom3-390-*` against `open-zoom1-390-*`: the cover stands in the same spot and at the same size (top ≈ 363 px, bottom ≈ 882 px in both), whole, in front of the case | matches |
| Panned to an end | `open-zoom3-panned-390-*`: whole and centred; the wall beside the case is dimmed too | matches |
| Room as dark as at zoom 1, both wallpapers | lavender and midnight at zoom 3 look as dark as at zoom 1; on the computer the room is **now dimmed at 3×** (`open-zoom3-1280-*` against `before-open-zoom3-1280-lavender.jpg`) | matches |
| Cover in full light, also the tallest book at zoom 1 | `open-zoom1-390-*`: Title 28 (the tallest) is bright; before, Title 5 was dull | matches |
| Step back eases together with the flight, no frame with the book inside the case | `open-flight-390-lavender` (0.3 s): book whole, outside the case, the shelf still close (the camera is easing) | matches |
| Closing: same zoom and pan, ‹ › as before | `open-closed-zoom3-390-lavender`: zoom 3, left end, ‹ off, › on | matches |
| Reduced motion: the camera there in one frame | `open-zoom3-390-reduced-lavender` (0.1 s): shelf already at its stepped-back size, the book still at its slot, the dimming just starting | matches |
| Search pop-up under the button, opening rightwards, on screen at every width; phone as on main | `search-1024/1280/1440/1920-*`: left edge in line with the search button, list fully on screen (24–408, 593–977, 1073–1457 px); `search-390-lavender` as on main | matches |
| No new colours, words or hint text | none in the diff (D-0014, D-0020, D-0022) | matches |

I also simulated the closing flight with motion on (camera `damp(…, 3)`, book `progress` at 4.5,
zoom 3 on the phone): the book flying home is at most about 12 % larger than when it was open,
and only for ~0.2 s, the same as the developer's 15 % for opening. That reads as "the same in
reverse". The tester could add one screenshot about 0.2 s after × to see it.

### The developer's notes

1. **Turning reach is half the book's 3D diagonal, not half the cover's width.** Accepted. My
   rule was there so a turned book never cuts the dimming; the 3D diagonal is what really keeps
   that promise, at the cost of a few cm more step back, which no one sees behind the dimming.
2. **Sheet at its highest (0.88): the book reaches under the header and the camera steps back
   about 4 m.** **Follow-up, not must-fix.** Reasons: it only happens with the sheet dragged
   almost to the top, where there is 2 % of the screen left for a book; the part under the header
   is the same on main (where the book was also behind the case, so this build is already better);
   the book stays whole and in front and the room stays dimmed (the case is about 4 m away, still
   in front of the fog that starts at 6 m); and the right answer is a design choice, not a bug fix.
   Follow-up task for the architect: while a book is out on the phone, either keep the sheet
   lower than `SHEET_MAX` so a book always has room (my first pick: stop the sheet at the height
   where `portraitInspect`'s minimum still fits under the header), or let the book shrink further.
   Either way the 4 m step back then disappears with it. The paper clip of a bookmarked book
   reaching under the dashboard buttons (`open-zoom3-panned-390-*`) belongs to the same task; it
   is the same at zoom 1.
3. **The flight stays on the camera's target; a book flying home keeps the last spot it had.**
   Accepted. Without it the book would jump into the case the moment she closes it. The
   simulation above shows the closing flight stays smooth.
4. **Reduced motion: putting the book back, the camera jumps forward first and the book flies home
   from close by, large for a moment.** **Follow-up, not must-fix.** It is what section 2 asked
   for (camera straight back in the frame the book goes back, the book's flight unchanged), and it
   is only seen with that setting on. By my sums the book looks about 1.8 × its open size for a
   moment at zoom 3, which is the kind of sudden change reduced motion is meant to avoid. Fold it
   into Hanna's question 2: if she uses the setting, the follow-up either makes the book appear and
   disappear without flying, or (smaller) jumps the camera back only once the book is home.

### Follow-ups (not blocking)

- F1 (note 2): the sheet at its highest leaves no room for the book; decide sheet cap or smaller
  book; also covers the 4 m step back and the bookmark clip under the header.
- F2 (note 4): reduced motion, the book large for a moment when put back; decide with Hanna's
  answer to question 2.

# Build notes

- **The sums (2):** new `src/components/inspectPlacement.ts`. `inspectPlacement({ cameraZ,
  caseFront, bookH, bookW, bookT, fill, fov })` → `{ cameraZ, bookZ, backdropZ }`, front to back:
  dimming at least `caseFront + 0.06 + 0.02` (0.06 = `MATCH_FORWARD`, also covers a hovered book's
  0.035; margin `INSPECT_MARGIN` = 0.02); book at least the dimming + its turning reach + 0.02;
  camera = the larger of her zoom's z and book + `dist`. The dimming stands right behind the turning
  book (`bookZ − reach − 0.02`). `inspectDistance(h, fill, fov)` is the old `dist` sum, now shared by
  `BookMesh`. `portraitInspect` and `HEADER_SHARE` moved here unchanged so the test can import them.
- **Turning reach:** half the book's 3D diagonal, `hypot(w, h, t) / 2`, not half the cover's
  width as written in section 2. Dragging can turn the book any way round sideways and tilt it up
  to 0.9 rad, and then a corner reaches about 0.21 m towards the case for the tallest book, more
  than `w / 2` (0.13 m); with `w / 2` the dimming could cut a corner while she turns it. It only
  makes the step back a few cm larger; the test's `backdropZ ≤ bookZ − bookW / 2 − margin` holds
  with room to spare.
- **The camera (useCameraRig):** gets the open book's dims and the live `inspectFrame`; every frame
  its target z is `inspectPlacement(…).cameraZ` while a book is out, else her zoom's z. x and y stay
  the pan and the scroll (`scroll.current` untouched), so closing eases back to the same zoom and
  pan. The placement is kept after closing, so the dimming fades out where it stood. Easing is the
  camera's usual `damp(…, 3)` in `aimCamera`.
- **The book's flight:** kept on the camera's *target* (as before), not its eased position. I
  simulated both against the camera's easing at zoom 3 on the phone: on the target the book is
  never closer than 0.78 m to the camera, never behind z 0.32 once it is 30 % out, and at most
  15 % larger than its final size mid-flight; the mid-flight screenshot shows it whole. New: a book
  flying home keeps the last spot it had while out; without that it would jump into the case the
  moment the camera's target goes back to her zoom.
- **The dimming (Backdrop):** at `placement.backdropZ` instead of camera − 1.25.
- **Reduced motion:** `useReducedMotion()` reads `matchMedia('(prefers-reduced-motion: reduce)')`
  (live). Then, while a book is out and in the frame it is put back, the camera's z is set straight
  to its target after `aimCamera`; zooming and panning are unchanged. The book's own flight stays.
- **The search pop-up (3):** `.search-pop` is `left: 0; right: auto`. The phone rule (≤ 720 px)
  still sets `left/right: 16px`, so it looks as on main.
- **The sheet constants:** `SHEET_MIN_PX` and `SHEET_MAX` are exported from `BookPanel.tsx` for the
  test (values unchanged).
- **Found, not fixed (for the architect):** with the sheet dragged up to `SHEET_MAX` (0.88) there is
  only 0.02 of the screen between the header and the sheet, but `portraitInspect` keeps a book at
  least 0.15 × 0.85 of the view tall, so the book reaches under the header (same on main, only
  then it was also behind the case). The test checks "between the header and the sheet" wherever
  `fill ≤ 1 − sheet − header` and the other checks at every sheet height. Also at `SHEET_MAX` the
  book is small, so `dist` is about 4 m and the camera steps back that far (the case is still
  dimmed and in front of the fog, see `sheet-up` in the click-through).

# Test

(tester, 2026-11-22, branch at 8399c08 plus the tests below)

**Verdict: passed.** What remains is Hanna's check on her phone (see the last *Log* line).

## CI's run (read, not repeated)

`gh pr checks 238`: `checks / checks pass 50s` (run 45073857805), deploy preview `pass`; `e2e` and
`shards` are skipped because this project gives no `e2e` command (`e2e:` empty in the run's inputs),
as on every pull request here. From `gh run view 45073857805 --log`: `harness check` ✓,
`src/components/inspectPlacement.test.ts (16 tests)` ✓, `Test Files 92 passed | 1 skipped (93)`,
`Tests 885 passed | 9 skipped (894)`, `✓ built`. No retries in the log, nothing flaky.

## Checked again here

- `pnpm install --frozen-lockfile`: `Done`. `pnpm exec harness check`: `✓ tasks`, `✓ decisions`,
  `✓ engineers`, `✓ generated files`.
- The new and affected tests, 5 times in a row: `pnpm exec vitest run inspectPlacement.test.ts
  cameraAim.test.ts shelfPanFraming.test.ts BookMesh.test.ts SafeBookshelf.test.tsx
  contextLoss.test.ts` → `Test Files 6 passed (6)`, `Tests 37 passed (37)` every time.
- **Fails before the fix, checked myself:** with today's sums put back into `inspectPlacement`
  for a moment (camera at her zoom, dimming at camera − 1.25): `Tests 11 failed | 5 passed (16)`,
  e.g. `390×844 zoom 3 sheet 0.450 … camera 0.936, book -0.226, dimming -0.314`. Restored with
  `git checkout`.
- `pnpm exec tsc --noEmit`: no output. `pnpm run build`: `✓ built`. `src/routeTree.gen.ts`
  unchanged against main.
- Code read: `inspectPlacement.ts` (the order camera → book → turning room → dimming → case + 0.06
  holds; a hovered *and* glowing book would stick out 0.095, 1.5 cm past the 0.08, but hover is off
  in practice while one is open, because the dimming in front of the shelf takes the pointer; not
worth a change), `useCameraRig` (x and
  y untouched, `scroll.current` untouched, the placement kept after closing so the dimming fades
  where it stood), `BookMesh` (target only while selected), `BookPanel` (two exports, values
  unchanged), `.search-pop` (`left: 0; right: auto`; the ≤ 720 px rule still sets 16 px both sides).

## Tests added (gaps)

In `src/components/inspectPlacement.test.ts`, a second `describe` (12 tests; the file now has 28):

- **More screens**: phone turned sideways (844 × 390), 1024 × 800, 1920 × 1080, at zoom 1, 2, 3;
  a short shelf (5 books) and a long one (200) on the phone and the computer; every book on the
  shelf, not only the shortest and tallest.
- **The dimming covers the whole view and isn't tinted by the fog** (it must stay nearer than the
  fog's start at 6 m and inside the 20 × 20 plane), also with the sheet at its highest.
- **A book turned any way by dragging** (500 turns: any way round, tilted up to 0.9 rad, leaning):
  no corner reaches the dimming or the camera.
- The same input gives the same placement; a camera already far enough is left where it is.
- With today's sums they are red too: `Tests 17 failed | 11 passed (28)`. With the fix:
  `Tests 28 passed (28)`, 3 runs in a row.

## Tried to break it

`vite dev --port 3139` (no backend, 70 books in `hannas-reading-list:v1`), Chrome via
playwright-core; phone 390 × 844 with `hasTouch`/`isMobile` and CDP touch events, computer
1280 × 800 with a mouse. Screens in the scratchpad, not committed.

| Tried | Result |
|---|---|
| Phone: open at zoom 1, 2 (pinch), 3 in the middle and panned to the left end, close with × | book whole in front each time; a strip of the wall goes from brightness 109 → 62 (zoom 1), 84 → 49 (2), 78 → 48 (3), 178 → 92 (left end); after closing the screen is **the same as before opening** (0.0–0.2 % of pixels changed, against 64 % for one pan step); ‹ › and zoom buttons as before |
| Phone at zoom 3 panned to the right end | the right end is the koala's nook, no book in reach to tap; fine |
| Open, then zoom or pan while it's open (phone: pinch and swipe on the dimmed room, ← and + keys; computer: wheel, keys) | the zoom and ‹ › buttons are hidden while a book is out; pinch, swipe, keys and wheel don't zoom or pan (their handlers are off while a book is open); the book stays whole and in front; after closing, the same zoom and pan. The only change: after a swipe or pinch on the phone the whole view sits a few pixels sideways, which is the existing mouse parallax following the last touch (the same on main, not this task) |
| Search while zoomed in (zoom 3, left end; 1280, 1024, 390), "Title 6", click the last result (Title 56) | pop-up at 24–408 (1280 and 1024) and 16–374 (390); the book opens whole, centred and in front, room dimmed; closing back at zoom 3 |
| Rotate the phone while a book is open (390 × 844 → 844 × 390 → back) | stays open; back upright the book is whole between the header and the sheet, room dimmed; no horizontal scroll. Sideways the book stands half under the toolbar and the panel, **the same at zoom 1** (checked), so it is the sideways phone layout, not this task (see *Not checked / found*) |
| Resize the computer window while a book is open (1280 → 1024 × 700 → 1920 × 1000 → 760 × 900 → 600 × 900 → 1280) | stays open, book in front, no horizontal scroll at any size. Closing after that it was zoom 3 but no longer at the right end (› on): the narrow sizes have a smaller pan range and clamp the pan (T-0025's rule), as expected |
| Reduced motion on, zoom 3 | right after the tap the shelf behind is already at its stepped-back size; with it off the camera is still close and eases. Switching the setting while a book is open and then closing: back at the same view (1.6 / 1.7 % changed, the fairy lights) |
| About 0.2 s after ×, motion on (the UX reviewer's shot), phone and computer | the book is already nearly in its slot, never larger than when open, never cut; the camera on its way back; at 0.35 s nearly home. Reads as the opening in reverse |
| Twice in a row: close and open another book within 0.15 s | the new book flies out whole; no flash of a bright room in between |
| Console errors | none in any run |

## Not checked here / found

- **Hanna's real phone** on the live site: Remaining.
- Found, **not this task**: on a phone held sideways (844 × 390) an open book stands half under
  the toolbar and the details panel, at every zoom including 1 (layout of the sideways phone). For
  the architect, maybe with follow-up F1.
- Found, **not this task**: on the phone the mouse parallax follows the last touch, so after a
  swipe the view sits a few pixels sideways (same on main).

# Log

- 2026-11-22 architect: wrote the task from T-0025's follow-ups. Cause 1: the open book flies to a
  fixed `dist` in front of the camera and the dimming sits a fixed 1.25 m in front of it; zooming
  in brings the camera closer to the case than that, so both end up inside or behind the bookcase
  (phone at 1.5× and up, worst at 3×: book z −0.41, behind the case's back; the phone's smaller
  `fill` under the sheet makes `dist` larger); on the computer at 3× the book stays just in front
  but the dimming is behind the case, so the room isn't dimmed there either. Near plane, pan and
  portrait framing ruled out. Fix: the camera steps back while a book is out, the dimming stands
  between book and case. Cause 2 (real on main): `.search-pop` is anchored `right: 0`, and from 721
  to about 1400 px the toolbar wraps to the left, so the pop-up starts at x −322; anchor it left.
  Reproduced both on main with before-screens. Handed to the ux-designer for a light pass
  (screenshots only).
- 2026-11-22 ux-designer: designed. Open book at any zoom looks as at zoom 1 (size, place, full
  light, room as dark); the step back eases together with the book's flight and the dimming,
  and with reduced motion the camera goes there in one frame; the search pop-up hangs under the
  button and opens rightwards. Screenshot list and two Done-when checks added (reduced motion,
  tallest cover at zoom 1). Two questions for Hanna in the morning under *Design*. Handed to the
  developer.
- 2026-11-22 developer: built it (see *Build notes*): `inspectPlacement` with its test, the camera
  stepping back while a book is out, the dimming between the book and the case, reduced motion,
  the search pop-up anchored left. Night mode, nothing asked; one deviation from section 2: the
  turning reach is half the book's 3D diagonal, not half the cover's width (reason in *Build
  notes*). **Fails before the fix:** `inspectPlacement.test.ts` first ran against a copy of today's
  sums (camera at `cameraZ(toCase)`, book at camera − `dist`, dimming at camera − 1.25): `Tests 11
  failed | 5 passed (16)`, red for 390 × 844 at zoom 1 and 1.5 (sheet 0.45 and 0.88: tallest book
  behind the dimming), zoom 2 and 3 at every sheet height (e.g. zoom 3, sheet 0.45: `camera 0.936,
  book -0.226, dimming -0.314`) and 1280 × 800 zoom 3 (`dimming -0.187: expected … to be greater
  than or equal to 0.23`). With the fix: `Tests 16 passed (16)`. `pnpm test`: `Tests 885 passed |
  9 skipped (894)`; `pnpm exec tsc --noEmit`: no output; `pnpm run build`: `✓ built`; `pnpm exec
  harness check`: tasks, decisions, engineers, generated files ✓. `src/routeTree.gen.ts`
  unchanged. **Click-through** on `vite dev --port 3138` (no backend, 70 books seeded in
  `hannas-reading-list:v1`, the tallest, Title 28 at 0.325 m, fifth in the top row), Chrome via
  playwright-core: phone 390 × 844 with `hasTouch`/`isMobile` and CDP touch events, lavender and
  midnight: zoom 1 opens Title 28 whole with a bright cover (`open-zoom1-390-*`, compare
  `before-open-zoom1-390-lavender.jpg`), closed by a tap on the dimmed room; zoom 2 by a two-finger
  pinch, book opens whole in front; zoom 3 with + (middle) and panned to the left end with ‹:
  book whole between the header and the sheet, room dimmed, cover not dimmed
  (`open-zoom3-390-*`, `open-zoom3-panned-390-*`); turning it by dragging never cuts it; dragging
  the sheet up (top 238 px) and down (728 px) keeps it whole and in front; closing (× in the middle,
  a tap on the room at the end) brings back zoom 3 and the same pan (‹ off › on at the left end,
  `open-closed-zoom3-390-lavender`); 0.3 s after the tap the book is whole, outside the case
  (`open-flight-390-lavender`). Computer 1280 × 800, mouse, both wallpapers: zoom 1 and zoom 3
  panned to the right end, book centred and **room dimmed at 3×** (`open-zoom3-1280-*`), closed by a
  click on the room, back at zoom 3 with › off. Reduced motion emulated, zoom 3: 0.1 s after the tap
  the shelf is already at its stepped-back size (`open-zoom3-390-reduced-lavender`), and 0.1 s after
  ×, back at zoom 3; with it off, 0.1 s after the tap the camera is still near the shelf (eases).
  Search, "title" typed: pop-up left–right 24–408 at 1024 and 1280 (both wallpapers), 593–977 at
  1440, 1073–1457 at 1920, 16–374 at 390 (as on main); results list on screen; a click on a result
  opened that book at every width (`search-*`). No console errors, no horizontal scroll anywhere.
  A pixel fingerprint of the view before opening and after closing isn't comparable (the fairy lights and decorations move),
  so "same zoom and pan" was checked on the ‹ › and zoom buttons' state and the screenshots. Seen in
  the reduced-motion run: putting the book back, the camera jumps forward first and the book flies
  home from close by, large for a moment; that is the book's flight, kept as designed (Hanna's
  question 2). Draft PR #238. Handed to the ux-designer for the design check.
- 2026-11-22 ux-designer: reviewed: matches, no must-fix. All 17 after-screenshots match the
  design state by state (book at zoom 3 same size and place as at zoom 1, room dimmed on both
  wallpapers and now at 3× on the computer, tallest cover bright, closing back to the same zoom and
  pan, reduced motion, search pop-up on screen at 1024–1920). Notes 1 and 3 accepted; notes 2
  (sheet at 0.88: book under the header, 4 m step back, same on main) and 4 (reduced motion: book
  large for a moment when put back) are follow-ups F1 and F2 under *Review after building*. Handed
  to the tester.
- 2026-11-22 tester: passed. CI green with no retries; the new and affected tests 5× green; the
  test fails on today's sums (checked); 12 tests added (more screens, short and long shelves, the
  dimming nearer than the fog and covering the view, a turned book never reaching the dimming).
  Tried to break it on the phone and the computer (each zoom and pan, gestures while open, search
  while zoomed, rotating, resizing, reduced motion, 0.2 s after ×): nothing broke. Two things found
  that aren't this task: the sideways phone layout puts an open book under the toolbar (also at
  zoom 1), and the parallax follows the last touch on the phone.
- Remaining: Hanna opens a book while zoomed in on her phone on the live site and says it shows; and
  her answers to the two morning questions under *Design*.
