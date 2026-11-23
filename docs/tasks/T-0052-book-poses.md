---
id: T-0052
title: "Let her pose each book on the shelf: standing, face-out or lying flat, from the book panel's Looks tab"
description: "A new optional pose field on Book (left out for a standing book, synced with the shelf like tropes) set per book as Standing · Face-out · Lying flat in the Looks tab; a face-out book turns its cover to her and takes its cover's width, flat neighbours stack spine-out on one shelf without growing through the shelf above, and a pose that cannot fit on an empty shelf of this bookcase is drawn standing while the field is kept."
status: Doing
size: full
depends_on: []
decisions: [D-0002, D-0014, D-0020, D-0035, D-0041, D-0044, G-0019, G-0031]
raised_on: 2026-11-23
done_on: ""
result: []
---

# Goal

Requester: Hanna, in her feature chat of 22 November 2026, item 2 of `docs/backlog.md`. Built on
one branch with T-0051 and T-0053.

Every book on the shelf stands with its spine out. She wants to pose a book she loves: turned to
show its cover, or lying flat with a few others in a little stack, the way a real shelf is
arranged.

**What this task delivers** (D-0044):

1. **One new optional field on `Book`:** `pose?: 'faceout' | 'flat'`. **Standing is the absence
   of the field** — it is never written as `'standing'`, and setting a book back to Standing
   deletes it, so a book she never posed is byte-for-byte what it was. A saved `'standing'`, an
   unknown word, `null` or a number all read as standing. It rides along with the shelf like
   tropes (D-0042 §2): no change to `shelfMerge.ts`, `server/shelf.ts` or `deploy/nas/`.
2. **A three-way picker in the book panel's Looks tab** (D-0041 §1): *Standing · Face-out ·
   Lying flat*, above *Front/Spine/Back*. The shelf behind the panel follows at once, like the
   spine colour.
3. **The three poses on the shelf** (D-0044 §4), in `bookDims`' units:

   | Pose | Faces her | Along the shelf | Upright | Into the case |
   |---|---|---|---|---|
   | Standing | the spine | `t` | `h` | `w` |
   | Face-out | the front cover | `w` | `h` | `t` |
   | Lying flat | the spine | `h` | `t` | `w` |

4. **Flat neighbours stack** (D-0044 §5): flat books next to each other in her arrangement that
   land on the same shelf share one place along the shelf and lie on one another, bottom-up in
   her order, each shifted a couple of millimetres alternately so the stack looks hand-made. A
   stack never grows through the shelf above: the next flat book then starts a new stack beside
   it, which may wrap like any book.
5. **A face-out book shows its cover** on the shelf (or the painted fallback cover for a book
   without one). It is the only book that loads a cover picture while on the shelf.
6. **A pose that cannot fit is drawn standing** (D-0044 §7), with the field kept, so it comes
   back on a wider case; nothing is said about it.
7. **Everything else follows the pose:** spine picture, gold ridges, medal, page edges, the
   paperclip of a book being read, hover, drag, the search glow and dimming, taking a book out
   and putting it back (taken out it looks as it does today, and returns to its pose when it
   lands).
8. **The app never sets, changes or clears a pose.**

# Done when

**Tests (Vitest, next to the code):**

- `src/lib/library.test.ts` or a new `src/lib/pose.test.ts`: `poseOf(book)` gives `'standing'`
  for no field, `'standing'`, an unknown word, `null`, `0` and `[]`, and the pose for
  `'faceout'` and `'flat'`; `posePatch('standing')` is `{ pose: undefined }` (the field is
  deleted, never written as `'standing'`) and `posePatch('flat')` is `{ pose: 'flat' }`; a book
  with no pose saved and loaded again is byte-for-byte the same JSON.
