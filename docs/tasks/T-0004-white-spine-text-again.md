---
id: T-0004
title: "Make the text on dark spines white again instead of gold"
description: "#180: since every book became a hardcover, dark spines get gold lettering; put the white lettering back, keeping dark lettering on light spines."
status: Open
depends_on: [T-0001]
decisions: [D-0002]
raised_on: 2026-11-21
done_on: ""
result: []
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

# Notes

- `src/components/textures.ts` (`paintSpine`, `inkFor`, `GOLD`). The gold bands come from the
  same `gilded` flag; keep them unless the designer finds they no longer fit.
- Close #180 from the pull request.

# Design

UX designer: confirm which lettering colour each kind of spine gets before it is built, and
review the screenshots after.

# Test

# Log

- 2026-11-21 architect: Task written from #180; traced the change to `9abdd95` and `698d95a`.
