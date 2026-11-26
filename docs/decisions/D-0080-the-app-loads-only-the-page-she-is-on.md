---
id: D-0080
title: "The app loads only the page she is on, paints the room at the size her screen can show, and lets the fonts out of the way of the first paint"
description: "Every page but the shelf is its own file and the shared pieces leave Dashboard.tsx so it can really split; the light pages are fetched quietly once the shelf is still and the two 3D ones wait for a tap; the room's wood, floor and wallpaper are painted at half on a phone, decided once per visit; the fact lists travel with the pages that show them; and the Google font stylesheet is preloaded rather than blocking."
status: Accepted
date: 2026-11-26
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [performance, phone, bookshelf, dashboard]
---

# Context

Hanna asked for the app to open faster, and said it is the **first opening, especially on her
phone**. T-0098 measured it on `main` at 7266428:

| | gzip | what it is |
|---|---|---|
| `RoomPanel-*.js` | 268 kB | Three.js |
| `routes-*.js` | 255 kB | **the whole app in one file** |
| `index-*.js` | 117 kB | React and the TanStack runtime |

About **640 kB of gzipped JavaScript before the shelf could appear**, and the app file held the
shelf *and* Stats, the garden, the creatures, the challenges, the calendar, the world map and the
wrap-up story. Only one thing in the whole app loaded on demand.

The shelf also made the phone carry **22.6 MB of pictures**, the same with *Detailed books* off,
so it was the room and not the books: the bookcase wood was painted 2048 across and the floor
2048 × 1024, for a screen 390 across.

Her books were never the wait: the shelf is read from this device first and the server's copy
reconciles afterwards.

# Decision

1. **Every page but the shelf is its own file**, loaded when it is first needed (`React.lazy`),
   with `PageWhileLoading` saying "One moment…" while a file is on its way.
   - **The light pages are fetched quietly** once the shelf is up and sitting still
     (`usePrefetchPages`, on the next idle moment or after two seconds): the dashboard first,
     because it is the most likely next tap, then Stats, the challenges and the calendar.
   - **The garden and the creatures den wait for a tap.** They carry their own 3D, they are the
     heavy two, and they already take a moment to draw; fetching them every visit would make her
     phone do that work on the days she doesn't open them. Hanna's choice.
   - **The shared pieces move out of `Dashboard.tsx`** into `components/common.tsx` (`Cover`,
     `monthName`, `WEEKDAYS`, `dayPile`, `mark`, `useNarrow`). The shelf's own Quick update
     imports `Cover`, and that one import dragged the whole dashboard into the first download
     whatever else was done — the build said so: *"dynamically imported … but also statically
     imported by …, dynamic import will not move module into another chunk."*

2. **The room is painted at the size the screen can show** (`lib/roomPictures.ts`): half on a
   phone (a screen whose **shorter** side is 600 px or less, so turning it changes nothing),
   whole on anything bigger. The pictures are painted in the sizes they always had and only the
   canvas underneath is smaller, so every line, fleck and star keeps its proportions.
   **The scale is decided once when the page opens** and kept for that visit: repainting on a
   rotate would stutter the shelf she is looking at to put back detail she would struggle to
   see. Hanna's choice.

3. **The fact lists travel with the pages that show them.** The counting moves to
   `lib/factCount.ts`, so the page can keep her mark up to date (D-0079) without pulling in the
   625 book facts and 212 general ones — 34 kB — which now ride with the dashboard and the
   calendar.

4. **The fonts stop blocking the first paint.** Google's stylesheet is fetched as a `preload`
   and turned into a stylesheet the moment it lands, with a `<noscript>` copy for a browser
   without JavaScript. The faces and `display=swap` are unchanged.

# Rationale

Splitting is the only thing that addresses what she actually feels: she lands on the shelf and
was downloading six other pages to get there. Fetching the light ones afterwards keeps the part
she liked — tapping a tab felt instant — without making her phone carry the 3D pages it may not
open.

Half-size pictures on a phone are not a compromise: at 390 px wide there is nothing on the screen
that can show 2048 px of wood. Deciding once per visit is what keeps it invisible.

# Consequences

- First load after this change: **123 + 103 + 258 = about 484 kB gzipped**, against 640 before —
  about 156 kB off, well past the 60 kB the task asked for. The room's two biggest pictures go
  from about 12 MB to about 3 MB on a phone.
- The first tap on the garden or the den in a visit shows "One moment…" while its file arrives.
- `Dashboard.tsx` no longer exports the shared pieces; everything imports them from
  `components/common.tsx`.
- `lib/facts.ts` re-exports the counting from `lib/factCount.ts`, so every existing caller is
  unchanged.
- Remembering the app between visits (a service worker) is **not** part of this and stays a
  separate question: it is the biggest win for opening it daily and the one that can serve a
  stale version until a reload.
