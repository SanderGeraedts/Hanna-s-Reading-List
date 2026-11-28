---
id: T-0129
title: "List the books missing details, look up what Open Library knows, and go through the rest one by one"
description: "Missing details: back text, genres, country, tropes and characters per book; Open Library finds reviewed before saving; a one-book-at-a-time mode."
status: Doing
size: full
depends_on: []
decisions: [D-0097]
raised_on: 2026-11-28
done_on: ""
result: []
---

# Goal

See D-0097. Built as an in-app tool because Claude may not touch her real shelf.

# Done when

`pnpm exec vitest run src/lib/missingDetails.test.ts src/components/MissingDetails.test.tsx` passes, and Hanna runs Look them up on the live site, saves what she keeps, and goes through a few books one by one.

# Notes

`src/lib/missingDetails.ts`, `src/components/MissingDetails.tsx`, `src/components/MissingWalk.tsx`, `openNextBookOn` in `BookPanel.tsx`, `lookUpGenres`/`lookUpPlaces` exported from `useBookDetails.ts`, the ☰ entry and the computer button in `routes/index.tsx`.

# Design

From the feature chat of 28 November 2026 (D-0097).

# Test

- 2026-11-28: `pnpm test`, `tsc`, `harness check` and the build pass.

# Log

- 2026-11-28 developer: built on `feat/missing-details`.
- 2026-11-28 developer: Remaining: Hanna runs it on the live site.
