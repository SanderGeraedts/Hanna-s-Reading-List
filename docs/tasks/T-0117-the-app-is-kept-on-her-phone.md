---
id: T-0117
title: "Keep the app on her phone, so it opens at once and works with no signal"
description: "The service worker is registered on every visit instead of only for the reading reminder; /assets/, /icons/ and /creatures/ are cache-first because their names carry their contents, the page is network-first so a deploy is never held back, and /_serverFn/ and /api/ are never cached."
status: Doing
size: full
depends_on: []
decisions: [D-0006, D-0075, D-0080, D-0089]
raised_on: 2026-11-26
done_on: ""
result: []
---

# Goal

The last and biggest of the loading-speed wins, which Hanna left on the table twice and chose on
26 November: **nothing was kept between visits**, so every opening re-downloaded the whole app.
The service worker existed for the reading reminder (#163) and said so itself: *"no caching, so
the app always loads fresh."* It was also only registered when she turned the reminder on.

Her reason for hesitating was the sting I kept describing — an app that caches itself can serve
yesterday's version until you reload. D-0089 avoids it: only files whose names carry their
contents are kept, and the page itself is always fetched from the network when there is one.

# Done when

- `pnpm test` and `pnpm run build` pass.
- The worker is registered on an ordinary visit, three seconds after the shelf is up, with no
  reminder turned on.
- A second opening fetches the built files from the cache, and the page from the network.
- With the network off, the app still opens and her shelf is there.
- Nothing under `/_serverFn/` or `/api/` is ever answered from a cache.
- On the preview: Hanna opens it twice and says whether the second time is quicker, and that
  what she sees is never out of date.

# Notes

- `public/sw.js` (the caching, beside the reminder it already did), `src/lib/offline.ts` (the
  registration), `src/routes/index.tsx` (three seconds after `loaded`).
- `public/sw.js` is served as a file and never bundled, so it is checked by reading it
  (`offline.test.ts`) rather than by running it.
- The version constant in `public/sw.js` is the way out if a cache ever has to be cleared:
  changing it throws away every old cache on the next visit.

# Design

Nothing to see. The only visible difference is that the app opens quickly the second time, and
opens at all with no signal.

# Test

`pnpm exec vitest run --dir src`: all green (counts in the pull request). `pnpm run build`: built.

`src/lib/offline.test.ts` — the registration asks for `/sw.js`, a browser without a worker or one
that refuses (a private window) carries on; and, by reading `public/sw.js`: her shelf, her
account and the reminder are never cached and the guard runs **before** anything is answered from
a cache; the page is fetched from the network **before** the cache is looked at; only
content-addressed folders are kept; only this origin and only GETs are answered; an older
version's caches are thrown away; and the push and notification handlers are still there.

Remaining: Hanna opens it twice on her phone and says whether the second time is quicker, and
confirms she never sees an out-of-date page.

# Log

- 2026-11-26 architect: chosen by Hanna at last, with the sting designed out (D-0089).
- 2026-11-26 developer: sw.js caching, lib/offline.ts, registered after the shelf is up.
- 2026-11-26 tester: the worker's promises are asserted by reading it; the suite and build pass.
- 2026-11-26 tester: Remaining: Hanna opens it twice on her phone, and checks it is never stale.
