---
id: T-0066
title: "Improve the reading garden and suggest books from her shelf for the challenges that offered none"
description: "Tidy with Undo, finding a book across every year, a quiet mark on what is new, cover signs for the last month's reading and for the book she is reading now, forty-four plant kinds, unlocks to three hundred books with four seasonal items and a strip that grows, the 3D trees and ferns joined up again, and up to three books from her own shelf under the world, the seasonal and her own challenges."
status: Doing
size: full
depends_on: [T-0060, T-0061, T-0062, T-0063, T-0064, T-0065]
decisions: [D-0068, D-0069, D-0050, D-0051, D-0052, D-0013, D-0014, D-0025]
raised_on: 2026-11-23
done_on: ""
result: []
---

# Goal

Hanna asked to improve the garden the day it went live, and, while it was being built, for
cover signs on the plants, for the 3D trees whose crowns float above their trunks to be
fixed, and for challenges to suggest books that fit. She chose one big update rather than
five smaller ones. D-0068 and D-0069 record what was decided and the two choices she made
against advice.

# Done when

`pnpm test` and `pnpm run build` pass, and on the preview:

- the Garden tab has **Tidy by reading order**; pressing it sorts the year and offers
  **Undo**, which puts every plant back exactly where it was;
- **Find a book…** finds a book finished in an older year and jumps to that year, ringing
  its plant;
- plants new or grown since the last visit are ringed, and the dashboard block says so;
- books finished in the last month have a little cover sign, and the book being read has one
  on an empty spot;
- the garden items strip shows the new items, a seasonal one only in its season;
- a 3D tree's crown sits on its trunk, with no gap;
- the world, the seasonal and her own challenge cards show up to three books from her shelf
  with the reason each fits, or a line saying nothing fits.

# Notes

- `src/lib/garden/` (`numbers`, `plants`, `garden`, `spots`, `tend`, `find`, `seen`, `signs`),
  `src/components/garden/`, `src/components/GardenPage.tsx`, `src/components/GardenCard.tsx`.
- `src/lib/challengeFits.ts`, `src/components/ChallengeFits.tsx`, `ReadyChallenges.tsx`,
  `OwnChallenges.tsx`, `ChallengesPage.tsx`.
- Nothing in `deploy/nas/`: the garden still saves only spots, through the existing route
  (D-0052). A group-1 change with nothing for Sander.

# Design

The Garden tab keeps its shape. Above the year chips, a search box; under the garden, the
plant count on the left and **Tidy by reading order** (with **Undo** after a tidy) on the
right. A new or grown plant is a quiet ring, gold for new and green for grown, animated only
where motion is welcome; a found plant is a thicker gold ring. A cover sign is a small
wooden board on a post, drawn over the garden so the flat and the 3D views get the same one;
the sign for the book being read has a dashed, empty board, because nothing is planted there
yet. Picked-up plants gain an **Open book** button beside **Put back**.

On the Challenges page, an open world, seasonal or own challenge ends with "On your shelf"
and up to three covers, each under the reason it fits; with nothing matching, one muted line
says what would.

# Test

Written by the tester.

# Log

- 2026-11-23 architect: recorded D-0068 and D-0069 from Hanna's feature chat, where she chose
  one big update, re-matching every existing plant, and more plant kinds over day and night.
- 2026-11-23 developer: built the whole round on one branch; `pnpm test` 2423 passed, 22
  skipped; `pnpm run build` built in 964 ms. Also fixed the floating 3D tree crowns, the
  bare winter branches and the floating fern fronds Hanna reported, and the same smaller gap
  in the flat drawing.
