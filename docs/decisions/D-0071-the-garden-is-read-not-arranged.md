---
id: D-0071
title: "The garden is read, not arranged: plants stand in the order she finished the books, pressing one shows its cover, and she can look at one bed, another season, the night, or share the picture"
description: "Sets aside \"she decides where it goes\" (D-0050 §3): a plant is never moved, so plants stand in reading order on every device and the g:p: spots already in the log are left unread, which also retires Tidy and its Undo (D-0068 §1, §2) and the little cover signs (D-0068 §7) — pressing a plant shows one cover instead. The garden also gains a bed at a time for a closer look, a look at any season or after dark that is never saved, and a Share button that photographs the drawing as it stands."
status: Accepted
date: 2026-11-23
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [garden, game]
---

# Context

The garden went live this morning (D-0050 … D-0052) and was improved twice the same day
(D-0068). Hanna then asked for four more things — a closer look, a picture to share, day and
night, and a season she can choose — and, while they were being built, said she does not want
to drag and drop in the garden at all: pressing a plant should show its cover, and then the
little signs beside the plants are not needed either.

Asked whether that meant dropping the drag gesture or dropping moving altogether — and told
that dropping it altogether sets aside the rule she agreed this morning, that **she** decides
where a plant goes (D-0050 §3, which says that rule needs a new decision to change) — she
chose: **no moving at all.** This is that decision.

Two things she asked for this morning fall with it, and she was told so before it was built:
Tidy and its Undo (D-0068 §1, §2) have nothing left to do once plants cannot be moved, and
the cover signs (D-0068 §7) are replaced by one cover shown on demand.

# Decision

1. **A plant is never moved.** Every plant stands on the spot of its own place in the order
   she finished the books, bed by bed. Nothing about where a plant stands is read from her
   choices, so every device shows the same garden with nothing saved. This sets aside "she
   decides where it goes" in D-0050 §3; the rest of §3 — that the **book** decides the kind —
   stands.
2. **The `g:p:<book id>` events already in the log are left alone and no longer read.** A log
   only grows and nothing is ever removed from it (D-0052 §6). Plants she had moved before
   today therefore slide back into reading order. **Garden items are still placed and taken
   away** with a tap, and their `g:i:` keys are read exactly as before: the item strip is
   unchanged.
3. **Pressing a plant shows its cover,** over the garden, with the book's title, its authors,
   what the plant is, and **Open book**. Escape or × closes it. This replaces the signs that
   stood beside recently finished plants and the one for the book being read (D-0068 §7):
   one cover when she asks for it, instead of a row of them standing there. An empty spot is
   no longer a button at all, so only plants are in the way of the keyboard.
4. **Tidy and Undo are gone** (D-0068 §1, §2), along with `movePlant`, `tidyYear` and
   `savedPlants`: with nothing movable, a garden is always in reading order.
5. **One bed at a time.** A garden with more than one bed offers "Whole year" and a chip per
   bed; a bed is drawn as a year garden of its own, so both views draw it unchanged and the
   taps stay lined up. Free zooming and panning were considered and refused: the buttons are
   placed from a fixed projection, and moving the camera is what would knock them out of
   line.
6. **A look at another season or after dark, never saved.** The garden is the real season and
   the real time of day — night is 20:00 to 06:00 by the device's clock — and a "Have a look"
   row switches it. While she is looking at something else the card says so, and **Now** puts
   it back. It is gone when she leaves the tab: it is a look, not a setting. The dashboard's
   block never follows it.
7. **Share a picture.** The Garden tab gets the Share button the challenges have had since
   \#153, but the garden is a drawing rather than a grid of tiles, so it is photographed
   instead: the flat garden's SVG is plain shapes with nothing to fetch, and the 3D garden's
   canvas is read straight off. What she is looking at is what she shares — the season, the
   bed, the night.

# Rationale

A garden she arranges is a garden she has to maintain, and with Tidy doing the arranging in
one tap there was nothing left that moving gave her that reading order did not. Dropping it
removes the only gesture in the garden that could go wrong on a touch screen, removes the
only thing the garden saved about plants, and makes every device agree for free.

A cover on demand beats signs standing in the garden: it shows the book she is curious about
rather than the eight most recent, and it costs one picture instead of eleven.

# Consequences

- Plants she had already moved today go back to reading order the first time she opens this.
- The garden saves nothing about plants at all: the only garden choices left are item slots.
- "Waiting for you", the glow, the search, the catalogue and the item unlocks are untouched.
- The shared picture shows what she is looking at, including a season that is not the real
  one — the heading says which garden it is, not which season, so it cannot claim otherwise.

# Guidance for agents

- Never save a plant's spot, and never read the old `g:p:` keys: the order comes from the
  finishes. Items keep their `g:i:` keys.
- The garden is read, not arranged: a new gesture that moves a plant needs a new decision.
- A closer look is a bed drawn as its own year garden; do not move the camera, or the spot
  buttons stop matching the drawing.