- `src/lib/shelfLayout.test.ts`:
  - `footprint(dims, pose)` gives `t`/`h`/`w` along the shelf and `h`/`h`/`t` upright per the
    table, and the depth per the table;
  - a face-out book takes `w` along the shelf, so a shelf holds fewer books than with the same
    books standing, and the books after it move along exactly by `w − t`;
  - **flat stacks:** three flat neighbours on one shelf get the same `x` within the few
    millimetres of the hand-made shift, `y` rising by each book's `t`, and the shelf's packing
    continues after the stack by one stack's width; a fourth book that would reach through the
    shelf above starts a new stack with its own `x`; a flat stack at the very end of a shelf
    wraps to the next shelf as a whole or starts there, never half on each;
  - flat books that are **not** neighbours in the arrangement do not stack;
  - a face-out or flat book whose footprint is wider than an empty shelf of this case (inner
    width less that shelf's decoration room) is laid out **standing**, and the same book on a
    wider case is laid out in its pose; the saved field is untouched either way;
  - every slot stays inside the case: no slot's footprint reaches past the inner width or
    through the shelf above, for 150 and 400 books with a third of them posed at random from a
    fixed seed;
  - a shelf of only flat books, and one of only face-out books, both lay out without throwing
    and without overlapping.
- `src/components/BookMesh.test.ts`: for each pose, the drawn book's **world-space bounding
  box** matches the footprint table within 1e-6 and the face that points at the camera is the
  spine, the front cover and the spine respectively (test the box and the outward face, not the
  Euler angles); the shelf hardcover stays **one** geometry with **two** groups for standing and
  flat books (D-0035); a face-out book's cover is requested while it is on the shelf and a
  standing or flat book's is not.
- `src/components/BookPanel.tabs.test.tsx` (or a new `BookPanel.pose.test.tsx`): the Looks tab
  shows a *Pose* group with *Standing*, *Face-out* and *Lying flat*, the current one pressed
  (*Standing* for a book with no field); a click calls `onUpdate` with the patch of §1, and
  picking *Standing* on a posed book calls it with the field cleared; the picker is not on the
  other three tabs; the panel still opens on Reading (D-0041 §2).
- `pnpm test`, `tsc --noEmit`, `pnpm run build` and `pnpm exec harness check` pass; CI green
  with no retries.

**Measurements** (developer runs them, tester re-runs them independently), with
`pnpm run measure:shelf` as T-0034 requires (built app, no `POCKETBASE_URL`, no `.netlify`
link, 390 × 844 DPR 3 and 1280 × 800, 150 and 400 demo books, 3 s at rest). Three runs at each
size: **no poses** (today), **10 % face-out**, **10 % flat**.

| At 390 × 844, shelf at rest | Budget |
|---|---|
| Draw calls per frame, no poses | the same as T-0034's 95, within 5 % |
| Draw calls per frame, 10 % flat | no more than no poses + 5 % |
| Draw calls per frame, 10 % face-out | at most +1 draw per face-out book in view |
| Picture bytes, no poses and 10 % flat | T-0034's 23.20 MB within 5 % (no covers loaded) |
| Picture bytes, 10 % face-out | grows only by the covers of the face-out books in view, and is reported per book |
| Geometry bytes, 150 books, any run | ≤ 2 MB (D-0035's yardstick) |
| Draw calls behind the Dashboard | 0 in every run |

If the face-out cost per book is worse than one draw and one cover, the developer stops, writes
the numbers in the *Log* and hands back to the architect.

**What she sees** (screenshots in `docs/tasks/T-0052-screens/`, local dev server, no backend,
G-0019): per the UX designer's list under *Design*.

**From the design** (added by the UX designer; details under *Design*):

- The picker is the **first** group on the Looks tab, above *Front/Spine/Back*: a `room-row`
  with the heading **How it stands** and a `.segmented` pill of **Standing · Face-out · Lying
  flat**, the current one `aria-pressed`, Standing for a book with no field. No icons, no hint
  text, no disabled button.
- Choosing one turns the book behind the panel at once, with no animation; the panel stays open
  on Looks and focus stays on the button.
- A face-out book shows its cover picture, or the painted fallback cover for a book without one,
  at the right aspect, standing at the same floor height and the same depth as its neighbours.
- A flat book lies spine towards her with its title the right way up and readable; books in one
  stack all lie front-cover-upwards.
- Ridges, medal, paperclip, page edges and the search glow follow the pose and do not flicker
  while the shelf scrolls.
- Setting every posed book back to Standing gives a shelf identical to the one before any pose
  was set: same places, same gaps, same nooks, same decorations.
- Keyboard: three tab stops with the gold focus ring; a screen reader reads "How it stands,
  group" then "Face-out, button, pressed".

**Hanna** (keeps the task *Doing* with a `Remaining:` line until she confirms): on her own phone
a face-out book shows its cover, a few flat books make a stack she likes, and the shelf still
scrolls and opens books smoothly.

# Notes

- Read first: D-0044 (this task's decision), D-0041 (the Looks tab), D-0035 and T-0034's *Log*
  (the merged shelf hardcover, the ridge instancing, the measured budget), D-0042 §1–2 (how an
  optional field rides along with the shelf), D-0014, D-0020.
- Code: `src/lib/shelfLayout.ts` (`bookDims`, `computeLayout`, `Slot`, `rowFloorY`, `fitShelf`,
  `shelfFitFor`, `DECOR_*`), `src/components/BookMesh.tsx` (`SPINE_OUT`, the resting rotation,
  `bookLook`, `shelfHardcover`, `shelfBlock`, `hardcoverSizes`, `ridgeLayout`, `ShelfRidges`,
  `Medal`, `Bookmark`, `useCoverTexture`, `facesToPaint`), `src/components/BookshelfScene.tsx`
  (the `BookMesh` loop, `ridgeSlots`, `layout`), `src/components/BookPanel.tsx` (the Looks tab),
  `src/lib/library.ts` (`Book`).
- `Slot` grows: a book now needs its pose's place and orientation, not just `x`, `y`, `z`. Keep
  the shape one object per book so the scene's loop stays as simple as it is.
- The ridges' instanced mesh writes each book's matrices from that book's own frame, so it
  follows a pose by itself — but check it: a flat book's ridges run along a different axis.
- **No code-owned path is touched**: nothing in `.github/`, `netlify*`, `deploy/nas/`,
  `src/lib/shelfMerge.ts`, `src/server/shelf.ts` or `.claude/`. The new field is optional and
  rides along with the shelf: group 1 of the guardrails, no server change.
- Built together with T-0051 and T-0053 on branch `shelf-and-room`, one pull request.

## Choices made by the team

1. **A flat book lies spine-out**, so its title can be read and its spine's length runs along
   the shelf.
2. **The field is left out for a standing book**, as D-0042 does for empty tropes, so the shelf
   she has now is unchanged byte-for-byte.
3. **A pose that cannot fit is drawn standing** rather than refused, shrunk or overflowing: the
   case is reshaped by the screen, so the same book can fit on the computer and not on the
   phone, and she should not lose her choice by picking up her phone.
4. **Only face-out books load a cover on the shelf**, and that cost is measured per book.
5. **Size: full.** A new synced field, a new control and a change to how the shelf is packed.

## Questions to put to Hanna

1. "A book lying flat lies with its **spine towards you**, like a pile on a shelf, so you can
   still read the title. Shall it lie cover-up instead?"
2. "A face-out book takes about as much room as its cover is wide, so a shelf holds fewer books.
   On your phone one face-out book takes roughly a quarter of a shelf. Is that fine?"
3. "If a pose doesn't fit — a flat book on your phone's narrow shelf, say — the book is shown
   standing and your choice is kept for when the shelf is wider. Would you rather it told you?"

# Design

(UX designer, before the build. Tokens from D-0020, no hint texts (D-0014).)

## 1. The pose picker in the Looks tab

It is the **first** group on Looks, above *Front/Spine/Back*, because it is about how the book
sits on the shelf and the side picker is about what she is looking at right now:

```
How it stands
( Standing )  ( Face-out )  ( Lying flat )
```

- Markup: `<div className="room-row" role="group" aria-label="How it stands">`, a
  `muted small-text` heading **How it stands**, then
  `<div className="segmented pose-pick">` with three `<button>`s, the current one `.active`
  and `aria-pressed="true"`.
- **The same `.segmented` pill as the bookcase switch** (T-0051) and the pile's switch, so the
  panel gains no new component. Not the plain `.side-pick` buttons next to it: `.side-pick` has
  no pressed state, and this one must show which pose the book has.
- **Words:** heading **How it stands**; buttons **Standing**, **Face-out**, **Lying flat** — her
  three words, with her capitals. No icons: at `--fs-small` a tiny book pictogram would read as
  noise, and the three words are short enough to fit at 360 (about 250 px inside the pill).
- **State:** a book with no pose shows **Standing** pressed. Tapping the pressed one does
  nothing (it is not a toggle).
- **Keyboard:** three tab stops, gold `:focus-visible` ring, Enter or Space chooses, focus stays
  on the button pressed. A screen reader reads "How it stands, group", then "Face-out, button,
  pressed".
- **What it does:** the book behind the panel changes pose **at once**, with no animation, like
  the spine colour. On a phone the panel is a bottom sheet and the book is above it, so she sees
  it turn. The books around it move along at the same moment. The panel stays open, the tab
  stays Looks, nothing scrolls.
- **While the book is taken out** it keeps looking as it does today (cover to her, turnable),
  whatever is pressed: the pose is how it will sit when it goes back. It takes its new pose the
  moment it lands.
- No hint text, no "doesn't fit on this screen" note, no disabled buttons — every pose can
  always be chosen, even when this bookcase cannot show it (D-0044 §7).

## 2. How the three poses look on a shelf

**Standing** is exactly today's book: spine to her, boards a little past the paper, gold ridges,
medal at the foot, paperclip while she is reading it.

**Face-out** turns the whole book a quarter turn so the **front cover faces her**:
- the cover picture fills the board, as it does when the book is taken out; a book without a
  cover gets the same painted fallback (title and author on its own colour) a taken-out book
  gets, not a blank board;
- it stands on the same shelf floor, at the same height as its standing neighbours, at the same
  depth from the front edge, so the shelf's front line stays straight;
- its **gold ridges are on the spine, which now points sideways** — they show as a thin gold
  edge from the front, and fully when the camera is panned. A read book keeps its medal at the
  foot of that spine, so from the front only its edge shows. That is right: a face-out book
  shows its cover, not its medals.
- the paperclip of a book being read stays at the top, clipped over the cover's top edge.

**Lying flat** lays the book down with its **spine towards her**:
- the spine's picture, bands and lettering read left-to-right along the shelf, which is how a
  pile on a real shelf reads; the title is upright because the spine art is already painted
  along the spine;
- the pages show as a cream strip above or below the cloth, depending on which way up it lies;
  books in one stack all lie the same way up (front cover upwards), so the stack reads as one
  pile and not as a muddle;
- the ridges run along the spine as they always do, so from the front they are the gold lines
  along the top of each book in the pile;
- a medal sits at the end of the spine that is now the left-hand end.

## 3. Flat stacks

- A stack is built from the bottom up in her arrangement's order: the first flat book of the run
  is the bottom one.
- Each book above the first is shifted **±2 mm along the shelf, alternating**, so the pile looks
  stacked by hand and not machined. No rotation jitter: a turned book reads as a mistake, and a
  2 mm offset is enough.
- A stack keeps a **4 mm gap under the shelf above** (the existing `SHELF.gap`): when the next
  flat book would eat into it, that book starts a new stack beside this one. Two stacks beside
  each other are fine and look deliberate.
- A stack takes **one book's room along the shelf** — its widest book's `h` — so the standing
  books after it continue from there.
- At the **end of a shelf** a stack is never split: if the run cannot start on this shelf it
  starts on the next, whole, like any book that does not fit.

## 4. When a pose cannot fit

A face-out or flat book whose footprint is wider than an empty shelf of this bookcase is drawn
**standing**, silently (D-0044 §7). On her phone a flat book is about 0.3 m on a 0.5 – 0.8 m
shelf, so flat and face-out do fit there; this is the narrow-case and many-decorations corner,
and the right behaviour is that the shelf stays tidy and her choice is kept. The picker still
shows the pose she chose, because that is what the book is — not what this screen can draw.

## 5. Must not happen (each sends the build back)

- A book sunk into, or floating above, the shelf board in any pose; a stack reaching through the
  shelf above; a face-out or flat book sticking out past the case's side or front.
- A flat book whose title reads upside down or back to front.
- A face-out book with a blank board where a cover or the painted fallback belongs, or a cover
  stretched to the wrong aspect.
- Ridges, medal, paperclip or search glow left behind in the standing orientation while the book
  is posed, or flickering as the shelf scrolls.
- Books moving, gaps changing or a decoration losing its shelf when a pose is set back to
  Standing — the shelf must return exactly to what it was.
- A visible jump when a posed book is taken out or lands back.

## 6. Screenshots (into `docs/tasks/T-0052-screens/`)

| # | Width | Wallpaper | What |
|---|---|---|---|
| 1 | 390, 1280 | lavender | A shelf with a run of standing books, two face-out books and a stack of three flat ones |
| 2 | 1280 | lavender | The same shelf zoomed in: cover, ridges, medal and paper edge of each pose close up |
| 3 | 390 | lavender | The Looks tab with the picker, each of the three pressed in turn, book visible above the sheet |
| 4 | 390, 1280 | midnight | A face-out book without a cover (painted fallback) next to one with a cover |
| 5 | 1280 | lavender | Five flat books in a row: one full stack plus the second stack beside it |
| 6 | 390 | lavender | The same books all back to Standing: identical to the shelf before any pose was set |
| 7 | 1280 | lavender | Keyboard focus on `Face-out` (gold ring) |

## Review after building (2026-11-23)

(UX designer. Looked at all 11 shots in `T-0052-screens/`, at the three picker shots state by
state, and at the diff of `shelfLayout.ts`, `BookMesh.tsx` and `BookPanel.tsx`.)

**Verdict: matches the design. Nothing must be fixed before the tester. One thing the shots
cannot show, which I pass to the tester, and one picture the demo shelf cannot produce.**

**The poses on a shelf** (rows 1, 2, 5), at 390 and 1280:
- **Face-out** books turn their cover to her, are clearly wider than their neighbours, stand at
  the same floor height, and their front faces line up with the standing books' fore-edges, so
  the shelf's front line stays straight. The cover fills the board at the right shape.
- **Flat stacks** read as a pile of books: the spines face her, each **title reads left to right
  and the right way up**, the covers all face upward so a stack reads as one pile, the gold
  ridges run along the top edge of each book, and a read book's medal sits at the left-hand end
  of its spine. The hand-made nudge is there and is as small as I asked — it looks stacked, not
  machined.
- **Two stacks side by side** (row 5, and the zoom in row 2) look deliberate, not like a mistake.
- Standing books between them are untouched.
- Zoomed in (row 2, 1.96×) I can see the ridges, the medals and the paper edges of all three
  poses; nothing flickers, no dark seams, no board edge in a different colour, no book sunk into
  or floating above the board, nothing through the shelf above or past the case's sides.

**The picker** (row 3, each pose pressed in turn at 390): it is the first group on **Looks**,
the heading **How it stands** above a pill of **Standing · Face-out · Lying flat**, the current
one gold, above *Front / Spine / Back*. No icons, no hint text, nothing disabled. The book above
the sheet turns as she taps. Focus ring on *Face-out* at 1280 (row 7).

**Back to Standing** (row 6): the 150-book shelf with every pose cleared is the same picture as
the plain shelf of the same books — a pixel diff of row 6 against T-0051's row 1 finds **0.60 %**
differing, all of it the fairy lights' twinkle and JPEG noise. Same places, same gaps, same
decorations. That was the check I most wanted and it holds.

**Difference 1 — the face-out cover is the painted fallback in every shot.** The design asked
for "a face-out book without a cover next to one with a cover". The demo shelf has no
`coverUrl`, and the shots run with no backend and no network (G-0019), so every face-out book in
row 4 shows the **painted** cover. That picture is correct and is what a book without a cover
gets; the pair with a real cover picture can only be seen on her own shelf. Not a fault of the
build; it stays on her list to confirm.

**Difference 2 — nothing here can show the flight.** A still cannot prove there is no jump when
a posed book is taken out or lands back. The code slerps from the pose into exactly the standing
book's inspect orientation, so the endpoints are identical, and the picker shots show the book
out and correct. **For the tester:** watch one take-out and one put-back of a face-out book and
of a book in the middle of a stack, at 390 and at 1280.

**Accepted as built, not in the design:** the two camera fixes (the computer's whole-case framing
and the zoomed-in top gap). Both are what the design demanded — the bar covers no book — and
they are the only way to get it.

# Test

(Tester.)

# Log

- 2026-11-23 architect: wrote the task from Hanna's backlog item 2 and recorded **D-0044** (the
  optional `pose` field, the three footprints, flat stacks, the cover on a face-out book, and
  standing as the fallback when a pose cannot fit). Checked that no code-owned path is needed:
  the field rides along with the shelf exactly as D-0042 established for tropes, so neither
  `shelfMerge.ts` nor `server/shelf.ts` changes. Set the measured budget against T-0034's
  numbers, with the face-out cover as the one allowed growth. Size: **full**. Three questions
  for Hanna, none blocking. Handed to the **UX designer**.
- 2026-11-23 ux-designer: designed. The picker is the first group on Looks, a `.segmented` pill
  under the heading **How it stands**, Standing pressed for a book with no field, no icons and no
  disabled buttons (every pose can always be chosen, even when this bookcase cannot draw it).
  Wrote how each pose reads on a shelf (cover or painted fallback face-out; spine towards her and
  title upright when flat; where the ridges, medal and paperclip end up), how a stack looks (±2 mm
  alternating shift, 4 mm under the shelf above, never split at a shelf's end, all books front-up)
  and a "must not happen" list. Seven screenshot rows. Added the design's checks to *Done when*.
  Handed to the **developer**.
- 2026-11-23 developer: built, with T-0051 and T-0053 on `shelf-and-room`, one pull request.
  **The field:** `pose?: 'faceout' | 'flat'` on `Book`, with `src/lib/pose.ts` owning `poseOf`
  (anything unknown is standing), `posePatch` (Standing clears the field, never writes
  `'standing'`) and the three words. No change to `shelfMerge.ts`, `server/shelf.ts` or
  `deploy/nas/`: the field rides along with the shelf exactly as D-0042 established.
  **The layout:** `computeLayout` now packs by **footprint** instead of thickness.
  `footprint(dims, pose)` gives `along`/`up`/`deep` per D-0044 §4; each book's `Slot` carries
  the pose the shelf actually drew it in. Books are grouped into items first — one book, or a
  run of neighbouring flat books — so a stack is packed as one item; a separator (a nook or a
  series divider) starts a new item, so a marker is never swallowed by a stack. A stack fills
  to `stackRoom()` (the row less its board and the shelf gap) and then starts a new stack
  beside it; every book but the bottom one is nudged `STACK_SHIFT` (2 mm) alternately. Each
  pose's `z` puts its **front face on the shelf's front line**, so the shelf's front edge stays
  straight whichever way a book is turned.
  **The fallback** uses the **most cramped empty shelf of the case** (the inner width less the
  widest decoration's spot), not the shelf a book happens to land on: a book's pose then never
  depends on its neighbours, and the same book is drawn the same way wherever it ends up.
  **The turn:** `poseBasis` / `poseQuaternion` give each pose as a basis, and the tests check
  the **drawn book's world bounding box and which face points at the camera**, not Euler
  angles. A standing book keeps byte-for-byte the old `rotation.set(...)` path; a posed book
  rests in its pose and **slerps into exactly the standing book's inspect orientation** as it
  flies out, so take-out and landing have no jump. Lying flat reads spine-out with the
  lettering left to right, which follows from `paintSpine` running the title from the spine's
  top downwards.
  **Face-out without the full parts:** rather than giving a face-out book the five-mesh
  hardcover, it keeps the merged shelf piece (two draws, D-0035) and gets **one thin plane**
  carrying the cover over its front board. That is the one extra draw the budget allows; the
  five-part path would have cost four.
  **Checks:** `pnpm test` 1783 passed, 22 skipped; `tsc --noEmit` clean; `pnpm run build`
  passes; `harness check` green. New tests: `src/lib/pose.test.ts` (5),
  `src/lib/shelfLayout.poses.test.ts` (16), `src/components/BookMesh.poses.test.ts` (12),
  `src/components/BookPanel.pose.test.tsx` (7).
  **Measured** (as T-0034 requires; every 10th demo book posed):

  | At rest, Detailed on | no poses | 10 % flat | 10 % face-out | Budget | Result |
  |---|---|---|---|---|---|
  | 390 × 844, 150 books, draws/frame | 90 | 74 | 71 | flat ≤ none + 5 %; face-out ≤ +1 draw per book in view | ✓ both **lower** |
  | 390 × 844, 400 books, draws/frame | 84 | 67 | 69 | | ✓ |
  | 390 × 844, 150, picture MB | 22.59 | 18.69 | 18.66 | none/flat within 5 % of T-0034's 23.20 | 22.59 is −2.6 % ✓; flat lower ✓ |
  | 390 × 844, 150, geometry MB | 0.798 | 0.717 | 0.694 | ≤ 2 MB | ✓ |
  | 1280 × 800, 150, draws/frame | 926 | 949 | 979 | | +23 for 15 flat, +53 for 15 face-out |
  | 1280 × 800, 150, picture MB | 123.66 | 123.66 | 160.91 | face-out reported per book | **+2.48 MB per face-out book** |
  | Draw calls behind the Dashboard | 0 | 0 | 0 | 0 | ✓ |
  | Contexts lost, 400 books | 0 | 0 | 0 | 0 | ✓ |

  Reading the numbers: on the **phone** a posed shelf draws **less**, because a face-out or
  flat book takes more room so fewer books are in view; the budget's intent (never heavier) is
  met with room to spare. The **computer** shows the real per-book cost, because it draws the
  whole case: +53 draws for 15 face-out books over two passes (colour and shadow) is **+1 draw
  per face-out book**, exactly the budget. The one number to watch is the picture memory: a
  face-out book costs **about 2.5 MB** for its cover. These demo books have no cover, so that
  is the painted fallback at full size; a real cover is capped at 512 px (`COVER_MAX_PX`) and
  costs about 1.4 MB with its mipmaps. Twenty face-out books on a phone would be roughly 30 MB
  of picture memory on top of 23 MB — worth knowing, well inside what T-0003 measured, and it
  is what D-0044 §6 allows. **Deviation:** the phone's no-poses draw calls are 5.3 % below
  T-0034's 95 rather than within 5 %, because T-0051's bar takes 218 px of header and two or
  three fewer books are in view. It is lower, not higher.
  Screenshots: `T-0052-screens/` (11 files). Row 4 shows a face-out book with the **painted**
  fallback cover on midnight; a real cover picture needs a book with a `coverUrl`, which the
  demo shelf has none of (no network in the shot run, G-0019), so that pair is for Hanna's own
  shelf to confirm. The zoom shot (row 2) is at 1.96× and is scrolled where zooming left it,
  not at the top row.
  Handed to the **UX designer** for review.
- 2026-11-23 ux-designer: reviewed: matches the design, nothing to fix. All three poses read
  correctly on the shelf (a face-out cover at the right shape and front line, flat stacks with
  their titles the right way up and their covers upward, two stacks side by side), the picker is
  the first group on Looks, and a shelf with every pose cleared is the same picture as the plain
  shelf (0.60 % of pixels differ, all twinkle and JPEG noise). Two things stills cannot show, both
  passed to the tester: the flight out and back of a posed book, and a real cover picture
  face-out (the demo shelf has none, so every shot shows the painted fallback). Handed to the
  **tester**.
