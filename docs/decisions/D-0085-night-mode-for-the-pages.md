---
id: D-0085
title: "Night mode for the pages: dark after dark by default, with Always and Never in the room panel"
description: "A `night: 'auto' | 'on' | 'off'` on Room, kept on this device like the rest of it, puts `data-night` on <html>; `auto` follows the phone's own dark setting, live; the wallpaper behind the pages goes deep warm brown and the white round buttons in the header go dark with light ink, while the cards, which were always dark walnut, are left alone."
status: Accepted
date: 2026-11-26
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [room, phone, colours, accessibility]
---

# Context

Hanna, going to bed on 26 November 2026: *"Going to sleep now. But on night mode"*, and then
*"Make a night mode as well"*.

The app had no night mode. The 3D room has had its own evening since D-0045 (**Day & night**
dims it after dark) and there is a **midnight** wallpaper (D-0022), but those are about the
room; every **page** — the dashboard, Stats, the challenges, the calendar — stayed on the pale
lavender wallpaper at every hour, and the round buttons in the header are white. Reading in bed
meant a bright screen.

What the app did **not** need is a whole dark theme: the cards have always been dark walnut with
cream text. Only the things that are light had to change.

She was asleep, so this was built on her standing instruction to go with the recommended answer.

# Decision

1. **`Room` gains `night: 'auto' | 'on' | 'off'`**, kept in this browser like the rest of the
   room (D-0022). It is never sent anywhere and never touches her books.

2. **`auto` is the default, and follows the phone's own dark setting**
   (`prefers-color-scheme: dark`), live: turn the phone dark and the pages turn with it, with no
   reload. Hanna chose this over the clock when she saw it (26 November 2026): a clock cannot
   know she is in a dark room at four in the afternoon, and this way the app matches everything
   else on her phone. **The 3D room keeps its own evening by the clock** (D-0045, Day & night),
   which she also chose to leave alone.

3. **Her two other choices are `Always` and `Never`**, in the 🎨 room panel above the cosy
   extras, as *Follow my phone · Always · Never*.

4. **It is one attribute on `<html>`** (`data-night="on" | "off"`), like `data-wallpaper`, so
   every page's CSS follows it with no component knowing about it.

5. **What changes**: the wallpaper behind the pages becomes a deep warm brown, the header's haze
   with it, and the white round buttons (the bookcase switch, zoom, pan, search, the account,
   Clear) become dark with light ink. **What does not**: the cards, the text on them, the gold,
   and the 3D room, which has its own evening already.

6. **A room saved before this follows the clock**, like a new one: `cleanRoom` reads anything
   that isn't `on` or `off` as `auto`.

7. **The colours are checked, not eyeballed.** `colours.test.ts` reads the night block out of
   `styles.css` and checks the header text, the helper text, the cards, the gold, and the ink on
   the dark buttons — including over the darkest wood of the bookcase — at 4.5:1 (3:1 for the
   gold), exactly as it does for the midnight wallpaper.

# Rationale

Following the clock by default is the only setting that needs nothing of her: she reads in bed,
and the app knows what time it is. `Always` and `Never` are there because a clock cannot know
she is in a dark room at four in the afternoon, or awake at midnight on a bright train.

Changing only what was light keeps the change small and keeps the app looking like itself. A
full second palette would have been a far bigger change with far more to get wrong.

# Consequences

- The white pill colours become tokens (`--pill-bg`, `--pill-bg-soft`, `--pill-border`,
  `--pill-hover`), so night mode darkens them in one place. Twenty-one rules that hard-coded
  white now read the token.
- `RoomPanel` keeps the hour while `auto` is on, and sets the attribute.
- The night is a look on this device, not a setting on her account: her phone can be dark while
  her laptop is not.
- Because `auto` follows the phone and the room follows the clock, the two can disagree for an
  evening — the pages bright at 21:00 on a phone set to light. That is the price of matching the
  phone, and *Always* is one tap away.
