---
id: T-0034
title: "Bring the hardcover books back on phones, lighter to draw, with a Detailed books switch in the room panel"
description: "Phones show the hardcovers (pages, boards, spine, ridges) again instead of the simple blocks from T-0003, after making each hardcover one merged piece of at most two draws on the shelf; measured against the blocks at 390 × 844 with 150 books; a Detailed books on/off switch in the 🎨 room panel, per device, on by default; the SafeBookshelf note stays."
status: Open
size: full
depends_on: []
decisions: [D-0002, D-0014, D-0020, D-0022, D-0035, G-0019, G-0031]
raised_on: 2026-11-22
done_on: ""
result: []
---

# Goal

Requester: Hanna, in a feature chat on 2026-11-22. Night mode: she wasn't asked anything more;
the team's picks are under *Choices made by the team*, and the open points under *Questions to
re-ask Hanna in the morning*.

**Why the phones have blocks.** On 21 November (T-0003, #181) her phone showed "The bookshelf
can't be drawn". While the cause was unknown, one of the changes was to draw every book on a
phone as one simple block instead of a hardcover (#207). The *Log* of T-0003 then found the real
causes: Chrome had **blocked WebGL after the earlier crashes** ("Error creating WebGL context …
no WebGL", fixed by force-stopping Chrome), and the shelf **kept drawing behind the other pages**
(about 25,000 draw calls a second behind the Dashboard, fixed in #208). Both are fixed, so the
blocks are no longer needed for the shelf to show. She wants the hardcovers back.

**What this task delivers.**

1. **Lighter hardcovers first** (D-0035). Today a hardcover on the shelf is a page block, two
   rounded boards and a rounded spine (four meshes, eight material groups) plus four ridge
   meshes: about twelve draws per book, doubled by the shadow pass on the computer. On the
   shelf, make it **one merged geometry per book** (pages, boards and spine, e.g. with
   `mergeGeometries` from `three/examples/jsm/utils/BufferGeometryUtils.js`) with **two
   material groups**: the paper (fore-edge, top, bottom) and the cloth (the spine's painted
   picture, and the boards' edges and outer faces, which face the neighbouring books on the
   shelf). The **ridges add no draw per book**: either as boxes in the cloth group whose UVs
   sample a gold area of the spine picture (T-0004 already paints gold bands), or as one
   `InstancedMesh` for the whole shelf that follows hover, drag and take-out. The developer
   picks and says why in the *Log*. Share geometry between books of the same size (round to
   0.1 mm) where it helps memory. **Only the book that is taken out** uses today's separate
   parts with the cover picture and the painted back, as now.
2. **Measure** the lighter hardcover against the simple blocks, the way T-0003 did (built app,
   390 × 844, 150+ books, draw calls per 3 s, picture memory), before the phone default goes on.
3. **Phones get the hardcovers** when *Detailed books* is on. Everything else T-0003 made
   lighter on phones stays (no shadows, up to 1.5 pixels per point, no antialiasing, only the
   main light, still decorations, medals without rim, covers loaded only when taken out).
4. **A *Detailed books* switch in the 🎨 room panel**, on or off. Part of the room settings in
   `localStorage` (`hannas-reading-list:room`, `src/components/RoomPanel.tsx`), so per device
   (D-0022). On by default; a saved room without the field counts as on; *Reset* puts it back on.
   Off draws the simple blocks (today's phone path) on that device. The shelf changes live
   behind the panel, like the wood.
5. **The SafeBookshelf note stays** the fallback. When *Detailed books* is on, the note also
   offers to show the simple books (UX designer: words and placement), which switches it off
   and draws again. The app never turns it off by itself.

The computer keeps its hardcovers (on by default) and must look the same as on `main`; it gets
the lighter shelf hardcover too, so it draws less.

# Done when

**Measurements** (developer runs them, tester re-runs them independently; the numbers go in a
table in the *Log* / *Test*). Built app (`pnpm run build && pnpm run preview`), no
`POCKETBASE_URL`, no `.netlify` link (G-0019), shelf seeded in the browser's `localStorage`
(`hannas-reading-list:v1`) with **150 books** and once with **400**, headless Chrome with phone
emulation (390 × 844, touch, `isMobile`, device pixel ratio 3, so the app's 1.5 cap applies) and
once at 1280 × 800. Counted at the WebGL level, so it is fair to both looks and needs no app
code: an init script that wraps `drawArrays` / `drawElements` / their instanced forms (draw
calls), `texImage2D` / `texSubImage2D` / `texStorage2D` (picture bytes, width × height × 4) and
`bufferData` (geometry bytes), on `WebGLRenderingContext` and `WebGL2RenderingContext`. Commit
the script as `scripts/measure-shelf.mjs` with a `pnpm run measure:shelf` entry; adding
Playwright as a dev dependency is allowed (D-0002, as in T-0003).

| At 390 × 844, shelf at rest, no book out | Budget |
|---|---|
| Draw calls per frame, *Detailed* on vs off (blocks) | on ≤ 1.25 × off, at 150 and at 400 books |
| Draw calls per 3 s (T-0003's measure), on vs off | on ≤ 1.25 × off |
| Picture (texture) bytes, on vs off | equal within 5 % (no new pictures per book) |
| Geometry bytes, on, 150 books | ≤ 2 MB, and on ≤ off + 2 MB |
| Draw calls behind the Dashboard | 0, on and off (T-0003's fix still holds) |
| At 1280 × 800, *Detailed* on, vs `main` | draw calls per frame lower than `main`; picture bytes equal within 5 % |

Also recorded, not budgeted: the same with **today's `main` hardcover forced on the phone**
(for the before/after), `renderer.info.memory` geometries and textures, and the 400-book run
drawing without a lost context. If a budget can't be met, the developer stops, writes the
numbers in the *Log* and hands back to the architect; the phone default stays on blocks until
then (see *Choices*, 5).

**Tests (Vitest, next to the code):**

- `src/lib/room.test.ts`: `DEFAULT_ROOM.detailedBooks` is `true`; `cleanRoom` gives `true` for a
  missing field, `null`, `"no"` and `1`, and keeps `false`; an old saved room (wood, wallpaper,
  decor only) loads with `detailedBooks: true` and its other choices unchanged.
- `src/components/RoomPanel.test.tsx` (new): the panel shows a *Detailed books* control
  (checkbox or switch with that accessible name), checked by default; toggling calls `onRoom`
  with `detailedBooks: false` and the rest of the room unchanged; *Reset* gives it back `true`;
  `useRoom` writes the field to `localStorage` and reads it back after a remount.
- `src/components/BookMesh.test.ts`: the shelf hardcover geometry (e.g. `shelfHardcover(dims)`)
  is **one** `BufferGeometry` with **exactly two groups** covering every index; its bounding box
  matches today's hardcover (width, height, thickness within 1e-6); it has at most 300 vertices;
  the ridge count is 4 for an unread book and 2 for a read one (none at the bottom, under the
  medal), and they add no group or mesh per book.
- Which look a book gets, as a small pure function (e.g. `bookLook({ detailed, takenOut })`):
  detailed and on the shelf → merged hardcover; detailed and taken out → full hardcover parts;
  not detailed → block (shelf block, or full block when taken out). Independent of phone or
  computer.
- `src/components/SafeBookshelf.test.tsx`: the existing tests still pass; with *Detailed books*
  on, the note has the "simple books" action and using it calls back with `detailedBooks: false`
  and draws again; with it off, the action isn't there.
- `pnpm test`, `pnpm run build` and `tsc --noEmit` pass; CI is green.

**What she sees** (tester, local dev server with no backend, screenshots in
`docs/tasks/T-0034-screens/`):

- 390 × 844 and 360 × 800, 150 books, *Detailed books* on (the default on a fresh device): the
  books on the shelf are hardcovers (boards sticking out past the pages, rounded spine, gold
  ridges), as on the computer. Swiping scrolls, a tap takes a book out (cover, back when turned),
  Esc or a tap on the room puts it back.
- 🎨 → *Detailed books* off: the shelf behind the panel turns into the simple blocks at once; on
  again: hardcovers. After a reload the choice is kept; on another browser profile it is on.
  *Reset* switches it back on.
- 1280 × 800: the shelf looks the same as `main` (side-by-side screenshot with the same books).
- WebGL off and a lost context (`WEBGL_lose_context`): the note shows as in T-0003, with the
  simple-books action while *Detailed books* is on; using it brings the shelf back as blocks.
- The UX designer has reviewed the screenshots.
- **From the design** (added by the UX designer; details under *Design*):
  - In the 🎨 panel, a **Books** row sits between *Wallpaper* and *Decorations*, with one
    checkbox labelled **Detailed books**. On a 360 × 800 phone it shows when the sheet opens,
    without scrolling. No other text in the row (D-0014).
  - Keyboard: Tab from the *Wallpaper* choices reaches the checkbox next. It shows the gold
    focus ring, and Space toggles it. A screen reader reads "Books, group" and "Detailed books,
    checkbox, checked". A tap anywhere on the 44 px row toggles it.
  - The 🎨 button's tooltip reads "Your room: wood, wallpaper, books, decorations".
  - The can't-be-drawn note with *Detailed books* on shows **Try again** (gold) and **Show
    simple books** (outlined) side by side, wrapping onto two centred lines at 360 if needed;
    with it off, only *Try again*. The note's words are unchanged.
  - With *Detailed books* on, a book looks the same while it is taken out and put back: no jump
    in size, colour, lettering or ridges when it leaves or reaches the shelf. Switching it on or
    off moves no book on the shelf (same places, same gaps, same nooks).

**Hanna** (stays *Doing* with a `Remaining:` line until she confirms): on her own phone the
shelf shows hardcovers and scrolls and turns books smoothly; the switch works.

# Notes

- Read first: T-0003's *Log* (why phones got blocks, how memory and draw calls were measured),
  T-0004 (gold bands on the spine), D-0022 (room settings per device), D-0035 (this task's
  decision).
- Code: `src/components/BookMesh.tsx` (the `simple` prop, `parts`, `materials.shelf`,
  `shelfBlock`, `SpineRidges`, `Medal`), `src/components/BookshelfScene.tsx` (`useLite`,
  `simple={lite}` at the `BookMesh` call, `room` prop), `src/components/SafeBookshelf.tsx`,
  `src/components/RoomPanel.tsx` (`useRoom`, the panel), `src/lib/room.ts` (`Room`,
  `DEFAULT_ROOM`, `cleanRoom`), `src/routes/index.tsx` (where `room` reaches the scene),
  `src/components/textures.ts` (`paintSpine`), `src/styles.css` (`.room-*`).
- `simple` stops meaning "phone": the look follows `room.detailedBooks`; `lite` keeps meaning
  "phone" for shadows, pixels, lights and decorations.
- Changing the switch must free the old geometries and materials (the existing dispose effects):
  the tester toggles it ten times with 150 books and checks `renderer.info.memory` comes back to
  the same counts.
- Nothing about the books or how the shelf is saved changes; the setting lives only in the
  browser (no new `Book` field, no server change: group 1). No code-owned path is touched
  (`.github/`, `netlify*`, `deploy/nas/`, `shelfMerge.ts`, `server/shelf.ts`, `.claude/`).
- Previews show the sign-in screen: screenshots come from a local dev server or preview build,
  never from signing in on a deploy preview (#193).
- No hint text under the switch (D-0014). Colours and sizes from the tokens (D-0020).
- The creature tasks T-0027 to T-0033 (another branch) put a creature on the shelf (T-0033);
  no overlap expected, but whoever merges second runs `harness tasks-index` again.

## Choices made by the team

Hanna wasn't asked anything (night mode). The architect took these:

1. **The switch shows on every device**, on by default everywhere, so the computer keeps its
   hardcovers and a weak laptop has the same way out. (She said "on phones"; one rule is
   simpler and the default changes nothing on the computer.)
2. **Label "Detailed books"**, her words, as an on/off control in its own row of the room
   panel; the UX designer places it.
3. **Lighten first, for every device**: the computer draws the same merged shelf hardcover, and
   must look the same as `main`. One code path instead of three.
4. **The fallback note offers the simple books but never switches by itself** (like D-0027:
   nothing changes her choices behind her back). A lost context with hardcovers on gets
   "Try again" and a way to the blocks.
5. **Budget before default:** the phone default goes to hardcovers only when the measurements
   meet the budget above. If they can't, the developer hands back and the architect re-plans
   (fewer parts, or default off on phones) rather than shipping something heavier.
6. **Ridges cost no draw per book** (painted UVs in the cloth group, or one instanced mesh); the
   developer chooses the way.
7. **Kept per device in `localStorage`**, as she agreed, with the other room settings; not on
   the account (that would be a server change).
8. **Size: full.** It changes what she sees on the phone and adds a control to a panel, and the
   rendering change is broad enough to want a design pass and a review.

## Questions to re-ask Hanna in the morning

1. "The *Detailed books* switch is also in the room panel on your computer (on there too). Fine,
   or should it be on the phone only?"
2. "If the shelf can't be drawn while detailed books are on, the note offers to show simple books
   instead. Would you rather it switched to simple books by itself?"
3. "If the hardcovers turn out a little slower on your phone than the blocks, would you still
   like them on by default, or start with simple books and switch them on yourself?"

# Design

(UX designer, before the build, night mode: the recommended option is taken at each choice; Hanna
can still change it in the morning. No new colours, sizes or words beyond those below (D-0014,
D-0020).)

## 1. The *Detailed books* switch in the 🎨 panel

**Where.** It gets its own `room-row` **between *Wallpaper* and *Decorations***, so the panel now
reads Wood · Wallpaper · **Books** · Decorations · Reset/Done. Why there and not at the bottom: on
the phone the sheet is at most 60 % of the screen and the eight decorations already make it
scroll. Below the decorations, the switch would be hidden at 360 × 800, and it is the one
setting a struggling phone needs. It also groups the room's look first (wood, wallpaper),
then the books, then what stands between them.

**What it looks like.** The same pattern the decorations already use, so it needs no new
styles beyond a focus ring:

```
Books                                  ← muted small heading, like "Wood" / "Wallpaper"
[✓] Detailed books                     ← .room-toggle: native checkbox + label, 44 px row
```

- Markup: `<div className="room-row" role="group" aria-label="Books">`, then the
  `muted small-text` heading "Books", then `<label className="room-toggle"><input
  type="checkbox" checked={room.detailedBooks} …/><span>Detailed books</span></label>`.
- A **checkbox, not a slider-switch or a two-button segmented control**. The decorations in the
  same panel are checkboxes, the gold tick comes from `accent-color: var(--accent)` as elsewhere,
  and it needs no new component. (It is the "on/off control" of *Choices* 2.)
- **On:** gold tick. **Off:** empty box. The label stays cream (`--text`) in both states. Unlike
  an off decoration, it is not greyed, because grey would read as "can't be used".
- **Focus:** `.room-toggle input:focus-visible { outline: 2px solid var(--accent); outline-offset:
  2px }`, the same ring as `.btn:focus-visible`. If the decorations' checkboxes have no ring yet,
  the same rule gives them one.
- **Both wallpapers:** the panel is `--surface-solid` on lavender and on midnight, so the row
  looks the same on both. The screenshots check this.
- **No hint text** under it (D-0014): nothing like "simpler books are lighter for your phone".
- The 🎨 button's tooltip (`title`) becomes "Your room: wood, wallpaper, books, decorations". Its
  `aria-label` stays "Your room".

**Words.** Heading **Books**. Label and accessible name **Detailed books** (her words). The screen
reader hears "Books, group", then "Detailed books, checkbox, checked" (or "not checked").

**What it does.**
- A tap anywhere on the row, or Space when it has focus, toggles it. The shelf behind the panel
  changes **at once**, like the wood: hardcovers ↔ simple blocks, every book in the same place
  with the same gaps and nooks, the same spine colour and lettering. Nothing fades or animates.
  The panel stays open and focus stays on the checkbox.
- With a book taken out, the taken-out book changes too (full hardcover ↔ full block) and stays
  out.
- *Reset* ticks it again, with the rest of the room's defaults.
- Keyboard order: Close × → Wood chips → Wallpaper chips → **Detailed books** → decorations (each
  checkbox, ↑, ↓) → Reset → Done. Esc closes the panel, as now.

## 2. The "Show simple books" action in the can't-be-drawn note

Today's note (T-0003) keeps its words, its order and its *Details*. Only the buttons change:

```
The bookshelf can't be drawn on this phone right now.
Your books are safe. The Dashboard, Challenges and Calendar still work.
      [ Try again ]  [ Show simple books ]          ← gold primary, then outlined .btn
                    ▸ Details
```

- **Only while *Detailed books* is on.** With it off, the note shows only *Try again*, as today.
- **Try again** stays first and gold: she most often only needs a fresh start (the real causes
  were a blocked WebGL and drawing behind pages). **Show simple books** is the secondary,
  outlined `.btn` next to it, the same height. The two sit in one centred row with `--space-2`
  between them and wrap onto two centred lines when the width is too small (360 fits both on one
  line at `--fs-body`; a large font setting may wrap them).
- **Words:** "Show simple books". It says what she gets, in the panel's own words ("simple books"
  as in the task, "show" as in the other actions), with no technical terms. Its accessible name is
  its text.
- **What it does:** switches *Detailed books* off (saved on this device, exactly as unticking it
  in 🎨 would), hides the note and draws the shelf from scratch as blocks, the same fresh start
  *Try again* gives. If that also fails, the note comes back with only *Try again*. The app never
  presses it by itself (D-0035).
- **Getting the hardcovers back** is the 🎨 panel's *Detailed books*, ticked again. The note
  doesn't explain this (D-0014). The panel is where she set up the rest of her room.
- Focus after either button: as *Try again* does today (no forced move); not part of this task.

## 3. The hardcovers on the phone (390 and 360) compared with the computer

**The rule: with *Detailed books* on, a book on the phone is the same hardcover as on the
computer, only smaller on screen.** Compared at the same zoom with the same books
(`1280` vs `390`/`360`):

- **The same in every way that tells it's a hardcover:** the boards stand out a little past the
  pages at the top, bottom and fore-edge. The page block shows as paper between the boards. The
  spine is softly rounded. The spine's painted colour, its gold bands and its lettering match the
  computer. The **gold ridges** are there: 4 on an unread book, 2 on a read one (none at the bottom,
  where the medal is). Read books keep their medal at the spine's foot.
- **Allowed to differ on the phone** (what T-0003 made lighter, and it stays): no shadows under or
  between the books, so the shelf looks a little flatter; only the main light; slightly sharper,
  un-smoothed edges (no antialiasing); medals without their rim. The medal's rim follows the
  phone setting, not *Detailed books*: phone means no rim, also with hardcovers on.
- **Must not happen** (each one sends the build back):
  - ridges that flicker, shimmer or sit apart from the spine while scrolling, or that stay behind
    when a book lifts on hover, drag or tap;
  - dark seams, gaps or black faces between boards, pages and spine; a board edge that looks a
    different colour from the spine;
  - spine lettering blurrier or harder to read than with the simple blocks at the same width;
  - a visible swap when a book is taken out or put back (the shelf piece and the taken-out parts
    must match in size, colour, lettering and ridges, so the flight starts and ends without a
    jump);
  - books moving or the gaps changing when *Detailed books* is switched (the hardcover and the
    block have the same outer size).
- **At 360** the thinnest books are a few pixels wide. Their ridges may shrink to thin gold lines,
  which is fine, but the spine must still read as one coloured strip, not as noise.
- **Behaviour is unchanged:** swiping scrolls, ‹ › and zoom work, a tap takes a book out (cover,
  the back when turned), Esc or a tap on the room puts it back, and the taken-out book is the full
  hardcover with its cover picture, as on the computer.
- **The computer (1280)** looks the same as `main`, book for book. The merged shelf piece must not
  be visible as a change.

## 4. Screenshots (tester, into `docs/tasks/T-0034-screens/`)

Local dev server or preview build, no backend (G-0019), the same 150 seeded books in every shot.
Names: `<width>-<wallpaper>-<n>-<what>.jpg`.

| # | Width | Wallpaper | What |
|---|---|---|---|
| 1 | 390, 360, 1280 | lavender, midnight | Shelf at rest, *Detailed books* on (fresh device) |
| 2 | 390, 360, 1280 | lavender | Shelf at rest, *Detailed books* off (blocks), same view as 1, for the side by side |
| 3 | 390 | lavender | Shelf zoomed in (zoom 3) on a run of unread and read books, on: boards, ridges, medal close up |
| 4 | 390, 360 | lavender | A book taken out, on (cover), and turned (back) |
| 5 | 390, 360, 1280 | lavender, midnight | 🎨 panel open, *Detailed books* on, shelf behind |
| 6 | 390 | lavender | 🎨 panel, *Detailed books* off, the blocks behind it |
| 7 | 390, 1280 | lavender | Keyboard focus on *Detailed books* (gold ring) |
| 8 | 390, 360, 1280 | lavender | The note with *Detailed books* on: Try again + Show simple books |
| 9 | 390 | midnight | The same note on midnight |
| 10 | 390 | lavender | The note with *Detailed books* off: only Try again |
| 11 | 390 | lavender | After *Show simple books*: the shelf as blocks, then 🎨 showing the box unticked |
| 12 | 1280 | lavender | `main` and this branch side by side, same books and view (`main-1280-…` / `1280-…`) |

No questions for Hanna come from the design beyond the ones above. Its picks (the place under
*Wallpaper*, a checkbox, the words "Show simple books") are small and easy to change if she
says so.

# Test

# Log

- 2026-11-22 architect: wrote the task from Hanna's feature chat (night mode, nothing asked).
  Recorded D-0035 (hardcovers on every device, merged on the shelf, *Detailed books* switch per
  device, on by default; the note stays). Set the budget against the blocks at 390 × 844 with
  150 and 400 books (draw calls ≤ 1.25 ×, pictures ± 5 %, geometry ≤ 2 MB) and the tests.
  Size: **full**. Handed to the **UX designer** for the switch, the note's simple-books action
  and the phone look; the developer may start on the lighter hardcover and the measuring script
  in parallel, since they change nothing she sees on the computer.
- 2026-11-22 ux-designer: designed (night mode, recommended options taken). *Detailed books*
  is a checkbox in its own **Books** row between *Wallpaper* and *Decorations*, so it shows at
  360 without scrolling, with a gold focus ring and no hint text. The note gets a secondary
  **Show simple books** next to *Try again*, only while it is on. The phone hardcover matches
  the computer's except for T-0003's lighter settings, and the medal rim follows the phone, not
  the switch. Added design checks to *Done when* and a 12-row screenshot list. No new questions
  for Hanna. Handed to the **developer**.
