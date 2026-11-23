---
id: T-0053
title: "Add four cosy room extras she can switch on: a reading corner, day & night, a plant that grows with her reading, and the season's decorations"
description: "Four more toggles in the 🎨 room panel, kept per device and on by default like Detailed books: a reading chair with a blanket and a floor lamp, day & night (the room dims from 19:00 to 07:00 by the device's clock, the lamp and the fairy lights glowing, never an extra light on a phone), a plant that grows in five steps with the books she finished this year, and seasonal decorations in four bands (pumpkins Sep–Nov, a tree with lights Dec–Feb, flowers Mar–May, sunflowers Jun–Aug); together at most +10 draw calls a frame and +0.5 MB of geometry on a phone, or the extra is simplified, and failing that dropped."
status: Doing
size: full
depends_on: []
decisions: [D-0014, D-0020, D-0022, D-0035, D-0045, G-0019, G-0031]
raised_on: 2026-11-23
done_on: ""
result: []
---

# Goal

Requester: Hanna, in her feature chat of 22 November 2026, item 3 of `docs/backlog.md`. Built on
one branch with T-0051 and T-0052.

Her room has a bookcase, a wallpaper, a floor, fairy lights and the decorations on the shelves
(D-0022). She asked for the rest of a cosy reading room, each thing switchable like a
decoration, and said to keep her phone's performance in mind.

**What this task delivers** (D-0045):

1. **Four new fields on `Room`**, plain booleans in `localStorage` with the rest of the room,
   **on by default**, put back on by *Reset*, and **on** for a saved room that hasn't got them,
   exactly as `detailedBooks` works (D-0035): `readingCorner`, `dayNight`, `plant`, `seasonal`.
   They are **their own toggles** in the 🎨 panel, not entries in the ordered decorations list:
   they stand on the floor, not on a shelf, and must not take a shelf from the koala.
2. **A reading corner:** a chair with a blanket over its arm and a floor lamp behind it, on the
   floor beside the bookcase, clear of the camera at every zoom and on every screen. One toggle
   for all three, as she asked for them as one thing.
3. **Day & night** by the device's own clock: night from **19:00 to 07:00** local, re-read every
   minute so it turns over by itself and so 23:59 → 00:00 stays night. At night the room's
   light comes down to a warm dim evening; the lamp's shade and the fairy lights glow
   (emissive, so the glow costs nothing); with the reading corner on, a **computer** also gets
   one small warm light at the lamp. **A phone never gets an extra light**, at any hour.
   Nothing animates on the turn-over.
4. **A plant** in a pot on the floor, in five steps by the books she finished **this calendar
   year**: **0** a sprout, **1–4** small, **5–14** medium, **15–29** full, **30+** flowering. At
   0 it is a sprout, never an empty pot.
5. **Seasonal decorations** on the floor by the device's month, in four bands so there is always
   something: **Sep–Nov pumpkins**, **Dec–Feb a little tree with lights**, **Mar–May flowers**,
   **Jun–Aug sunflowers**.
6. **Scenery only:** no book moves, no decoration loses its shelf, the case's size and the
   camera are untouched, nothing is drawn while another page is over the shelf, and on a phone
   the extras are still, like the decorations (`StillDecorations`).
7. **The app never changes a toggle** and never switches one off because a device is slow.

# Done when

**Tests (Vitest, next to the code):**

- `src/lib/room.test.ts`: `DEFAULT_ROOM` has all four `true`; `cleanRoom` gives `true` for a
  missing field, `null`, `"no"`, `1` and `"false"` (a string) and keeps a real `false`, for each
  of the four; a room saved before them (wood, wallpaper, decor, `detailedBooks: false`) loads
  with the four on and its own choices unchanged; the four are **not** in `room.decor`, so
  `shownDecor` and `moveDecor` are untouched and no shelf is taken.
- `src/lib/roomExtras.test.ts` (new), the pure module:
  - `isNight(date)` is true at 19:00, 23:59, 00:00 and 06:59 and false at 07:00, 12:00 and
    18:59, in the device's local time; across a midnight it stays night;
  - `plantStage(books, year)` gives the five steps at 0, 1, 4, 5, 14, 15, 29, 30 and 300 books
    finished in that year, counting finish days the way the dashboard does; a book finished
    twice in one year counts its finishes, a book finished last year counts for last year; a
    shelf with no finishes gives the sprout;
  - `seasonOf(date)` gives pumpkins for September, October and November, the tree for December,
    January and February, flowers for March, April and May and sunflowers for June, July and
    August — every month of the year covered, each in exactly one band.
