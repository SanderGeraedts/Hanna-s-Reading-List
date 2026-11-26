---
id: T-0114
title: "Give the pages a night mode, and let the wishlist notice what she bought and what she already has"
description: "A `night` setting on Room puts `data-night` on <html> and darkens the pages and the white header buttons after dark by default; the Wishlist bookcase says how many wishes she bought this month; and a shelf book with the same title as a wish is offered in Waiting for you, asking before anything leaves her list."
status: Doing
size: full
depends_on: []
decisions: [D-0022, D-0045, D-0053, D-0067, D-0074, D-0085, D-0086]
raised_on: 2026-11-26
done_on: ""
result: []
---

# Goal

Three things Hanna asked for on the evening of 26 November 2026, the last two while she was
going to bed:

- *"Can we also add something that says like hey you … wishes this month"* — asked which she
  meant, she chose **the wishes she bought**.
- *"Also a book from Storytel with the same title can remove a book from the wishlist. But ask
  first."*
- *"Going to sleep now. But on night mode"*, then *"Make a night mode as well"*. The app had
  none: the 3D room has had its own evening since D-0045, but every page stayed on the pale
  wallpaper at every hour and the round buttons in the header are white.

She then said to go with the recommended answers while she slept, so every open choice was taken
that way and written down in D-0085 and D-0086.

# Done when

- `pnpm test` and `pnpm run build` pass, and `harness check` is in step.
- Night mode: with `night` on `auto` the pages follow the phone's own dark setting, live, and
  *Always* / *Never* hold it; a room saved before it existed is on `auto`.
- Every colour in night mode is checked by `colours.test.ts`, not by eye.
- The Wishlist bookcase says "You bought 2 of your wishes this month" when she has.
- A shelf book matching a wish is offered in Waiting for you, with Take it off the wishlist and
  Keep it, and "Keep it" is not asked again.
- On the preview: Hanna sees the pages go dark in the evening and finds the switch in the 🎨 room
  panel.

# Notes

- `src/lib/room.ts` (`night`, `NIGHT_MODES`, `isNightNow`), `src/components/RoomPanel.tsx` (the
  switch, the clock and the `data-night` attribute), `src/styles.css` (the `html[data-night='on']`
  block and the new `--pill-*` tokens).
- `src/lib/wishlist.ts` (`boughtThisMonth`, `boughtText`, `wasWished` in `boughtPatch`),
  `src/lib/wishFulfilled.ts`, `src/components/WaitingCard.tsx`.
- Nothing new is saved on the server: the night is a look on this device (D-0022) and the
  "keep it" rides the choice log's existing `place` route.

# Design

**Night mode**: the wallpaper behind the pages becomes a deep warm brown and the white round
buttons go dark with light ink. The cards, which were always dark walnut with cream text, are
left exactly as they are, and so is the 3D room, which dims itself by the clock. The switch is
*Follow my phone · Always · Never* in the 🎨 room panel, above the cosy extras.

**The wishlist**: its count line gains "· You bought 2 of your wishes this month" when there is
something to say. The question in Waiting for you is one line and two buttons, never a pop-up.

# Test

`pnpm test`: 211 files, 2668 tests passed (22 skipped), together with the garden (T-0112) and
the bookshop (T-0113) in the same pull request. `pnpm run build`: built. `harness check`: in step.

- `src/lib/room.test.ts` — `auto` follows the phone's dark setting, `on` and `off` hold it
  whatever the phone says, the three choices read in her words, and a room saved before it
  existed (or with nonsense in the field) comes back on `auto`.
- `src/lib/colours.test.ts` — ten new cases read the night block out of `styles.css`: the header
  text and helper text on the pages and on the band, the cards, the gold, and the ink on the dark
  buttons including over the darkest wood of the bookcase.
- `src/lib/wishlist.test.ts` — the month's count, that it says nothing in a month with none, that
  a book never on the wishlist and a wish still on it are left out, that `boughtPatch` marks it,
  and that wishes bought before this are not counted.
- `src/lib/wishFulfilled.test.ts` — the match on title and author, capitals and punctuation
  ignored, a different author left alone, the title alone when one has no author, never wish
  against wish, oldest first, "Keep it" remembered and only for that wish, and the wording.

Looked at it running at 430 × 932: the dashboard, the shelf and the garden in night mode. Two
things were wrong on the screenshot and fixed: the seven page tabs were still bright white
circles (they hard-coded their own white, now the same token as the other pills), and the mist
over the night garden was heavy enough to hide the plants (halved).

Remaining: Hanna sees the pages follow her phone, and says whether that is right for her.

# Log

- 2026-11-26 architect: raised by Hanna in the evening; she asked for the recommended answer on
  every open choice while she slept. D-0085 and D-0086 recorded.
- 2026-11-26 developer: the night tokens and the room switch; the bought-wish mark and the
  Waiting for you question.
- 2026-11-26 tester: ran the suite, the build and the colour check; looked at three pages at
  430 × 932 and fixed the bright page tabs and the heavy mist.
- 2026-11-26 developer: first built on the clock (20:00–06:00); Hanna saw it and chose the phone's
  own dark setting instead, so `isNightNow` takes that and the room panel follows it live.
- 2026-11-26 tester: Remaining: Hanna sees the pages follow her phone.
