---
id: T-0122
title: "Fewer words"
description: "Long sentences across the dashboard, Stats and the bookshop cut down to the point, in the spirit of D-0014."
status: Doing
size: small
depends_on: []
decisions: [D-0014]
raised_on: 2026-11-27
done_on: ""
result: []
---

# Goal

Hanna found some lines too wordy. Each is cut to what she needs to read:

- **Finish by:** the line now ends "about N pages a day".
- **Not enough reading yet:** "A few more reading days for a guess."
- **Want-to-read pile:** "Finish a few books to see how long the pile would take."
- **A paused book:** "Paused:".
- **My ratings, nothing rated:** "No rated books yet."
- **Monthly challenge:** "Pick a book for each month, starting next month."
- **The bookshop's** long explainer is one line.

# Done when

- `pnpm test` passes (tests that look for these words follow them).
- Hanna reads the new lines on the preview and finds them clear.

# Notes

Words only; nothing changes in what is worked out or saved.

# Design

The same blocks with shorter lines.

# Test

The full suite runs locally; see *Log*.

# Log

- 2026-11-28 developer: built on `fix/unfinished-bits`.
- 2026-11-28 tester: `pnpm test`: 220 files passed, 2 skipped; 2809 tests passed, 22 skipped. `tsc --noEmit` clean, `harness check` all ✓, `pnpm run build` ✓. Screenshots of every page at phone and computer size, 13:00 and 21:00, full and empty shelf, looked at. An independent review found three bugs (a pick taken out lost the day's extra coins; More › Bookshop could open the shop later by itself; old layouts kept lone section headings); all three fixed with tests.
- 2026-11-28 developer: Remaining: Hanna checks it on the preview/live site.