- `src/components/RoomPanel.test.tsx`: the panel shows four more controls with the designer's
  accessible names, all checked by default; toggling each calls `onRoom` with just that field
  flipped and the rest of the room unchanged; *Reset* gives all four back `true`; `useRoom`
  writes them and reads them back after a remount; the *Detailed books* control and the
  decorations list still behave as T-0034's tests require.
- `src/components/Decorations.test.tsx` or a new `RoomExtras.test.tsx`: each extra renders
  nothing when its toggle is off; the plant renders the stage `plantStage` gives; the season
  renders the band `seasonOf` gives for a pinned date; at night with a phone no light is added
  and on a computer exactly one is, and only with the reading corner on.
- `src/lib/colours.test.ts` keeps passing on both wallpapers.
- `pnpm test`, `tsc --noEmit`, `pnpm run build` and `pnpm exec harness check` pass; CI green
  with no retries.

**Measurements** (developer runs them, tester re-runs them independently) with
`pnpm run measure:shelf` as T-0034 requires, at 390 × 844 (DPR 3, touch, `isMobile`) and
1280 × 800, 150 and 400 books, 3 s at rest, with the clock pinned once to **13:00** (day) and
once to **21:00** (night), all four extras **off** against all four **on**:

| At 390 × 844, shelf at rest, all four on vs all four off | Budget |
|---|---|
| Draw calls per frame | at most **+10** |
| Geometry bytes | at most **+0.5 MB** |
| Picture (texture) bytes | equal within **5 %** (the extras bring no pictures of their own) |
| Extra lights on a phone, day and night | **0** |
| Draw calls behind the Dashboard | **0**, on and off |
| Contexts lost, 400 books | 0 |

Also recorded, not budgeted: the same at 1280 × 800, day and night, and the five plant stages
and four seasons each measured once at 390 so a heavy stage or season cannot hide.

**An extra that breaks the budget is simplified first and dropped second**, and either way it is
named in the *Log* with its numbers and reported to Hanna. The budget is never widened.

**What she sees** (screenshots in `docs/tasks/T-0053-screens/`, local dev server, no backend,
G-0019, clock pinned per shot): per the UX designer's list under *Design*.

**From the design** (added by the UX designer; details under *Design*):

- The four toggles sit in **one** `room-row` labelled **Your room**, between *Books* and
  *Decorations*, as four `.room-toggle` checkboxes labelled **Reading corner**, **Day & night**,
  **Growing plant**, **Seasonal decorations**, all ticked on a fresh device. At 360 × 800 the
  group is visible and the decorations list is still reachable by a short scroll.
- Tab from *Detailed books* reaches the four in order; gold focus ring, Space toggles, focus
  stays; a screen reader reads "Your room, group" then "Reading corner, checkbox, checked".
- The 🎨 button's tooltip reads **"Your room: wood, wallpaper, books, room, decorations"**.
- The corner stands on the floor **left** of the bookcase and the plant and the season **right**
  of and in front of it; none of them is ever in front of a book spine, at any zoom, on either
  screen shape, and none hangs in the air.
- At night the spines of 150 books are still readable at 390 × 844 (screenshot 8), the fairy
  lights and the lamp shade glow, and nothing animates on the turn-over.
- With *Day & night* off the room is day at every hour; with an extra off, nothing of it is
  drawn.
- The blanket, flowers and blooms take the accent of the chosen wallpaper, and the panel looks
  the same on lavender and on midnight.

**Hanna** (keeps the task *Doing* with a `Remaining:` line until she confirms): on her own phone
the corner, the plant and the season look right, the evening room is cosy and not too dark, and
the shelf still scrolls smoothly with everything on.

# Notes

- Read first: D-0045 (this task's decision), D-0022 (the room per device, the 🎨 panel, both
  wallpapers), D-0035 and T-0034's *Log* (the shelf's measured budget and the `Detailed books`
  pattern this copies), D-0014 (no hint texts), D-0020 (tokens, the colour test).
