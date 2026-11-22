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

UX designer, before the build: where the *Detailed books* control sits in the 🎨 panel and how it
looks (on/off, focus, its accessible name; no hint text, D-0014), on both wallpapers; the words
and place of the simple-books action in the SafeBookshelf note; what the phone shelf looks like
with hardcovers (same as the computer's, at phone size). After the build: review against
screenshots at 390, 360 and 1280, both settings, both wallpapers.

# Test

# Log

- 2026-11-22 architect: wrote the task from Hanna's feature chat (night mode, nothing asked).
  Recorded D-0035 (hardcovers on every device, merged on the shelf, *Detailed books* switch per
  device, on by default; the note stays). Set the budget against the blocks at 390 × 844 with
  150 and 400 books (draw calls ≤ 1.25 ×, pictures ± 5 %, geometry ≤ 2 MB) and the tests.
  Size: **full**. Handed to the **UX designer** for the switch, the note's simple-books action
  and the phone look; the developer may start on the lighter hardcover and the measuring script
  in parallel, since they change nothing she sees on the computer.
