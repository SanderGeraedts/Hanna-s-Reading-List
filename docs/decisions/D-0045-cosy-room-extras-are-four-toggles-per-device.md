---
id: D-0045
title: "The cosy room extras are four more toggles in the 🎨 room panel, kept per device, each cheap enough for her phone"
description: "A reading corner (chair, blanket, floor lamp), day & night (the room dims between 19:00 and 07:00 by the device's own clock, with the lamp and the fairy lights glowing), a plant that grows with the books she finished this year, and seasonal decorations in four bands (pumpkins Sep–Nov, a tree with lights Dec–Feb, flowers Mar–May, sunflowers Jun–Aug) each become a Room field in localStorage like the decorations, all four on by default; together they may add at most 10 draw calls a frame and 0.5 MB of geometry on a phone, and no extra light on a phone, or the extra is simplified or dropped."
status: Accepted
date: 2026-11-23
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [room, bookshelf, performance, phone]
---

# Context

Hanna agreed this in her feature chat of 22 November 2026 (backlog item 3): a reading chair with
a blanket and a floor lamp, day and night (the room darker in the evening, the lamp and the
fairy lights glowing), a plant that grows with the books she finished this year, and seasonal
decorations (pumpkins in October, a tree with lights in December, flowers in spring). Each is a
toggle in the 🎨 room panel, like the decorations, and she asked the team to keep the phone's
performance in mind.

Three things had to be settled.

**Where they are kept.** D-0022 keeps the room on the device
(`hannas-reading-list:room`), because the account would need a field on the server at Sander's
home. These are room settings, so they belong there.

**What "evening" and "this year" mean,** with no server and no account: there is only the
browser's own clock.

**Three of the four stand on the floor,** not on a shelf. The existing decorations are placed by
`computeLayout` on shelves, one per shelf, in her order; a chair, a plant and a Christmas tree
are not shelf decorations and must not take a shelf away from the koala.

**What happens in the months she named nothing for.** She named October, December and spring.
In November, January, February and all summer a *Seasonal decorations* toggle would do nothing
visible, which reads as broken.

# Decision

1. **Four new fields on `Room`** (`src/lib/room.ts`), each a plain boolean kept in
   `localStorage` with the rest of the room, **on by default**, and put back on by *Reset*; a
   saved room without a field counts as **on**, exactly as `detailedBooks` does (D-0035):
   ```ts
   readingCorner: boolean   // chair, blanket and floor lamp
   dayNight: boolean        // the room follows the clock
   plant: boolean           // the plant that grows with her reading
   seasonal: boolean        // the season's decorations
   ```
   They are **their own toggles in the 🎨 panel**, not entries in the decorations list: the
   decorations list is ordered and takes one shelf each, and these stand on the floor.

2. **The reading corner** is a chair with a blanket over its arm and a floor lamp behind it,
   standing on the floor beside the bookcase, out of the camera's way at every zoom and on
   every screen. One toggle for all three, as she asked for them as one thing.

3. **Day & night** follows the **device's own clock**: it is night from **19:00 to 07:00** local
   time, day otherwise, re-checked every minute so it turns over by itself (and so 23:59 → 00:00
   stays night). At night the room's lights come down to a warm, dim evening; the floor lamp's
   shade and the fairy lights glow (they are emissive, so the glow costs no light), and with the
   reading corner on, a computer also gets **one** small warm light at the lamp. **A phone gets
   no extra light, ever**, at any time of day. Nothing animates when it turns over; it is simply
   evening next time she looks.

4. **The plant** stands in a pot on the floor and grows in **five steps** with the books she
   **finished this calendar year** (counted the way the dashboard counts them, from the finish
   days on her books): **0** a sprout, **1–4** small, **5–14** medium, **15–29** full,
   **30 and up** flowering. With 0 books it is a sprout, never an empty pot: the toggle always
   shows something.

5. **Seasonal decorations** cover the whole year in four bands by the device's month, so there
   is always something to see: **September–November pumpkins**, **December–February a little
   tree with lights**, **March–May flowers**, **June–August sunflowers**. Her three named
   months each fall in the band she asked for them in. They stand on the floor with the plant
   and the corner.

6. **The performance rule** (her own condition). Measured with `scripts/measure-shelf.mjs` the
   way T-0034 / D-0035 require, at 390 × 844 with 150 and 400 books, all four extras on against
   all four off:
   - **at most +10 draw calls per frame** and **at most +0.5 MB of geometry**;
   - **picture bytes unchanged within 5 %** (the extras bring no pictures of their own: they are
     painted with the room's existing textures and plain colours);
   - **no extra light on a phone**, day or night;
   - **0 draw calls behind the Dashboard**, as ever.
   An extra that would break this is **simplified first and dropped second**, and either way it
   is said plainly in the task's build notes and told to Hanna. The budget is never widened to
   let an extra in.

7. **The extras are scenery only.** They never move a book, never take a shelf from a
   decoration, never change the case's size or the camera, and are not drawn while another page
   is over the shelf. On a phone they are still (no animation), like the decorations
   (`StillDecorations`).

8. **The app never changes a toggle on her behalf**, and never turns one off because a device
   is slow; it offers the switch, as D-0035 says of *Detailed books*.

# Rationale

Four separate toggles match "each extra is a toggle in the room panel like the decorations",
while keeping them out of the ordered list that assigns shelves, which they do not need.

19:00 is when her evening reading starts and is late enough that a winter afternoon is not
called night; a fixed hour needs no location, no sunset lookup and no outside service, which a
real dusk would.

Four seasonal bands rather than three named months is the one place the team went beyond what
she asked: a toggle that does nothing for five months of the year looks broken. Her three
pictures keep their months, and summer and deep winter get one each.

The budget is written down because it is the part of this she can see go wrong, and because the
shelf already has a measured budget to add to rather than invent.

# Consequences

- `Room` grows by four fields and `cleanRoom` gains four `!== false` reads; every saved room
  still loads, with all four on.
- The 🎨 panel grows by four rows; the UX designer decides where they sit and how the sheet
  still fits a 360 × 800 phone without the decorations being pushed out of reach.
- The scene gains a floor-standing group beside the bookcase, placed from the case's width so
  it never covers a book.
- The lighting is no longer constant: anything that compares a screenshot of the shelf must
  pin the clock, and the colour test keeps checking the two wallpapers, not the night.
- More extras later are more booleans and more pieces in that one floor group, under the same
  budget.

# Guidance for agents

- Read the clock in one place, with the hour and the month taken from the device, and re-read
  it on a timer: nothing in the 3D scene decides for itself whether it is night.
- Build each extra as merged geometry with the room's existing materials; no new textures, no
  per-piece materials, nothing that costs a draw per leaf or per light.
- Never add a light on a phone, and never animate an extra on a phone.
- Measure before and after with `pnpm run measure:shelf` and put both numbers in the task;
  simplify or drop an extra rather than widen the budget, and say which, where she will read it.
- Don't put these in the decorations list, and don't let them reach the account or the server.