- Code: `src/lib/room.ts` (`Room`, `DEFAULT_ROOM`, `cleanRoom`, `shownDecor`),
  `src/components/RoomPanel.tsx` (`useRoom`, the panel's rows),
  `src/components/Decorations.tsx` (`StillDecorations`, `FairyLights`, how a decoration is
  built and placed), `src/components/BookshelfScene.tsx` (`Lights`, `Room`, `Bookcase`,
  `useLite`, where `room` reaches the scene), `src/lib/dashboard.ts` / `src/lib/stats.ts` (how
  books finished this year are counted), `src/styles.css` (`.room-*`).
- New: `src/lib/roomExtras.ts` (`isNight`, `plantStage`, `seasonOf` — the clock is read in one
  place) and the 3D pieces, next to the existing decorations.
- **No code-owned path is touched**: nothing in `.github/`, `netlify*`, `deploy/nas/`,
  `src/lib/shelfMerge.ts`, `src/server/shelf.ts` or `.claude/`. No `Book` field and no server
  change; the settings live only in this browser: group 1 of the guardrails.
- Switching a toggle must free what it built (the existing dispose effects), the way T-0034
  requires of *Detailed books*: the tester toggles each ten times and checks the live WebGL
  buffer and texture counts come back.
- Built together with T-0051 and T-0052 on branch `shelf-and-room`, one pull request.

## Choices made by the team

1. **Four separate toggles**, not entries in the decorations list: these stand on the floor and
   need no shelf or order.
2. **Night is 19:00–07:00 by the device's clock.** A real dusk would need her location or an
   outside service; a fixed hour needs neither and is right for her evening reading.
3. **Four seasonal bands instead of her three months**, so the toggle always shows something —
   her pumpkins, tree and flowers keep their months, and summer and deep winter get one each.
   This is the one place the team went beyond the brief; question 2 below asks her.
4. **No extra light on a phone, ever**, day or night: a light costs work on every pixel
   (T-0003).
5. **The plant's steps are 0 / 1–4 / 5–14 / 15–29 / 30+** of this year's finishes, so her shelf
   shows movement early in a year and still has somewhere to go.
6. **Size: full.** Four new settings, new scenery and a change to the room's lighting.

## Questions to put to Hanna

1. "Your room now gets dark in the evening, from 7 in the evening to 7 in the morning. Is that
   the right time, or would you like it later?"
2. "You asked for pumpkins in October, a tree in December and flowers in spring. We spread them
   over the whole year so the switch always shows something: pumpkins September–November, the
   tree December–February, flowers March–May and sunflowers in the summer. Keep that, or only
   your three?"
3. "All four start switched on. Would you rather pick them yourself from off?"

# Design

(UX designer, before the build. Tokens from D-0020, no hint texts (D-0014).)

## 1. The four toggles in the 🎨 panel

The panel's rows become: Wood · Wallpaper · Books · **Your room** · Decorations · Reset/Done.
The four new toggles share **one `room-row` labelled "Your room"**, directly under *Books* and
above *Decorations*:

```
Your room                              ← muted small heading, like "Wood" / "Books"
[✓] Reading corner
[✓] Day & night
[✓] Growing plant
[✓] Seasonal decorations
```

- Each is the panel's existing `.room-toggle` (native checkbox + label, 44 px row, gold tick
  from `accent-color`), exactly as *Detailed books* and the decorations already are. No new
  component, no new colours, no slider switches.
- **One group, not four rows.** Four separate `room-row`s with four headings would push the
  decorations list off a 360 × 800 phone; grouped, the four checkboxes take about 176 px and the
  decorations are still reachable by a short scroll. The group's heading **Your room** is the
  panel's own title, which is what these four are: the room around the bookcase, as against the
  bookcase (*Wood*), the walls (*Wallpaper*) and the books (*Books*).
- **Words:** heading **Your room**; labels **Reading corner**, **Day & night**, **Growing
  plant**, **Seasonal decorations**. Plain, hers, and each says what appears. No counts, no
  season name in the label, no "(evening)" — the room shows it.
- **Keyboard:** Tab from *Detailed books* reaches the four in order, then the decorations. Gold
  focus ring, Space toggles, focus stays. A screen reader reads "Your room, group", then
  "Reading corner, checkbox, checked".
- Each tick changes the room behind the panel **at once**, like the wood. *Reset* ticks all four.

## 2. The reading corner

- A low armchair in the room's cream and wood tones, a folded blanket over its near arm in the
  wallpaper's accent (lavender or deep blue, following `room.wallpaper` as the only colour it
  takes from her choices), and a slim floor lamp standing behind the chair's far shoulder.
- **Where:** on the floor to the **left** of the bookcase, turned about 25° towards it, its far
  edge inside the wall. Left, because the zoom buttons, the ‹ › pan buttons and the 🎨 button
  all sit on the right, and the shelf creature (T-0033) has the right-hand end of the top shelf.
