---
id: D-0020
title: "The look is one design system: cosy library, one warm gold accent, a lavender striped wallpaper on every page, checked for contrast by a test"
description: "Colours, six text sizes, spacing, corners and a 44 px tap size are tokens at the top of styles.css, shown on the unlinked /style page; every page has the same lavender striped wallpaper with gold as the one accent, and colours.test.ts fails when text falls below WCAG contrast."
status: Accepted
date: 2026-11-19
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [look, design-system]
---

# Context

Until 19 November 2026 each block had its own colours and sizes (29 different text sizes). In a
design round Hanna talked through from her own instance:

- #157: step 1, "cosy library, refreshed", one warm gold accent, consistent everywhere: colour
  tokens, five text sizes, five spacing steps, three corner kinds, a 44 px tap size, three button
  kinds, and a style page at `/style` (not linked from the app).
- #159: step 2, every block and panel moved onto the tokens, plus a sixth size (`--fs-tiny`) only
  for dense grids.
- #164: a warm cream striped wallpaper behind the shelf, replacing the periwinkle wall. Replaced the
  same day by:
- #166: the same **lavender** striped wallpaper on every page (purple is her favourite colour),
  **gold accents kept** (her choice), deep plum text on the wallpaper, and an automatic colour check
  (`src/lib/colours.test.ts`) that compares every text colour with what it sits on: 4.5:1 for text,
  3:1 for gold.
- #168: the stripes are the same width on every page.

Recorded as the current state; the cream wallpaper of #164 is history. D-0002 already records that
the app has its own CSS design system rather than Tailwind (it overrules G-0017); this record is
about the look itself. G-0020 says the look is chosen per project; this is that choice.

The bookcase itself (walnut, warm light, hardcover books, decorations; #175, #176, #179) and the
spine lettering (#180, tonight's T-0004: off-white on dark spines again) are details within this
look, not separate decisions.

# Decision

- **One design system,** defined once as tokens at the top of `src/styles.css`: colours (walnut
  surfaces, cream text, one warm gold accent, warning amber, danger red, the `--wall-*` wallpaper
  colours), six text sizes (`--fs-tiny` only for dense grids), spacing steps, three corner kinds and
  a 44 px minimum tap size.
- **Gold is the one accent.** The wallpaper on every page — the shelf, Dashboard, Challenges and
  Calendar — is the same lavender stripe, with deep plum text where text sits straight on it.
- **`/style`** shows every token and building block.
- **The contrast test stays:** a colour change that makes text unreadable fails `colours.test.ts`.

# Rationale

One family of colours and sizes makes the many blocks look like one app and keeps new work
consistent; the lavender and gold are Hanna's choice; the test keeps her choice readable.

# Consequences

- New styles use the tokens, not their own values; a new colour pair is added to the contrast
  test.

# Guidance for agents

- Use the tokens (`--accent*`, `--wall-*`, `--fs-*`, spacing, corners) for every new style; don't
  add one-off colours or text sizes.
- Never weaken or skip `colours.test.ts` to get a colour in; change the colour instead.
- A new accent colour, another wallpaper or a different text-size scale is Hanna's choice: ask her.
