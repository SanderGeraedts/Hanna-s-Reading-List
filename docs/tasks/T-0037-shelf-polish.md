---
id: T-0037
title: "Polish the open book on the shelf: room under the header, calm reduced motion, sideways phones, parallax after a touch, ridges that respect the medal"
description: "Five follow-ups from T-0026 and T-0034: on the phone the details sheet stops where an open book still has room (no more ~4 m step back) and a book's paper clip stays below the header; with reduced motion the camera jumps back only once a put-back book is home; on a phone held sideways the open book stands in the free space left of the panel and under the toolbar; on touch screens the parallax eases back to centre after a touch; a read-before did-not-finish book loses its bottom ridges like every book with a medal."
status: Open
size: small
depends_on: [T-0026, T-0034]
decisions: [D-0014, D-0020, D-0022, D-0032, D-0035]
raised_on: 2026-11-23
done_on: ""
result: []
---

# Goal

Five small things the team found while building T-0026 (open book while zoomed in) and T-0034
(hardcovers on the phone). Each is a fix within the shelf and its book panel: no new screen, no
new data, nothing about saving. Requester: Hanna. Night mode: she wasn't asked anything tonight;
F2 follows the choice she already made (the smallest change). The team's picks are under
*Choices made by the team*.

## F1. On the phone, the details sheet leaves room for the open book

**Now:** with a book open on the phone she can drag the details sheet up to 88 % of the screen
(`SHEET_MAX` in `src/components/BookPanel.tsx`). Between the header (about 17–19 % of a
390 × 844 screen) and the sheet there is then nothing left, but `portraitInspect`
(`src/components/inspectPlacement.ts`) keeps the book at least `0.15 × 0.85` of the view tall,
so the book reaches under the header, and because such a small book needs a long distance
(`inspectDistance`), the camera steps back to about 4.5 m from the case (zoom 1 is at 2.5 m).
See T-0026, UX review note 2 and *Build notes* "Found, not fixed".

