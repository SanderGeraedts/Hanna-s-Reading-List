---
id: D-0089
title: "The app is kept on her phone: the built files are cached, the page is fetched fresh, and it opens with no signal"
description: "The service worker is registered on every visit instead of only for the reading reminder; files under /assets/, /icons/ and /creatures/ are cache-first because their names carry their contents, the page itself is network-first with the cache only as a fallback so a deploy is never held back, and the server functions and API routes are never cached."
status: Accepted
date: 2026-11-26
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [performance, phone, offline]
---

# Context

Hanna asked three times, in different words, for the app to open faster, and each time the
biggest single win was the one thing nobody had done: **nothing was kept between visits**. Every
opening re-downloaded the lot. The service worker existed (#163) but only did the reading
reminder, was only registered when she turned the reminder on, and said so in its own comment:
*"no caching, so the app always loads fresh."*

She left it on the table twice because of the sting I kept describing: an app that caches itself
can serve yesterday's version until you reload. On 26 November she chose it, with the other two
("readability everywhere" and "kinder when something goes wrong") as the night's work.

# Decision

1. **The worker is registered on every visit**, three seconds after the shelf is up
   (`lib/offline.ts`), so it never competes with the shelf for the connection on a first visit.
   A browser that cannot or will not register it carries on exactly as before.

2. **Built files are cache-first.** Everything under `/assets/`, `/icons/` and `/creatures/` is
   built with its contents in its name (`routes-C04cuU7t.js`), so a file never changes meaning:
   once fetched it is good for ever, and a new version of the app asks for different names.

3. **The page is network-first**, with the cached copy used only when the network cannot answer.
   **This is what avoids the sting.** Online she always gets what was deployed; offline the app
   still opens, with the books that live in her own browser.

4. **Her shelf, her account and the reminder are never cached**: anything under `/_serverFn/` or
   `/api/` goes straight to the network, every time. A stale shelf would be worse than no shelf,
   and the merge rules of D-0006 are the server's job.

5. **Only this origin, only GETs**, and a new version of the worker throws away what the old one
   kept.

6. **The reminder keeps working**: the push and notification handlers are untouched.

# Rationale

Network-first for the page is the whole difference between "instant and sometimes stale" and
"instant and always right". It costs one request when she is online — the same request the
browser would have made anyway — and gives her the app on a train.

Caching only content-addressed files means there is no cache to go stale, no version to clear and
no hand-written list of files to keep up to date.

# Consequences

- A second opening is nearly instant: the 484 kB of JavaScript comes off her phone.
- With no signal, the app opens and her shelf is there (it lives in `localStorage`); the sync
  with the server at Sander's home simply waits, as it already does.
- If the worker ever does need clearing, it is one version constant in `public/sw.js`: changing
  it throws away every old cache on the next visit.
- `public/sw.js` is plain JavaScript served as a file, so it is checked by reading it
  (`offline.test.ts`) rather than by running it: the tests assert the promises above.
