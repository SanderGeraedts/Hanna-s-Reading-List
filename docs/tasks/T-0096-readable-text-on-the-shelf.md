---
id: T-0096
title: "Make the text on the shelf readable against the room, starting with the bookcase switch"
description: "The bookcase switch's inactive buttons lose their 0.72 opacity and sit on a more solid pill, and the rest of the text that stands on the 3D room (the filter row, the empty line, the count line, the controls over the stage) is checked against the wallpaper and the dark wood in both themes."
status: Doing
size: small
depends_on: []
decisions: [D-0046]
raised_on: 2026-11-24
done_on: ""
result: []
---

# Goal

Hanna: "On the bookshelf page the switch button between the cases is hardly readable", and asked
for all text to be checked against its background. The switch's inactive buttons are
`--pill-ink` at `opacity: 0.72` on a `rgba(255,255,255,0.75)` pill that the 3D room shows
through, so over dark wood there is very little left of them.

# Done when

- `pnpm test` and `pnpm run build` pass.
- Every piece of text that stands on the room reaches at least 4.5:1 against the worst
  background it can sit on, in the light and the dark theme, checked on screenshots of the shelf
  in both themes.
- On the preview: All · Read · To read · Digital · Wishlist are plainly readable on her phone.

# Notes

- `src/styles.css`: `.shelf-cases`, `.topbar .shelf-cases button`, `.topbar .btn.shelf-clear`,
  `.shelf-filters .muted`, `.shelf-none`, and the controls over the stage.
- Only the look changes; no component changes behaviour.

# Design

The pill goes to `rgba(255,255,255,0.92)`, the inactive buttons to full opacity in a readable ink;
the active button keeps the gold fill and `--accent-ink`. Nothing moves or changes size.

# Test

`pnpm test`: 197 files, 2456 tests passed; `pnpm run build`: built.

Measured on the running app, not by eye alone: every piece of visible text on the shelf page
was read out of the browser with its drawn colour and what is behind it (the worst case being
the dark wood of the bookcase), on both wallpapers and at phone (390×844) and computer
(1440×900) size. 34 pieces of text on the phone, 62 on the computer, and **nothing under
4.5:1** except the ‹ › buttons at 4.15:1, which are the *dimmed* pan buttons at the end of the
shelf — a disabled control, where the dimming is the point.

The bookcase switch before: `--pill-ink` at `opacity: 0.72` on a 0.75 white pill, about 3:1
over dark wood. After: `--pill-muted` at full strength on a 0.92 pill, about 9:1. Added to
`src/lib/colours.test.ts` so it cannot slip back, on both wallpapers and over the darkest wood.

Also found while looking: on the midnight wallpaper the filter names wore a **white** halo meant
for the pale wallpaper, which only blurs light letters. They now get a dark halo there.

Remaining: Hanna confirms on her phone that All · Read · To read · Digital · Wishlist are
plainly readable.

# Log

- 2026-11-24 architect: raised by Hanna with #271/#272, sized small.
- 2026-11-24 developer: --pill-muted token, a 0.92 pill for the switch and Clear, and a dark halo for the filter names on midnight.
- 2026-11-24 tester: measured every piece of text on the shelf page in the browser, both wallpapers, phone and computer; only the dimmed pan arrows sit under 4.5:1.
- 2026-11-24 tester: Remaining: Hanna checks on her phone that the bookcase switch reads clearly.