**After:** while a book is open on the phone, the sheet stops at the height where the space
between the header and the sheet is still **at least 25 % of the screen** (`MIN_BOOK_SPACE`,
name the developer's). The cap is `min(SHEET_MAX, 1 − headerShare − 0.25)`, with the header's
**measured** share (`topInset / height`, as `BookshelfScene` already works it out; until it is
known, `HEADER_SHARE`). The sheet's default (0.45) stays below the cap on every phone screen we
check, so the first look doesn't change.

- Dragging the sheet up stops at the cap, smoothly (the same clamp as today, a lower top).
- A remembered sheet height above the cap opens at the cap. What is remembered becomes what she
  last saw (the clamped height), so nothing jumps between books.
- Turning the phone or a header that changes height (e.g. a wrapped toolbar) re-applies the cap.
- Measured by the architect with the real sums (60 books, tallest book 0.325 m, 390 × 844): with
  25 % left the book's `fill` is at least 0.2125 and the camera is at most **2.9 m** from the case
  at zoom 1 (a step back of at most 0.4 m; at the default sheet none), against 4.5 m today. At
  zoom 3 it stays the step back T-0026 designed (the book must stand in front of the case).

**The paper clip** of a book she is reading or has paused (`Bookmark` in `BookMesh.tsx`, `CLIP.out`
= 0.042 above the pages) reaches under the header buttons, at every zoom
(`T-0026-screens/open-zoom3-panned-390-*`). The framing must count the clip: for a book with a
clip, the height that has to fit between the header and the sheet is the book's height plus
`CLIP.out` (so the book's top plus the clip ends below the header), and the cover stays centred
in the space as now. Books without a clip are framed exactly as today.

## F2. Reduced motion: the camera jumps back only once the book is home

**Now:** with `prefers-reduced-motion: reduce`, in the frame she puts a book back the camera's
z jumps straight to her zoom (`BookshelfScene.tsx`, `useCameraRig`: `if (reducedMotion.current &&
(open || wasOpen.current !== open)) c.position.z = base.z`), while the book still flies home
from the spot where it was open. At zoom 3 the book is then briefly about 1.8 × its open size
(T-0026 UX review note 4).

**After (Hanna's choice, the smallest change):** with reduced motion, after the book is put back
the camera **stays at its stepped-back distance** while the book flies home, and jumps to her
zoom **in one frame once the book is home** (the book's `out` state clears when its `progress`
is below 0.001, `BookMesh.tsx`; how the rig learns that is the developer's: a ref, a callback, or
the same `progress` threshold). The book's flight itself is unchanged. Opening is unchanged
(camera there in the first frame). Without reduced motion nothing changes.

- If she opens another book while the first is still flying home, the camera stays back and
  follows the new book's placement as today (no jump forward in between).
- Zooming or panning meanwhile works as today.

## F3. Phone held sideways: the open book stands in the free space

**Now:** when the screen is not portrait (`aspect ≥ 0.8`), the open book uses `DEFAULT_INSPECT`
(`fill` 0.6, centred). On a phone held sideways (844 × 390, 800 × 360) the toolbar takes a big
part of the top and the details panel (`.panel`: 340 px wide, 20 px from the right) a big part of
the right, so the book stands half under both, **also at zoom 1** (T-0026 tester, *Not checked
here / found*).

**After:** in landscape the open book is framed in the **free rectangle**: below the header's
measured bottom and left of the panel's left edge (each with a small margin, e.g. 12 px), like
`portraitInspect` does for the sheet. That needs a sideways shift (`xShift`) next to `fill` and
`yShift` in the inspect frame, used by `BookMesh` (the flight target) and by `inspectPlacement`'s
callers in the same way as `yShift`. The framing takes the book's widest cover (aspect 0.82) and,
for a book with a clip, the clip (F1).

- **Where the default already fits, nothing changes:** when the centred `fill` 0.6 book (widest
  cover, plus clip) is already inside the free rectangle, the frame stays exactly
  `{ fill: 0.6, yShift: 0, xShift: 0 }`. So the computer at 1280 × 800 and larger looks as
  today. Smaller computer windows where the book did overlap (e.g. 1024 × 768 with a two-row
  toolbar) get the fix too; that is intended.
- The camera step back from T-0026 (`inspectPlacement`) keeps working with the new `fill`; the
  book still stands in front of the case and the dimming at every zoom.
- The panel's width can be read from the CSS numbers (340 px, 1.25 rem) as a constant shared
  with the test, or measured; the developer's choice. No new CSS for the panel.

## F4. Touch screens: the parallax eases back to centre after a touch

**Now:** the camera's parallax follows `state.pointer` (`useCameraRig`: `parallax.x =
state.pointer.x * 0.06`, `y * 0.04`). On a touch screen the pointer stays where the last finger
lifted, so after a swipe the view sits a few px sideways until the next touch (on main too).

**After:** the parallax follows only a **mouse** pointer (or a pen hovering). While a finger is
down it may follow the finger as today; once the last touch ends (`pointerup` / `pointercancel`
of a touch), the parallax target goes back to 0, and the camera **eases** back with the existing
damping in `aimCamera` (no jump). With a mouse nothing changes. While a book is open the parallax
stays off, as now.

## F5. Ridges use the same "has a medal" rule as the medal

**Now:** the gilded ridges leave out the bottom pair for `book.status === 'read'`
(`BookMesh.tsx`, `isRead` passed to `ridgeLayout`), while the medal and the painted bands use
`hasMedal(book)` (`src/lib/library.ts`: read, or did-not-finish and read before). So a
read-before *did not finish* book has a medal and still gets its bottom ridges across it (e.g.
"The Island of Salt 9" in T-0034's screens), on the phone and the computer.

**After:** the ridges use `hasMedal(book)`. A read-before DNF book gets 2 ridges (top only), a
never-read DNF book 4, as every other book. Nothing else about the ridges changes.

# Done when

**Unit tests** (Vitest, next to the code, with the real `fitShelf` / `computeLayout` /
`frameCase` and a real `THREE.PerspectiveCamera` (FOV 35) like `inspectPlacement.test.ts`):

- **F1, the cap:** for header shares 0.10, 0.17, 0.19 and 0.22 and phone screens 390 × 844 and
  360 × 640: the sheet's cap is `min(0.88, 1 − header − 0.25)`; at the cap the space between
  header and sheet is ≥ 0.25 and the default 0.45 is ≤ the cap; at the cap, for the shortest and
  the tallest book (60-book shelf) and the widest cover, the **whole book, plus `CLIP.out` for a
  book with a clip**, projects between the header and the sheet and inside NDC x ±1; at zoom 1 the
  settled camera z is ≤ zoom-1 z + 0.45 (today: + 2.0); the T-0026 checks (book and dimming in
  front of the case, book size on screen = `2 × fill`) still hold at zoom 1, 1.5, 2 and 3.
- **F1, the sheet:** a test of the clamp (pure function or `BookPanel` with jsdom): a drag above
  the cap stops at the cap; a saved share of 0.88 opens at the cap; a cap that changes (header
  height or turning the phone) re-applies.
- **F1 fails before the fix:** with today's `SHEET_MAX` 0.88 and no clip in the sum, the
  "between the header and the sheet" and the "≤ + 0.45" checks are red. The developer shows that
  in the *Log* (run against a copy of the old sums, as T-0026 did).
- **F2:** a pure helper (e.g. `reducedMotionCameraZ({ reduced, open, bookHome, … })` → `snap to
  stepped back | snap to her zoom | ease`, name the developer's) tested for: opening (snap back),
  open (stay back), put back and still flying (stay back), home (snap to zoom), another book
  opened while flying (stay back), reduced motion off (ease, as today).
- **F3:** the landscape framing function, for 844 × 390, 800 × 360, 667 × 375 and 1024 × 768
  (header heights as measured on the dev server, written in the test with where they came from)
  and the panel at `width − 20 − min(340, width − 40)`: the whole book (shortest and tallest,
  widest cover, plus clip) projects below the header, left of the panel and inside the screen, at
  zoom 1 and 3; for 1280 × 800, 1440 × 900 and 1920 × 1080 the frame is exactly
  `{ fill: 0.6, yShift: 0, xShift: 0 }`; the T-0026 checks hold with the new `fill`. Fails before
  the fix at 844 × 390 (book under the panel), shown in the *Log*.
- **F4:** a pure helper for the parallax target (pointer type, a touch active or not) tested:
  mouse → follows the pointer; touch down → may follow; touch ended → 0; and the eased camera
  reaches the centre (within 0.001) after ~2 s of frames, never in one frame.
- **F5:** in `BookMesh.test.ts`, the ridges for read (2), DNF read before (`readCount: 1`, 2),
  DNF never read (4), reading (4) and want (4) books, through the same function `BookMesh` uses
  (so the test fails if the component goes back to `status === 'read'`).
- **The existing tests pass**, in particular `inspectPlacement.test.ts`, `cameraAim.test.ts`,
  `shelfPanFraming.test.ts`, `BookMesh.test.ts`, `SafeBookshelf.test.tsx`, `contextLoss.test.ts`.
- `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm run build` and `pnpm exec harness check` pass;
  `src/routeTree.gen.ts` is not committed.

**Clicked through** on a local dev server with no backend (`pnpm run dev` or `vite dev` on a free
port; never a production `POCKETBASE_URL`), 60+ books seeded in `hannas-reading-list:v1` with at
least one book being read (clip) and one read-before DNF book, lavender and midnight where it
says `*`. Screenshots in `docs/tasks/T-0037-screens/`:

1. `sheet-top-390-*`: phone 390 × 844, a tall book with a clip open at zoom 1, sheet dragged as
   high as it goes: the sheet stops with the book whole between the header and the sheet, the clip
   below the header buttons; the shelf behind about as far away as with the sheet at its default.
2. `sheet-top-zoom3-panned-390-lavender`: the same at zoom 3, panned to an end (compare
   `T-0026-screens/open-zoom3-panned-390-lavender.jpg`: the clip no longer under the buttons).
3. `reduced-close-390-lavender-1` / `-2` / `-3`: reduced motion emulated
   (`reducedMotion: 'reduce'`), zoom 3, about 0.05 s, 0.3 s and 1.5 s after ×: in 1 and 2 the shelf
   is still at its stepped-back size and the book is **never larger** than when it was open; in 3
   the view is back at zoom 3 and the same pan.
4. `sideways-844-*` and `sideways-800x360-lavender`: phone sideways, a book with a clip open, at
   zoom 1 and zoom 3 (`sideways-844-zoom3-lavender`): the whole book left of the panel and under
   the toolbar, room dimmed.
5. `open-1280-lavender`: computer 1280 × 800, book open, zoom 1: the same as on main (a pixel
   comparison with main shows only the moving decorations).
6. `parallax-390-lavender-before` / `-after`: phone, zoom 3, before a swipe and 2 s after a
   swipe that ended where it started: the case at the same place (the ‹ › and the books line up;
   on main the view sits a few px sideways).
7. `ridges-dnf-*`: a read-before DNF book on the shelf at zoom about 2.7 on the phone and on the
   computer: the medal with no ridges across it.

Also checked and written in the *Log*: rotating the phone with a book open (390 × 844 → 844 × 390
→ back) keeps it whole and in the free space at each step; dragging the sheet stays smooth; no
console errors; no horizontal scroll.

# Notes

- **Read first:** T-0026 (the whole inspect placement: `inspectPlacement`, `portraitInspect`, the
  camera step back, reduced motion, its UX review notes 2 and 4 and the tester's *Not checked
  here / found*), T-0034's UX review (*Seen, not to be fixed here*) and *Build notes* (the ridges'
  instanced mesh), T-0025 (pan and zoom, D-0032).
- **Files:** `src/components/inspectPlacement.ts` (+ test), `src/components/BookPanel.tsx` (the
  sheet clamp; it needs the header's share, e.g. a prop from `src/routes/index.tsx`, which has
  `headerPx`), `src/components/BookshelfScene.tsx` (`useCameraRig`, `useReducedMotion`, the
  inspect frame), `src/components/BookMesh.tsx` (flight target with `xShift`, `Bookmark`'s
  `CLIP`, ridges), `src/components/cameraAim.ts` (parallax easing). No CSS change is expected
  except perhaps the sheet's `max-height: 88vh` fallback, which may stay as the outer limit.
- **Group 1** (guardrails): app code only. Nothing in `src/lib/shelfMerge.ts`, `src/server/`,
  saving or syncing, `deploy/`, `.github/`. The remembered sheet height in localStorage is a
  per-device preference, not her books.
- **Size: small.** All five are changes within the existing shelf and book panel, no new
  screen, route, data or service; the UX designer writes no design before the build and reviews
  the screenshots after. *Done when* says what she sees.
- No new decision: these are reversible framing and motion details under D-0032 and D-0035.
  No new words, colours or hint texts (D-0014, D-0020); both wallpapers (D-0022).

## Choices made by the team

Hanna wasn't asked anything (night mode). The architect took these:

1. **F1: cap the sheet, don't shrink the book.** Of the two options in T-0026's UX review
   (a lower sheet, or a smaller book) the sheet cap, as the request says: the book stays
   recognisable and the camera stays close. The sheet scrolls inside, so every detail is still
   reachable.
2. **F1: at least 25 % of the screen for the book** (not 15 %, `portraitInspect`'s floor). With
   15 % the book is as small as today and the camera still steps back ~2 m; 25 % keeps it within
   0.4 m of zoom 1 and leaves the sheet up to about 55–65 % of a phone screen (from 88 %).
3. **F1: the clip counts in the book's height** only for books that have one, so other books
   don't change size.
4. **F2: Hanna's smaller option** (the camera waits for the book), not "the book appears without
   flying".
5. **F3: only where the book doesn't fit,** so the computer at common sizes looks exactly as
   today; one rule for every landscape screen rather than a phone-only special case.
6. **F4: ease back, don't switch off.** The parallax keeps following the mouse; on touch it
   returns to centre after the finger lifts, with the existing gentle easing.
7. **F5: `hasMedal` everywhere,** the rule the medal and the painted bands already use.

## Questions to re-ask Hanna in the morning

1. "On your phone the details sheet now stops a bit lower (about halfway up the screen instead of
   almost to the top), so the book you opened always stays in view above it. Does that feel
   right, or would you rather drag it higher and have a smaller book?"
2. "Holding your phone sideways, an open book now stands to the left of the details, under the
   buttons. Is that the place you'd expect?"

# Design

No design before the build (small task). The UX designer reviews the screenshots after.

# Test

# Log

- 2026-11-23 architect: wrote the task from T-0026's follow-ups F1 (sheet at 0.88, ~4 m step
  back, clip under the header) and F2 (reduced motion, book ~1.8× when put back; Hanna chose the
  smallest change), T-0026's tester findings (sideways phone; parallax after a touch) and T-0034's
  UX follow-up (ridges across a DNF medal). Measured the sums for F1 with the real layout (390 ×
  844, header 0.17: sheet 0.88 → camera 4.5 m from the case at zoom 1 against 2.5 m; with ≥ 25 %
  left for the book ≤ 2.9 m). Night mode: choices under *Choices made by the team*, two questions
  for the morning. No new decision. Size: **small**. Handed to the **developer**; the UX designer
  reviews after the build.
