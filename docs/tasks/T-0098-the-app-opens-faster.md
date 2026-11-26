---
id: T-0098
title: "Make the app open faster: load only the page she is on, and paint the room at the size a phone can show"
description: "The shelf page downloads every other page with it (one 255 kB app file) and the room's wood, floor and wallpaper are painted at up to 2048 px for a 390 px screen (22.6 MB of pictures); split the other pages out of the first download with React.lazy, and size the room's pictures to the device."
status: Doing
size: full
depends_on: []
decisions: [D-0002, D-0022, D-0035, D-0080]
raised_on: 2026-11-24
done_on: ""
result: []
---

# Goal

Hanna asked (24 November 2026) to make the page load faster, and said two things feel slow:
**opening the app fresh, especially on her phone**, and **the shelf itself** once it is open.
She asked for this to be built another day; everything below is the measuring already done, so
the next session starts from numbers and not from guesses.

# What was measured, and when

On 2026-11-24, on `main` at 7266428, with `pnpm run build` and the browser.

**What the first visit downloads** (gzipped, from the build output):

| | gzip | raw | what it is |
|---|---|---|---|
| `RoomPanel-*.js` | 268 kB | 1006 kB | Three.js |
| `routes-*.js` | 255 kB | 773 kB | **the whole app in one file** |
| `index-*.js` | 117 kB | 359 kB | React and the TanStack runtime |
| `styles-*.css` | 21 kB | 113 kB | the stylesheet |
| `countries-110m-*.js` | 40 kB | 108 kB | already loaded on demand, not on the first visit |

About **640 kB of gzipped JavaScript before the shelf can appear**. The `routes` file holds the
shelf *and* the Stats page, the garden, the creatures, the challenges, the calendar, the world
map and the year wrap-up story: checked by grepping the built chunk for "Year in review",
"Where your books are set", "Stats" and the garden's own strings. Only one thing in the whole
app is loaded on demand today (`world-atlas` in `PictureBlocks.tsx`).

