---
id: T-0035
title: "Give the header a band she can read on the Dashboard, Challenges and Calendar, and keep a focused card or button out from under it"
description: "On the page views (Dashboard, Challenges, Calendar) the header gets a solid band in its own --header-fade colour, so cards scrolled under it no longer show through the title, the stats line and the page tabs, on both wallpapers (checked by colours.test.ts); .dashboard gets a scroll-padding-top of the header's height (plus the Arrange bar while arranging), so a card or button scrolled to or focused never lands under the header; the shelf keeps its haze."
status: Open
size: small
depends_on: []
decisions: [D-0014, D-0020, D-0022, G-0031]
raised_on: 2026-11-23
done_on: ""
result: []
---

# Goal

Requester: Hanna, agreed on 2026-11-22 (issue #233, her phone screenshot). Night mode: she
wasn't asked anything more; the team's picks are under *Choices made by the team*, the open
points under *Questions to re-ask Hanna in the morning*. Raised as a follow-up by the UX review
of T-0024.

**What she sees today.** On her phone, as soon as she scrolls the Dashboard, the cards slide
under the header and show through it. The header's background is a haze that fades from 92 %
at the top to 0 % at the bottom (`.topbar` in `src/styles.css`), so the lower half of the
header (the stats line "114 books · 2 reading · …", the round 🔍 ↻ + Add H buttons and the four
round page tabs 📚 📊 🏆 📅) sits on whatever card is underneath. In her screenshot the book
title "Das Zeichen der Athene" runs straight through "Hanna's Reading List", "Paused, waiting to
be picked up again" through the stats line, and "Legendborn / paused at 4 %" between the page
tabs. Dark plum header text on a dark walnut card is unreadable. The same happens on Challenges
and Calendar, which scroll in the same `.dashboard` container, and on the computer as well
(the header floats over the pages at every width).

**What this task delivers.**

1. **A header band on the page views.** While a page (Dashboard, Challenges, Calendar) is shown,
   the header's background is a **solid band** in the header's own colour,
   `rgb(var(--header-fade))` (pale `246, 248, 255` on the lavender wallpaper, deep blue
   `30, 40, 88` on midnight), over the whole height of the header, with a short soft fade
   (about `var(--space-3)`) **below** the band's bottom edge so it doesn't end in a hard line.
   Nothing under the band shows through it. The text, buttons and tabs in the header keep their
   colours (`--header-ink`, `--header-muted`, `--pill-ink`, the gold *+ Add* and active tab).
2. **On the bookshelf nothing changes**: the header keeps today's haze over the 3D room, where
   the wall behind it is the wallpaper itself and the haze is part of the look (D-0020, D-0022).
3. **Focus and scrolling never end under the header.** `.dashboard` (which is the scroll area of
   all three pages) gets `scroll-padding-top` of the header's measured height
   (`var(--header-h)`, set on `.app` by `useHeaderHeight`, with today's `6.5rem` fallback) plus
   `var(--space-3)`. While *Arrange* is on, the sticky Arrange bar (`.dashboard-bar.arranging`,
   T-0020) also sits at the top, so the padding then adds the bar's height, or the developer
   finds an equivalent; a focused block must not hide under the bar either. This covers Tab /
   Shift+Tab, `scrollIntoView` from the dashboard's own code (e.g. Challenges' `focus` to a
   section, the Calendar's month), and a search result scrolled to (WCAG 2.4.11, focus not
   hidden).

How the page views are told apart is the developer's pick: the route already knows `offShelf`
(`src/routes/index.tsx`), so a class on `.app` or `.topbar` (e.g. `.topbar.on-page`) is enough.

# Done when

**Tests (Vitest):**

- `src/lib/colours.test.ts` gets cases for **the header band**, read from the tokens (not
  hard-coded numbers, so a change in `--header-fade` is checked): the band is
  `--header-fade` at the band's opacity, composited over **both black and white** underneath
  (the worst a card, a cover or a white button could put behind it), and must give at least
  4.5:1 for `--header-ink` and `--header-muted`, and 4.5:1 for the white header buttons' text
  (`--pill-ink` on `rgba(255,255,255,0.72)` over the band), on the
  lavender **and** the midnight wallpaper (`mid('header-fade')`). If the developer keeps any
  see-through in the band, its opacity comes from a token and these cases use it; with a solid
  band they pass trivially, which is the point.
- The existing case "header text over the midnight haze" stops hard-coding `[30, 40, 88, 0.92]`
  and reads `--header-fade` from the midnight block (the shelf's haze is still checked).
- A small CSS check next to it (in `colours.test.ts` or a new `src/styles.test.ts`, reading
  `styles.css` like `colours.test.ts` does): the `.dashboard` rule has a `scroll-padding-top`
  that uses `var(--header-h`; the page-view header rule's background uses `--header-fade`.
- `pnpm test`, `pnpm run build` and `tsc --noEmit` pass; CI is green; `src/routeTree.gen.ts`
  unchanged.

**What she sees** (tester, local dev server without a backend, seeded shelf with enough books to
scroll, headless Chrome; screenshots in `docs/tasks/T-0035-screens/`):

- **390 × 844 and 360 × 800, Dashboard, lavender**, scrolled down so a card with text (Currently
  reading, paused books) is under the header: the title, the stats line, the round buttons and
  the page tabs sit on a clean pale band; no card text or cover shows through any of them. The
  band ends in a short soft fade, not a hard line, and the first card starts below it when the
  page is opened, as today (#181).
- The same on **midnight** (🎨 → Midnight): a clean deep-blue band, cream title and stats line.
- The same on **Challenges** and **Calendar**, both wallpapers, at 390 × 844 (four shots), and
  once at **1280 × 800** on the Dashboard (one shot per wallpaper).
- **Bookshelf** at 390 × 844 and 1280 × 800: the header looks exactly as on `main` (the haze,
  no band). Side-by-side with `main`.
- **Focus not hidden**, by a script in the same headless run (390 × 844, then 1280 × 800, on all
  three pages): scroll the page to the bottom, then `focus()` each focusable element inside
  `.dashboard` from the last to the first (as Shift+Tab would), and after each one check
  `el.getBoundingClientRect().top >= header.getBoundingClientRect().bottom` (and, while
  *Arrange* is on, `>=` the Arrange bar's bottom too). Expected: **0 elements under the header**.
  The same script on `main` reports more than 0 (the before). Also by hand once with the
  keyboard: Shift+Tab up the Dashboard, the gold focus ring is always fully visible.
- Challenges opened with a `focus` section (e.g. `?view=challenges&focus=bingo`) and the
  Calendar on another month: the section / month lands fully below the header.
- No horizontal scroll, no console errors, the header height unchanged (the band changes the
  background only, not padding or layout).
- The UX designer has reviewed the screenshots (review after the build: the task is small,
  there is no design before).

**Hanna** (stays *Doing* with a `Remaining:` line until she confirms): on her own phone, after
scrolling the Dashboard, the header reads cleanly, on her wallpaper.

# Notes

- Read first: T-0024's *Design* review (the paragraph "The phone header over the top of the
  card", which raised this), issue #233, #181 (why `.dashboard` starts under `--header-h`),
  T-0020 (the sticky Arrange bar and why its `top` is small), D-0020 (tokens, colours.test.ts),
  D-0022 (both wallpapers, both checked).
- Code: `src/styles.css`: the tokens at the top (`--header-fade`, `--header-ink`,
  `--header-muted`, `--pill-ink`, and the midnight block), `.topbar` (around line 148), the
  phone `.topbar` grid (around line 1534), `.dashboard` (around line 1573),
  `.dashboard-bar.arranging` (around line 1645). `src/routes/index.tsx`: `offShelf`, the
  `<header className="topbar">`, `useHeaderHeight` / `--header-h`. `src/components/Dashboard.tsx`,
  `ChallengesPage.tsx`, `CalendarPage.tsx` all render inside `<div className="dashboard">`, so one
  rule covers the three pages.
- Checked and **not** in scope: the bookshelf (its header stays the haze, see *Choices* 2); the
  sheets and dialogs (`.panel.sheet` has its own sticky grab bar on a solid background and no
  header over it); the round 📖 quick-update button at the bottom left also floats over cards
  (visible in her screenshot), but it is a single button, not text, and nobody asked; noted, not
  done.
- Colours and sizes from the tokens only (D-0020); no new hint text (D-0014). If a new token is
  added (e.g. `--header-band`), it goes in the `:root` block and, if it differs, in the midnight
  block, and the colour check reads it.
- Group 1 (guardrails): only `src/styles.css`, at most a class in `src/routes/index.tsx`, and
  tests. No code-owned path, no change to the books or how they are saved.
- The creature tasks T-0027 to T-0033 live on other branches; whoever merges second runs
  `pnpm exec harness tasks-index` again. The branch is named `t-0036-readable-header` (the name
  `t-0035-…` was already used by T-0034's branch); the task id is T-0035.

## Choices made by the team

Hanna wasn't asked anything (night mode). The architect took these:

1. **A solid band, not a fainter haze or a fade on the dashboard's own top edge.** A haze is
   readable only when what's under it happens to be light; covers and walnut cards are dark, so
   any see-through band fails somewhere. Fading the dashboard's top edge (a mask) would also fade
   the wallpaper and the sticky Arrange bar. The band uses the header's own `--header-fade`
   colour, so it reads as the same header, just no longer see-through.
2. **Only on the pages; the shelf keeps the haze.** On the shelf the thing behind the header is
   the 3D room's wall, which is the wallpaper, so the text reads fine there and the haze is part
   of the room's look. Nobody reported a problem there.
3. **All widths, not only the phone.** The computer has the same overlap when scrolling; one rule
   is simpler and the band looks the same.
4. **A short soft fade under the band** instead of a hard edge, so it still feels like the cosy
   header and not a toolbar. It falls in the gap `.dashboard` already leaves above the first card.
5. **`scroll-padding-top` = the header's real height + a small gap**, from the measured
   `--header-h`, so it follows the header when it wraps or the search chip appears; plus the
   Arrange bar while arranging.
6. **Size: small.** A style change within existing screens: no new route, data or service. No
   design before the build; the UX designer reviews the screenshots after.

## Questions to re-ask Hanna in the morning

1. "When you scroll the Dashboard, Challenges or Calendar, the top bar is now a solid pale band
   (deep blue on midnight) so nothing shows through. Do you like that, or would you rather it
   were a little see-through?"
2. "On the bookshelf the top bar stays see-through, as now. Is that fine there?"

# Design

Nothing before the build (small). The UX designer's review after the build goes here.

# Test

# Log

- 2026-11-23 architect: wrote the task from Hanna's #233 and T-0024's UX follow-up (night mode,
  nothing asked). Checked the Dashboard, Challenges and Calendar (all scroll in `.dashboard`,
  all affected, at every width) and the bookshelf (keeps its haze) and the sheets (not
  affected). No new decision: follows D-0020 and D-0022. Size: **small**. Handed to the
  **developer**; the UX designer reviews after the build.
