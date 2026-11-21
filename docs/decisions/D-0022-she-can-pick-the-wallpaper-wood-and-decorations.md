---
id: D-0022
title: "Hanna can make the room hers: lavender or midnight-blue wallpaper on every page, five woods, and which decorations stand where"
description: "A 🎨 Room panel by the shelf sets the wallpaper (lavender stripes or midnight blue with gold stars, on every page), the bookcase wood (walnut, honey oak, white-washed, ebony, cherry) and the decorations (on/off, shelf order), per device; the colour check covers both wallpapers."
status: Accepted
date: 2026-11-21
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [look, design-system, bookshelf]
---

# Context

In an improvement round on 2026-11-21 Hanna chose "Make the room yours":

- **The wood** of the bookcase.
- **The wallpaper**, with a midnight blue with little gold stars next to the lavender (her
  Disney-ish night sky, in our own design), on **the whole site**.
- **The decorations:** on/off and their order. She chose a list with ↑↓ over dragging in 3D.
- **Saved per device**, like the dashboard layout, because keeping it on the account would need
  a new field on the server (group 3).
- **A 🎨 Room button** by the shelf's zoom buttons.

D-0020 says every page has *the same lavender* wallpaper. This decision adds a second wallpaper
she can pick. The rest of D-0020 stands: one design system, gold as the one accent, the tokens,
and the contrast test.

# Decision

- **Wallpaper:** lavender stripes (the default) or midnight blue with gold stars. It's always the
  same on every page, as D-0020 says, only now her choice. It's set as
  `html[data-wallpaper='midnight']`, which overrides only the wallpaper tokens (`--wall-*`,
  `--header-ink`, `--header-muted`, `--header-fade`). The 3D wall paints the same.
- **Wood:** walnut (the default), honey oak, white-washed, dark ebony, or cherry.
- **Decorations:** each on or off, in her order. The first stands on the top shelf, the next one
  shelf lower. Each shelf keeps a spot only for a decoration that's switched on.
- **Saved per device** (`hannas-reading-list:room`). Reset brings back the defaults.
- **Readability:** the white round buttons in the header always have dark text (`--pill-ink`).
  `colours.test.ts` checks both wallpapers: header text, its haze, cards and the header buttons.

# Rationale

These are Hanna's choices for how her room looks. Per device keeps it free of the server. Two
wallpapers, both checked by the colour test, keep D-0020's promise that everything stays readable.

# Consequences

- A new colour pair must pass the colour test on both wallpapers.
- Text that sits straight on the wallpaper uses `--header-ink` / `--header-muted`. Text on a
  white button in the header uses `--pill-ink`.
- Another wallpaper or wood later is a small addition: tokens and a texture palette.
