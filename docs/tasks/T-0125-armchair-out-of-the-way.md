---
id: T-0125
title: "Move the armchair away from the books"
description: "The padded armchair from T-0120 stood in front of the books at the left end of the lower shelves on a computer; it now stands a step further from the case and a little smaller."
status: Doing
size: small
depends_on: [T-0120]
decisions: [D-0045]
raised_on: 2026-11-28
done_on: ""
result: []
---

# Goal

Hanna: "The armchair is creating hard to reach books." The reading corner (D-0045) moves from 0.3 to 0.48 beside the case, turns a little more and is drawn at 0.88 of its size.

# Done when

On a computer the shelf's left end is clear of the chair (screenshot at 1280 × 800 with 150 demo books), and Hanna confirms on the live site.

# Notes

`src/components/RoomExtras.tsx`, the reading corner's group.

# Design

Before: the chair's arm and blanket covered the first spines of the second and third shelves. After: the chair stands clear of the case, lamp beside it.

# Test

- 2026-11-28: screenshot at 1280 × 800: every spine visible; `pnpm test` passed; build ✓.

# Log

- 2026-11-28 developer: moved and shrunk the reading corner.
- 2026-11-28 developer: Remaining: Hanna checks the shelf on her computer.
