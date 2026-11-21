---
id: T-0004
title: "Make the text on dark spines white again instead of gold"
description: "#180: since every book became a hardcover, dark spines get gold lettering; put the white lettering back, keeping dark lettering on light spines."
status: Doing
depends_on: [T-0001]
decisions: [D-0002]
raised_on: 2026-11-21
done_on: ""
result: ["https://github.com/SanderGeraedts/Hanna-s-Reading-List/pull/195"]
---

# Goal

Hanna asked in #180: "Change the spine text colour back to white."

What changed: `9abdd95` (#176) gave hardcovers with a darker spine gold lettering
(`paintSpine` in `src/components/textures.ts`: `gilded` → `GOLD` instead of `inkFor(bg)`), and
`698d95a` / #179 made every book a hardcover. Since then every dark spine has gold text, where
it used to be white.

**Assumption:** "back to white" means back to how it was before: white lettering on dark spines.
Light spines keep their dark lettering, because white on a light spine can't be read, and that
was never white. The gold *bands* on dark hardcover spines stay; only the lettering changes. If
Hanna meant something else, this is a one-line revert.

# Done when

- On the pull request's deploy preview, with books with dark covers on the shelf (e.g. search and
  add "Dune" and "The Night Circus"), the title and author on dark spines are white, as on the
  live site before 19 November. Books with light spines still have dark lettering.
- A unit test on the colour choice: for a dark spine colour (e.g. `#1d2a44`) on a hardcover the
  lettering colour is the light ink `inkFor` returns for dark backgrounds (`#f6efe1`, the
  off-white the spines had before), not `GOLD`; for a light spine (e.g. `#f2e6c8`) it is the
  dark ink `#1d1a16`.
- The spine's medal ribbon, bookmark and language tag still show as before.
- `pnpm test` and `pnpm run build` pass; CI is green.
- The UX designer has compared a screenshot of the shelf with one from before `9abdd95`
  (e.g. the deploy preview of #175) and agrees the lettering matches.
- In the after screenshot, the gold bands are still on the dark spines and the deep-gold bands
  on the light ones; the language tag has the same colour as the title; the letters have no
  dark shadow.

# Notes

- `src/components/textures.ts` (`paintSpine`, `inkFor`, `GOLD`). The gold bands come from the
  same `gilded` flag; keep them unless the designer finds they no longer fit.
- Close #180 from the pull request.

# Design

UX designer: confirm which lettering colour each kind of spine gets before it is built, and
review the screenshots after.

## Design (2026-11-21, before the build)

**What is on the shelf today** (`main`, `80c93da`, looked at locally on demo data): every dark
spine has gold lettering (`GOLD` `#dcb767`), and since #179 every *light* spine has deep-gold
lettering too (`DEEP_GOLD` `#7a5a1c`), with a dark shadow under the letters on both. Before
`9abdd95` the lettering came from `inkFor`: off-white on dark spines, near-black on light
ones, with no shadow.

**The lettering colour each kind of spine gets.** Lettering means the title, the author's
surname and the small language tag ("EN") at the top.

| Spine (`inkFor(bg)` decides, as before) | Lettering | Bands at top and bottom |
|---|---|---|
| Dark (inkFor gives the light ink), e.g. navy `#1d2a44`, burgundy, dark green, black | off-white `#f6efe1` | gold `#dcb767`, as now |
| Light (inkFor gives the dark ink), e.g. cream `#f2e6c8`, beige | near-black `#1d1a16` | deep gold `#7a5a1c`, as now |

- **No shadow under the letters**, as before `9abdd95`. That shadow was there to make gold
  look pressed into cloth; under off-white and near-black letters it only blurs them.
- **Kept as they are:** the gold bands (they still look like a hardcover and go well with
  white letters), the sleep-read moon, the medal and its ribbon, the bookmark, the wear, and
  the place and size of the text.
- **Light spines change too**, from deep gold to near-black. The Goal says they "keep" dark
  lettering, but on `main` they have deep gold; near-black is what they had before #176, and
  it is what the unit test in *Done when* expects.
- "White" in #180 means this off-white, the same one the spines had before. Pure `#ffffff`
  would look harsh next to the cream and gold of the room.

**How it should look:** on a navy spine the title reads as clean off-white between two gold
bands; on a cream spine the title is near-black, also between bands. At the phone's zoom level
(390 × 844, whole bookcase) a dark spine's title should be easier to read than it is now in
gold.

**Small screens and accessibility:** spine text is part of the 3D picture, so screen readers
don't read it; the book's name comes from the search and the book panel, which don't change.
Contrast gets better on dark spines (off-white on navy is about 12:1; the gold is about 7:1).
Mid-tone spines get the same choice as before this change. That's a known limit of `inkFor`,
and outside this task.

**Easy to revert:** the change is the lettering colour and the shadow in `paintSpine`; the
bands keep using `gold`.

**Where to look (added 2026-11-21):** the deploy previews show the sign-in screen, so they may
have the production account server's address. Until the Engineer has confirmed they don't, the
review and the tester's screenshots come from a local dev server with no backend (shelf in the
browser) or a local PocketBase, never from signing in or adding books on a deploy preview.

# Test

# Log

- 2026-11-21 architect: Task written from #180; traced the change to `9abdd95` and `698d95a`.
- 2026-11-21 ux-designer: design written. Off-white lettering on dark spines, near-black on
  light ones (today both are gold), with no shadow under the letters. The gold and deep-gold
  bands stay.
- 2026-11-21 developer: built in #195 (draft). `spineColours(bg)` in `textures.ts` gives the
  lettering `inkFor(bg)` (off-white `#f6efe1` on dark, near-black `#1d1a16` on light) and the
  bands gold / deep gold; the shadow under the letters is gone. New `textures.test.ts` (fails
  on `main`: "spineColours is not a function"). `npm test`: "Tests 281 passed (281)";
  `npm run build`: "built in 1.29s". Screenshots before (`main`) and after from a local dev
  server with no backend, at 320, 390 and 1280 px, for the UX designer's review; the medal,
  ribbon, bookmark and language tag show as before.