- **It is never in front of a book.** At every zoom on both screen shapes the chair stays clear
  of the case's front face; on a portrait phone, where the camera is close and framed on the
  case, most of it is off-screen, and that is fine: she sees the lamp's glow and the corner of
  the chair when she zooms out.
- The lamp's shade is lit from inside at night (emissive) and plain by day.

## 3. Day & night

- **Day** is today's room, unchanged: nobody should see a difference at noon.
- **Night** (19:00–07:00): the hemisphere and ambient light come down to roughly a third and
  warm, the key light dims and warms, so the wallpaper darkens and the bookcase keeps a soft
  pool of light. The books' spines must stay **readable** — this is a cosy evening, not a dark
  room. The fairy lights and the lamp's shade glow.
- On a **computer**, with the reading corner on, one small warm light sits at the lamp so the
  chair and the floor near it are lit. On a **phone**, never (D-0045 §3).
- Nothing animates on the turn-over: she looks at 19:00 and it is evening. No fade, no clock.
- With *Day & night* off the room is always day, whatever the hour.

## 4. The growing plant

- A terracotta pot on the floor on the **right** of the bookcase, in front of its side panel,
  small enough that it never covers a book or the ‹ › buttons.
- Five steps, all the same pot: **sprout** (two little leaves), **small** (a short stem with a
  few leaves), **medium** (taller, fuller), **full** (a leafy plant as tall as the pot is wide,
  times three), **flowering** (the full plant with a handful of small accent-coloured blooms).
- It never shrinks within a year; on 1 January it is a sprout again, which is right: it is this
  year's reading.

## 5. The season's decorations

- They stand on the **floor in front of the bookcase's feet**, spread along it, low enough to be
  under the bottom shelf's books and never in front of a spine.
- **Sep–Nov** two or three pumpkins of different sizes; **Dec–Feb** a small tree with warm
  lights (emissive, like the fairy lights, no extra light source); **Mar–May** a few potted
  flowers in the accent colour; **Jun–Aug** a jug of sunflowers.
- Nothing is said about which season it is anywhere in the app (D-0014); she sees it.

## 6. Both wallpapers, small screens

- Everything stands in the room, so it is drawn against the wallpaper she chose; the blanket,
  flowers and blooms take the accent of that wallpaper so neither looks pasted on. The panel's
  own rows are `--surface-solid` on both, like the rest of it, and `colours.test.ts` is
  unchanged.
- On a portrait phone the camera frames the case, so the extras are mostly at the edges; at zoom
  1 on a computer the whole corner, plant and season are in view. Neither must be cut in a way
  that looks broken — a half-chair at the frame's edge is fine, a chair hanging in the air is
  not.
- The 🎨 button's tooltip becomes **"Your room: wood, wallpaper, books, room, decorations"**.

## 7. Screenshots (into `docs/tasks/T-0053-screens/`)

Clock pinned per shot.

| # | Width | Wallpaper | What |
|---|---|---|---|
| 1 | 390, 1280 | lavender, midnight | All four on, 13:00, September: corner, plant, pumpkins |
| 2 | 1280 | lavender, midnight | The same at 21:00 (night), lamp and fairy lights glowing |
| 3 | 1280 | lavender | All four off, 21:00, for the side by side with 2 |
| 4 | 1280 | lavender | The four seasons in one montage (Oct, Dec, Apr, Jul), day |
| 5 | 1280 | lavender | The five plant steps in one montage (0, 2, 8, 20, 40 books this year) |
| 6 | 390, 360 | lavender | 🎨 panel open with the *Your room* group, and the decorations still reachable |
| 7 | 390 | lavender | Keyboard focus on `Day & night` (gold ring) |
| 8 | 390 | lavender | Night with 150 books: the spines still readable |

## Review after building (2026-11-23)

(UX designer. Looked at all 20 shots in `T-0053-screens/`, compared day against night and
all-on against all-off, and read the placement code.)

**Verdict: matches the design where the room allows it. One difference I am accepting and
recording as a correction to my own design; nothing must be fixed before the tester.**

**What matches.**
- The **Your room** group sits between *Books* and the decorations, with the four toggles in
  her words, all ticked on a fresh device (rows 6, at 390 and 360). Focus ring on *Day & night*
  (row 7).
- **Day and night** is right (rows 1, 2, 3, 8). At 21:00 the room is a warm, dim evening: the
  wallpaper darkens, the lamp's shade glows, the fairy lights stand out, and the **spines are
  still readable** — at 390 with 150 books (row 8) I can read every title on the shelf, which
  was the line I would have sent the build back over. All four off at 21:00 (row 3) is today's
  bright room, so the difference is clearly the switch and not something else. Nothing animates
  on the turn-over.
