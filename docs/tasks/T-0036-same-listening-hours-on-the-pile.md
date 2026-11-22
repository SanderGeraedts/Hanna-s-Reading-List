`---
`id: T-0036
`title: "Make the Want-to-read pile's grey line show the same listening hours as the 🎧 Audiobook line"
`description: "The grey “… pages · … to listen” line in the Want-to-read pile block counts every audiobook on the pile with the 🎧 line's rule (minutes, else pages × 2, else 560), so both show the same hours (D-0036); its pages stay the real page counts of the books she doesn't only listen to."
`status: Doing
`size: small
`depends_on: [T-0023, T-0024]
`decisions: [D-0008, D-0014, D-0030, D-0031, D-0036]
`raised_on: 2026-11-23
`done_on: ""
`result: []
`---
`
`# Goal
`
`Hanna noticed (agreed 2026-11-22) that the **Want-to-read pile** block shows two different
`listening times: the grey line under "N books waiting" says e.g. "3,900 pages · 31 h to listen",
`while 🎧 Audiobook under the switch says "Your audiobooks are 41 h: …". The grey line counts only
`the books she **only** listens to, and only their typed or Storytel length (D-0008's split); the 🎧
`line counts **every** audiobook on the pile, filling in a book without a length (D-0030). She chose:
`**both count every audiobook on the pile**, so they show the same hours. D-0036 records it.
`
`After this task:
`
`- **The hours** in the grey line are exactly the 🎧 line's total: over every want-to-read book with
`  Audiobook or Storytel among its formats (`formatsOf`, so an old Storytel import with only
`  `storytelId` counts), listen-only or not, `audioMinutes(book)` from `src/lib/pileHeight.ts`: its
`  `minutes`, else `pages × 2`, else 560. Written with `formatDuration` as now ("22 h",
`  "32 h", "9 h 20 min").
`- **The pages** don't change: the sum of `pages` over the want-to-read books she doesn't only listen
`  to (`!listenOnly`), real page counts only, no estimate for a book without pages. So a paper book or
`  e-book she also has on Storytel adds its pages **and** its minutes (D-0036 explains why).
`- Everything else in the line stays: "1,234 pages · 22 h to listen", each half only when above 0,
`  muted small text, the whole pile whatever the switch shows (T-0023), regular spaces as now.
`
`## Where
`
`- `wantPile` in `src/lib/insights.ts` (lines ~82–98): today
`  `if (listenOnly(b)) minutes += b.minutes ?? 0; else pages += b.pages ?? 0`. Change only the
`  minutes: add `audioMinutes(b)` for each want-to-read book whose `bookKinds(b)` includes `'audio'`
`  (both already imported from `./pileHeight` in this file); keep the pages branch for
`  `!listenOnly(b)`. Its `books`, `perMonth` and `months` (the All pace line) don't change.
`- `PileCard` in `src/components/DashboardExtras.tsx` (~line 586) shows `pile.pages` and
`  `pile.minutes`; no change expected there. `wantPile` is used only by `PileCard` and its pace line.
`
`# Done when
`
`What Hanna sees, on the dashboard's **Want-to-read pile** block: the grey line's hours are the same
`as the 🎧 Audiobook line's hours, and its pages are what they were. On T-0023's mixed shelf the grey
`line changes from "1,200 pages · 10 h to listen" to **"1,200 pages · 22 h to listen"**, and 🎧
`Audiobook says "Your audiobooks are 22 h: …".
`
`- **Unit tests** in `src/lib/insights.test.ts`:
`  - the existing `wantPile` test ("works out how long the pile would take") passes unchanged:
`    pages 300, minutes 600, perMonth 1, months 2;
`  - one book each, `status: 'want'`: Storytel-only `minutes: 600` → pages 0, minutes 600;
`    Storytel-only with only `pages: 300` → pages 0, minutes 600; Storytel-only with neither →
`    minutes 560; paperback + Storytel `pages: 300, minutes: 720` → pages 300, minutes 720; e-book +
`    audiobook with only `minutes: 600` → pages 0, minutes 600; an old Storytel import (only
`    `storytelId`, no formats) with nothing else → minutes 560; a paperback without pages → pages 0,
`    minutes 0; a book with only Other and `pages: 200` → pages 200, minutes 0;
`  - a read, reading, paused or did-not-finish audiobook adds no minutes and no pages;
`  - T-0023's **mixed shelf** (A paperback 300, B hardcover 300, C e-book 300, D Storytel
`    `pages: 600, minutes: 600`, E paperback + Storytel `pages: 300, minutes: 720`, F only Other, G a
`    read paperback) → pages 1,200, minutes 1,320;
`  - T-0024's **pace shelf** → pages 3,900 (W1–W11, WE, WX), minutes 1,920 (WS1 600, WS2 600, WX
`    720), and All still 15 books, 1.25 a month, 12 months;
`  - on both shelves `wantPile(books).minutes === pileHeights(books).audioMinutes`, and equals the
`    🎧 pace line's `kindPace(books, 'audio').waiting`.
`- **Component tests** in `src/components/PileCard.test.tsx`:
`  - on `mixed()` the grey line's text is exactly "1,200 pages · 22 h to listen", and after pressing
`    🎧 Audiobook the height line's seen text contains `22${nb}h`: the same hours;
`  - pressing Paper, E-book, Audiobook and All doesn't change the grey line (the existing "rest of
`    the block" test keeps passing);
`  - a pile of only one Storytel book without a length shows "9 h 20 min to listen" and no pages
`    half; a pile of only one paperback without pages shows no grey line;
`  - the existing tests that match `/pages · .* to listen/` keep passing.
`- `pnpm test`, `pnpm run build` and `pnpm exec harness check` pass.
`- The UX designer's review after the build: a screenshot of the block on the lavender wallpaper at
`  390 px with All and with 🎧 Audiobook picked, showing the same hours.
`
`# Notes
`
`- Read T-0023 (sections 2 and 5: kinds and `audioMinutes`) and T-0024 (section 2: the 🎧 pace
`  uses the same total). T-0023's last sentence of section 5 ("the Audiobook total can be larger
`  because it fills in books without minutes") no longer holds after this task.
`- **Clash check done by the architect:**
`  - The **All pace line** counts books, not minutes: unchanged and no clash.
`  - The **🎧 pace line** (T-0024) already uses `pileHeights(books).audioMinutes` as its waiting
`    total: after this task it matches the grey line too, so the block shows one listening total.
`  - The **height lines** (All, Paper, E-book) don't show minutes: no clash.
`  - The **motivation part** (T-0014: monthly bars, jars) shows no pile minutes: no clash.
`  - The **statistics** (`periodStats` in `src/lib/stats.ts`, the stats line, the calendar's
`    "… listened", records' "Longest listen") are about **finished** books and keep D-0008's split
`    on purpose (a paper read of a book she also has on Storytel counts once, as pages). They never
`    show the pile, so they don't clash; leave them alone (D-0036, *Guidance*).
`  - `wantPile` is used nowhere else; "to listen" appears only in `PileCard`.
`- The creature tasks T-0027–T-0033 and decisions D-0033–D-0034 live on other branches; whoever
`  merges second runs `pnpm exec harness tasks-index` again.
`
`## Choices made by the team
`
`Hanna wasn't asked anything (night mode). The architect took these:
`
`1. **The hours use exactly the 🎧 line's function** (`audioMinutes`), not a copy, so the two can
`   never drift apart again.
`2. **The pages stay as they are:** real page counts of the books she doesn't only listen to
`   (paper, e-book, also Other or no format), no 280-page estimate and no `minutes ÷ 2`. "Pages"
`   stays a real count, and the number she knows doesn't move.
`3. **A paper or e-book she also has as an audiobook counts in both halves** (its pages and its
`   minutes), as it counts in both 📖 Paper and 🎧 Audiobook under the switch. The two halves are
`   two ways into the pile, not parts that add up.
`4. **The grey line keeps showing the whole pile** under every switch choice (T-0023 unchanged).
`5. **D-0036 is a new decision** rather than an edit: D-0008 and D-0030 are Accepted and stay as
`   they are; D-0036 says D-0030's rule now governs this line's hours.
`6. **Size: small.** A change of one number's rule within an existing block: no new route, data
`   or service. No design before the build; the UX designer reviews after.
`
`## Questions to re-ask Hanna in the morning
`
`1. "The grey line under 'books waiting' now shows the same listening hours as 🎧 Audiobook. A book
`   you have on paper and on Storytel counts in both the pages and the hours. Is that how you want
`   it, or should such a book count only once (for example only as pages)?"
`2. "The pages in that line only count books with a page number filled in; the hours guess 9 h 20 min
`   for an audiobook without a length. Is that fine, or should a book without pages also get a guess?"
`3. Not about the pile, just so you know: "In your reading statistics a book you read on paper but
`   also have on Storytel still counts as pages read, not as listening. Should that stay?"
`
`# Design
`
`Nothing before the build (small). The UX designer's review after the build goes here.
`
`# Build notes
`
`- **The change:** in `wantPile` (`src/lib/insights.ts`) the minutes now add `audioMinutes(b)` for
`  every want-to-read book whose `bookKinds(b)` includes `'audio'`; the pages still add `b.pages ?? 0`
`  for `!listenOnly(b)`. The two are no longer an if/else, so a paper or e-book she also has as an
`  audiobook adds to both (D-0036). `books`, `perMonth` and `months` are untouched; `PileCard` didn't
`  change.
`- **Tests:** a new `describe` in `src/lib/insights.test.ts` (the eight one-book cases, the four
`  non-want statuses, T-0023's mixed shelf with `pileHeights` and `kindPace` equality) and a pace-shelf
`  test next to T-0024's (3,900 pages, 1,920 min, 15 books, 1.25 a month, 12 months, same as
`  `pileHeights(...).audioMinutes` and `kindPace(..., 'audio').waiting`). A new `describe` in
`  `src/components/PileCard.test.tsx`: the mixed shelf's grey line is exactly "1,200 pages · 22 h to
`  listen" before and after pressing 🎧 Audiobook, whose line contains `22${nb}h`; one Storytel book
`  without a length shows "9 h 20 min to listen"; one paperback without pages shows no grey line.
`  Without the change in `insights.ts` 5 of the new tests fail; the existing ones (the "works out how
`  long the pile would take" test, "the rest of the block", the `/pages · .* to listen/` matches) pass
`  unchanged.
`- **Screenshots** (`docs/tasks/T-0036-screens/`, made by `screens.mjs` against `pnpm exec vite dev
`  --port 3148` with no backend, T-0023's mixed shelf seeded in localStorage, lavender wallpaper): the
`  pile block at 390 and 1280, with All and with 🎧 Audiobook picked. `before-*` (this branch before the
`  change) show "1,200 pages · 10 h to listen" next to "Your audiobooks are 22 h"; `after-*` show
`  "1,200 pages · 22 h to listen" next to "Your audiobooks are 22 h". No page errors. The dev server
`  was stopped afterwards.
`
`# Test
`
`# Log
`
`- 2026-11-23 architect: wrote the task from Hanna's choice of 2026-11-22 (night mode, nothing
`  asked); recorded D-0036 (the grey line's hours follow D-0030's `audioMinutes`; pages unchanged,
`  D-0008's split no longer applies to this line). Checked the pace lines, height lines, motivation
`  part and statistics: no other clash. Size: **small**. Handed to the **developer**; the UX
`  designer reviews after the build.
`- 2026-11-23 developer: built it: \`wantPile\`'s minutes are now the sum of \`audioMinutes\` over every
`  want-to-read book with an audio format (listen-only or not), its pages unchanged (real pages of
`  the books she doesn't only listen to); new unit tests in \`insights.test.ts\` and component tests in
`  \`PileCard.test.tsx\` (5 of them fail without the change). Checks: \`pnpm test\` 95 files passed, 1
`  skipped; 940 tests passed, 9 skipped. \`pnpm run build\` built (exit 0). \`tsc --noEmit\` clean.
`  \`pnpm exec harness check\`: tasks 29 with index in step, decisions 37 with index complete, 3
`  overrules valid, engineers 2, generated files current. Screenshots in \`docs/tasks/T-0036-screens/\`
`  (no-backend dev server on port 3148, stopped afterwards): before "1,200 pages · 10 h to listen",
`  after "1,200 pages · 22 h to listen", next to "Your audiobooks are 22 h", at 390 and 1280. Draft PR
`  in \`result\`. Handed to the **UX designer** for the review after the build, then the tester.
