---
id: T-0115
title: "Make every page readable, in every look, and keep it that way"
description: "Measure every piece of text on every page against what is behind it, in the lavender and midnight wallpapers and in night mode, at phone and computer size, fix what falls short in styles.css, and hold it with cases in colours.test.ts."
status: Doing
size: full
depends_on: []
decisions: [D-0087, D-0085, D-0022, G-0019]
raised_on: 2026-11-26
done_on: ""
result: []
---

# Goal

The shelf's text was measured and fixed on 24 November (T-0096). The **dashboard, Stats,
Challenges, Calendar, Creatures and Garden** pages never were, and night mode (D-0085) has since
changed the wallpaper behind all of them. So there could be faint text in three different looks.

This task measures all of it properly, fixes what falls short, and leaves behind both the
measuring script and test cases, so it cannot quietly come back.

# Done when

1. `scripts/measure-contrast.mjs` exists and, run against the dev server, reports **no piece of
   text under the bar** (4.5:1; 3:1 for 24px+, 19px+ bold, icons and outlines) on the shelf,
   dashboard, Stats, Challenges, Calendar, Creatures and Garden pages, in the lavender
   wallpaper, the midnight wallpaper and night mode, at 390×844 and 1440×900 — except the two
   exempt kinds named in D-0087 (a deliberately dimmed **disabled** control, and text kept
   readable by a **halo** since T-0096), which it marks `[disabled]` and `[halo]`.
2. `pnpm exec vitest run --dir src` and `pnpm run build` pass, with new cases in
   `src/lib/colours.test.ts` for everything fixed.

# Notes

- Only `src/styles.css` changes in the app: tokens and rules, not components, and not the look.
- The script seeds a demo shelf in `localStorage` and never signs in (G-0019).
- `pnpm run preview` does not serve this app (it answers 500); the sweep runs against
  `pnpm run dev`, and takes the address from `URL` because the dev server picks another port
  when 3000 is taken.

# Design

Nothing is redesigned. Every change is the smallest one that makes a colour readable:

- cards a little denser, so a pale wallpaper behind a page no longer lightens them;
- an empty star and an unlit pepper visible instead of nearly invisible;
- a calendar day that cannot be opened keeps its date at full strength and only stops being a
  button;
- the garden's year and bed switches and its search box get the card's own dark fill, because
  they stand straight on the wallpaper;
- the hint inside an empty box is the card's quiet cream instead of the browser's grey;
- the ☰ menu's helper text is the card's cream, not the header's plum;
- the bookcase switch gets its white pill back, which it had lost to rule order.

# Test

The sweep, before and after, with `pnpm run dev` on port 3002:

```
URL=http://localhost:3002 pnpm run measure:contrast
```

Before: **452 of 5967** measurements under the bar, over 15 distinct pieces of text.

After: **10 of 5973** — and all ten are exempt by D-0087:

```
  1.1:1 (needs 4.5) lavender  shelf   phone    [halo] rgb(84, 69, 106) on rgb(75, 68, 65)   … label.sort > span.muted  "Genre"
 1.32:1 (needs 4.5) lavender  shelf   desktop  [halo] rgb(84, 69, 106) on rgb(98, 93, 91)   … label.sort > span.muted  "Genre"
 4.49:1 (needs 4.5) lavender  garden  phone    [disabled] rgb(154, 145, 133) on rgb(52, 42, 37)  … span.btn  "Seed tray · in spring"
```

What was fixed, worst first (page · look · before → after):

| Page | Look | What | Before | After |
| --- | --- | --- | --- | --- |
| Garden | lavender | the year and bed switches, straight on the wallpaper | 1.23:1 | 8.87:1 |
| Garden | lavender / midnight / night | the hint in the search box | 1.86 / 2.95 / 3.84:1 | 6.64 / 7.17 / 7.25:1 |
| Shelf | lavender, midnight | an unchosen bookcase on the switch (its white pill was gone) | 1.87 / 1.95:1 | 8.02 / 7.39:1 |
| Shelf | lavender | the ☰ menu's "Arrange by" and its reminder line | 1.92:1 | 5.85 / 7.25:1 |
| Dashboard | all three | an empty star, an unlit pepper (icons, 3:1) | 1.77 / 2.04:1 | 3.89 / 3.77:1 |
| Dashboard, Calendar | all three | the date of a day with nothing on it | 2.71 / 3.17 / 3.23:1 | 5.67 / 6.14 / 6.20:1 |
| Dashboard, Calendar | lavender | the date of a day with books, on its gold wash | 3.91:1 | 4.66:1 |

`pnpm exec vitest run --dir src`: **211 files passed, 2 skipped; 2698 tests passed, 22 skipped.**
`pnpm run build`: passed (`✓ built in 968ms`).
`pnpm exec harness check`: tasks, engineers and generated files green; the one ✗ is
`docs/decisions/index.md` not yet listing D-0087, which is the Engineer's line to add.

# Log

- 2026-11-26 architect: raised from the Requester's standing instruction after night mode
  (D-0085) changed the wallpaper behind every page; recorded D-0087.
- 2026-11-26 developer: wrote `scripts/measure-contrast.mjs`, swept 42 page/look/size
  combinations, fixed seven things in `src/styles.css` and added cases to `colours.test.ts`.
- 2026-11-26 developer: Remaining: the Requester to look at the pages once the change is live —
  the dashboard, the Calendar and the Garden in all three looks — and say whether anything still
  reads faint to her.