- The **plant** grows through its five steps (row 5: a two-leaf sprout at 0, then small, medium,
  full, and flowering with its accent-coloured blooms at 40) and is never an empty pot.
- The **season** changes with the month and always shows something (row 4: three pumpkins in
  October, a little tree with baubles and a star in December, potted flowers in April, a jug of
  sunflowers in July).
- Both wallpapers look the same in the panel, and the blanket, flowers and blooms take the
  accent of the wallpaper she chose (rows 1, 2 on lavender and on midnight).
- **Nothing covers a spine**, in any season, at any plant step, day or night, at 390 or 1280. I
  checked each of the nine scenery shots for this specifically. Nothing hangs in the air.

**Difference — where the corner and the season stand. My design asked for the impossible, and
the developer was right to say so.** I wrote that the season's pieces stand "in front of the
bookcase's feet … low enough to be under the bottom shelf's books". There is nothing under the
bottom shelf: it is 3 cm above the floor. And the camera frames the whole case with only a hand's
width of floor beyond each side, so a 56 cm chair cannot stand beside the case and be seen at
all. What is built — the corner tucked against the case's left shoulder with its lamp where it
can be seen and the chair's arm, back and blanket coming into the frame; the plant at the right
foot; the season's pieces low on the strip of floor in **front of** the right foot — reads as a
cosy room and keeps the one rule that matters (never in front of a spine). **I am correcting the
design to what is built.**

**One roughness I am letting through, with a note for Hanna.** The chair is plain next to the
koala and the cat: flat panels in one brown, with the blanket as a small block. It reads as "a
chair with a blanket" and nothing more. It is honest low-poly and it is in frame, so it does not
block the task; but if Hanna says it looks like a cardboard box, that is a small follow-up on its
shapes and colours, not a rebuild. Worth asking her in the same breath as the other questions.

**For the tester:** all four on at once on a phone; the turn-over across 19:00 and across
midnight; the plant with 0 books finished this year; each season; toggling each one ten times and
checking the live WebGL counts come back; and *Detailed books* off with all four extras on.

# Test

(Tester.)

# Log

- 2026-11-23 architect: wrote the task from Hanna's backlog item 3 and recorded **D-0045** (four
  toggles per device, 19:00–07:00 night by the device's clock, five plant steps from this
  year's finishes, four seasonal bands, and the phone budget of +10 draw calls and +0.5 MB of
  geometry with no extra light, under which an extra is simplified and then dropped). Size:
  **full**. Three questions for Hanna, none blocking; the seasonal bands are the one place the
  team went beyond the brief. Handed to the **UX designer**.
- 2026-11-23 ux-designer: designed. The four toggles share **one** room-row labelled **Your
  room**, between *Books* and *Decorations*, as four of the panel's existing checkboxes — four
  separate rows would push the decorations off a 360 x 800 phone. Placed the corner left of the
  bookcase (the right-hand side belongs to the zoom, pan and room buttons and the shelf creature)
  and the plant and the season right of and in front of it, never in front of a spine. Night is a
  warm dim evening in which 150 spines stay readable, with no animation on the turn-over. Eight
  screenshot rows with the clock pinned. Added the design's checks to *Done when*. Handed to the
  **developer**.