**Her books are not the wait.** `library.ts`'s first effect reads this device's copy from
`localStorage` and shows it at once; `loadShelf()` (the server at Sander's home) runs after and
reconciles. So the wait she feels is code, not data.

**What the shelf costs to draw**, `pnpm exec node scripts/measure-shelf.mjs --url=… --books=150,400
--views=phone --detailed=on,off --seconds=3`:

| books | detailed | draws/frame | pictures | geometry | draws behind the Dashboard |
|---|---|---|---|---|---|
| 150 | on | 90 | 22.59 MB | 0.80 MB | 0 |
| 150 | off | 89 | 22.59 MB | 0.53 MB | 0 |
| 400 | on | 84 | 21.96 MB | 0.83 MB | 0 |
| 400 | off | 83 | 21.96 MB | 0.52 MB | 0 |

Every budget in T-0034 still holds (on ≤ 1.25 × off, pictures equal, geometry ≤ 2 MB, nothing
drawn behind the Dashboard). What stands out is the **absolute** picture cost: 22.6 MB, the same
with *Detailed books* off, so it is the **room** and not the books. `src/components/textures.ts`
paints the wood at 2048 × 512, the floor at 2048 × 1024 and a wallpaper repeat 1024–2048 tall,
for a screen 390 px wide.

Frame rate was **not** measured and must not be guessed from these runs: headless Chromium draws
without a graphics chip, so its frames-per-second says nothing about her phone.

# Done when

- The shelf page's first download drops by at least 60 kB gzipped, shown by the sizes
  `pnpm run build` prints before and after, with the Stats, garden, creatures, calendar,
  challenges and wrap-up code in files of their own.
- The room's picture bytes on a phone drop by at least a third, shown by
  `scripts/measure-shelf.mjs` at 390 × 844 before and after, with every T-0034 budget still met
  and no lost context at 400 books.
- The shelf, the room and every page look the same as before on a screenshot at 390 × 844 and
  1440 × 900, on both wallpapers.
- `pnpm test` and `pnpm run build` pass.
- Hanna says on the preview that opening it feels quicker on her phone.

# Notes

- `src/routes/index.tsx` renders every page as a condition on `view`; `React.lazy` plus the
  loading line the shelf already has is the shape of the split. The 3D scene is already behind
  `ClientOnly` and `SafeBookshelf`.
- `src/components/textures.ts`: `woodTexture`, `floorTexture`, the two wallpapers. A smaller
  picture per device must not change the room's look at the size it is shown — check both
  wallpapers and both woods on a screenshot, and keep `WALLPAPER_REPEAT_M` and
  `FLOOR_TILE_METRES` as they are so nothing moves.
- `scripts/measure-load.mjs` (added with this task) reports the files a cold visit fetches and
  when the shelf appears. Its header says what its numbers are worth: `pnpm run preview` answers
  500 for this app and the live site asks for a sign-in, so the byte counts come from the build
  output and only the timings come from the dev server.
- Hanna's answer on how far to go: split the pages **and** size the room's pictures. She did
  **not** take the third option, caching the app's files on her phone between visits (a service
  worker that keeps them): it is the biggest win for someone who opens the app daily, but it can
  serve a stale version until a reload and is hard to clear on a phone, so it stays a separate
  question for another day. `public/sw.js` deliberately caches nothing today (#163).

# Design

Nothing changes that she can see, with one exception to agree in the feature chat before it is
built: the first time she opens another tab in a session it may take a blink, where today it is
instant because it was already downloaded. The shelf keeps its "Building the shelf…" line.

# Test

`pnpm test` and `pnpm run build` pass, and `pnpm exec harness check` is in step.

**What the first visit downloads**, from the sizes `pnpm run build` prints, gzipped:

| | before | after |
|---|---|---|
| Three.js | 268 kB | 258 kB |
| the app in one file | 255 kB | 123 kB |
| React and the runtime | 117 kB | 103 kB |
| **together** | **640 kB** | **484 kB** |

About **156 kB off the first visit**, against the 60 kB this task asked for. The pages are now
files of their own — the dashboard's blocks (33 kB), the den (12 kB), the garden (10 kB), the
challenges (6 kB), the calendar (4 kB), Stats, the search and the tropes — fetched when they are
wanted instead of before the shelf can be drawn.

The dashboard only split once the shared pieces left `Dashboard.tsx`: the build said
"dynamically imported … but also statically imported by …, dynamic import will not move module
into another chunk", because the shelf's own Quick update imports `Cover`. That warning is gone.

**The room's pictures**: `roomPictures.test.ts` checks the rule and the saving — the two biggest
pictures go from about 12 MB to about 3 MB on a phone, a quarter of the bytes, and the scale is
read from the screen's **shorter** side so turning the phone changes nothing, decided once per
visit even when the screen later changes.

**The pages while they arrive**: `PageWhileLoading.test.tsx` checks the "One moment…" line
appears and goes, that nothing is fetched before the shelf is up, that the light pages are asked
for once it is, and that a browser without idle time falls back to a timer.

Tried to break it: the first version of the room pictures scaled the canvas **and** the painting,
which would have made the wood grain and the midnight stars twice as coarse on a phone. Painting
at the old sizes into a smaller canvas (`roomCanvas`) keeps every proportion; a computer gets
scale 1 and is byte-for-byte what it was.

Remaining: Hanna says whether opening it feels quicker on her phone, and that nothing in the
room looks different.

# Log

- 2026-11-24 architect: raised by Hanna ("I want to improve the loading speed of the page"),
  measured, and parked at her request ("do one but not today"). Sized full. The numbers above are
  from `main` at 7266428 and should be taken again before the work starts.
- 2026-11-26 architect: Hanna agreed the brief in a feature chat; the three items plus the fonts.
- 2026-11-26 developer: lazy pages + quiet prefetch, the shared pieces out of Dashboard.tsx, roomPictures, factCount, the font preload.
- 2026-11-26 tester: 640 kB → 484 kB gzipped on the first visit; the room from ~12 MB to ~3 MB on a phone.
- 2026-11-26 tester: Remaining: Hanna says whether it feels quicker on her phone and that the room looks unchanged.