- 2026-11-23 developer: built, with T-0051 and T-0052 on `shelf-and-room`, one pull request.
  **The settings:** four booleans on `Room` (`readingCorner`, `dayNight`, `plant`, `seasonal`),
  each read with the same `!== false` rule as `detailedBooks`, so every room saved before them
  loads with all four on; `ROOM_EXTRAS` holds their order and words, and the panel renders them
  as four of its own `.room-toggle` checkboxes in one group. They are **not** in `room.decor`,
  so no decoration loses a shelf.
  **The clock:** `src/lib/roomExtras.ts` owns `isNight` (19:00–07:00, midnight stays night),
  `plantStage` (five steps from this year's finish days), `seasonOf` (four bands covering every
  month), `roomLight` (how far the day's light comes down) and `lampLightOn` (the one extra
  light, never on a phone). `useRoomClock` in the scene re-reads it every minute and only while
  an extra that needs it is on; nothing in the 3D decides for itself whether it is night.
  **The scenery:** `src/components/RoomExtras.tsx` builds each prop as **one merged geometry
  per material** (a chair, a blanket, a lamp pole, a lamp shade, a pot, its foliage, its blooms,
  a season's body and its trim), with the room's existing plain materials and **no new
  textures**. The lamp shade and the fairy lights glow by emissive, which costs no light.
  **Where they stand — the one place this differs from the design.** The design put the
  season's pieces "on the floor in front of the bookcase's feet, low enough to be under the
  bottom shelf's books". There is no room under the bottom shelf: it is 3 cm above the floor.
  And the camera frames the whole case with only a hand's width of floor beyond each side (at
  1280 the case fills 80 % of the width), so a 56 cm chair cannot stand beside it and be seen.
  What is built instead: the **corner is tucked against the case's left shoulder**, turned
  towards it, with the floor lamp where it can be seen and the chair's near arm, back and
  blanket coming into the frame beside it; the **plant** stands at the right-hand foot; the
  **season's pieces** stand on the strip of floor in **front of** the right-hand foot, and each
  one is short enough (the tree was brought down to 43 cm, the sunflowers to 29 cm) to stay on
  that strip and never cover a spine. The screenshots show it; the UX designer decides.
  **Checks:** `pnpm test` 1783 passed, 22 skipped; `tsc --noEmit` clean; `pnpm run build`
  passes; `harness check` green. New tests: `src/lib/roomExtras.test.ts` (10) and
  `src/components/RoomExtras.test.tsx` (9); `RoomPanel.test.tsx`'s group list gained "Your
  room"; `colours.test.ts` and `styles.test.ts` unchanged and passing.
  **Measured** (`pnpm run measure:shelf`, built app on port 3173, no `POCKETBASE_URL`, no
  `.netlify` link, 150 and 400 demo books, 3 s at rest, the browser's clock pinned to 13:00 and
  to 21:00):

  | 390 × 844, at rest | all four on | all four off | Budget | Result |
  |---|---|---|---|---|
  | Draw calls per frame, 150 books, 13:00 | 90 | 90 | at most +10 | **+0** ✓ |
  | Draw calls per frame, 150 books, 21:00 | 90 | 90 | at most +10 | **+0** ✓ |
  | Draw calls per frame, 400 books, 13:00 | 84 | 84 | at most +10 | **+0** ✓ |
  | Geometry MB, 150 books | 0.798 | 0.798 | at most +0.5 MB | **+0.000** ✓ |
  | Picture MB, 150 books | 22.59 | 22.59 | within 5 % | **0 %** ✓ |
  | Extra lights on a phone, day and night | 0 | 0 | 0 | ✓ |
  | Draw calls behind the Dashboard | 0 | 0 | 0 | ✓ |
  | Contexts lost, 400 books | 0 | 0 | 0 | ✓ |
  | Detailed books off, 150, 21:00 | 89 | 89 | — | ✓ |

  **Every budget met, nothing simplified or dropped for performance.** On a phone the extras
  cost **nothing at all**: the camera frames the case itself, so they fall outside the view and
  are never drawn or uploaded. The real cost shows on a computer, which draws the whole room
  (recorded, not budgeted): **+15 draw calls a frame** (941 vs 926 at 150 books, 2,209 vs 2,199
  at 400) — that is seven or eight meshes over the colour and shadow passes — and **+0.042 MB**
  of geometry, with the picture bytes unchanged to the byte, at 13:00 and at 21:00 alike. Day
  and night cost the same: the evening is a change of light intensity, and the one lamp light a
  computer adds is not a draw call.
  Also measured, not budgeted: each of the five plant steps and each of the four seasons once at
  390 — none of them moves a single number, for the same reason.
  Screenshots: all eight rows of the design's list in `T-0053-screens/` (20 files), the clock
  pinned per shot. At 360 × 800 the *Your room* group opens with its first three toggles in
  view and the fourth a short scroll away, as the design allows.
  Handed to the **UX designer** for review.
- 2026-11-23 ux-designer: reviewed: matches the design where the room allows it, nothing to fix.
  The evening is warm and dim with the spines still readable at 390 with 150 books, the plant
  takes all five steps, every season shows something, and nothing stands in front of a spine. I
  corrected my own design on where the corner and the season stand: the camera leaves only a
  hand's width of floor beside the case and there is nothing under the bottom shelf, so a chair
  cannot stand beside the case as I wrote. One roughness let through with a note for Hanna: the
  chair is plainer than the koala and the cat, and its shapes are a small follow-up if she says
  so. Handed to the **tester**.
