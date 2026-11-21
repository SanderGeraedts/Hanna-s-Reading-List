---
id: Q-001
title: "May the app send a reading reminder at 20:00 by web push, with keys on Netlify and a new collection on the NAS?"
description: "Hanna asked (#163) for a phone notification at 20:00 on days without reading, also when the app is closed; draft PR #165 builds it, but it needs VAPID secrets on Netlify, a new PocketBase collection and hook, and a second scheduled function."
status: Open
raised_on: 2026-11-21
raised_by: architect
issue: "https://github.com/SanderGeraedts/Hanna-s-Reading-List/issues/163"
blocks: []
resolved_by: []
tags: [backend, infrastructure, notifications]
---

# Question

Hanna asked in #163 for a notification on her phone at 20:00 on days she hasn't logged any
reading yet, also when the app is closed. Draft PR #165 (labelled `needs-sander`) builds it.
It needs things only the Engineer can do or approve, so it waits:

- **New secrets on Netlify** (production): `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
  `VAPID_SUBJECT`. Changing the private key later means every device turns the reminder on
  again.
- **A new collection on the live database:** `push_subscriptions` (migration
  `1795564800_push_subscriptions.js`, owner-only) and a hook `pb_hooks/reminders.pb.js` behind
  `NIGHTLY_SECRET`. Note that the server code reaches PocketBase through Funnel (D-0003), and
  `deploy/nas/serve.json` has no path for `push_subscriptions` yet, so the NAS's `serve.json`
  probably needs a new path too: a change on the NAS by hand.
- **A second scheduled function** on Netlify (`netlify/functions/reading-reminder.mts`).
- **A new outside dependency in practice:** the browsers' push services (Apple, Google,
  Mozilla). iPhones only allow it for an app added to the home screen. If they change how web
  push works, it needs fixing.
- A web manifest and a service worker in the app (no caching).

It costs no money, but it adds secrets, a collection and a scheduled job that the Engineer
keeps running.

# Options

1. **Yes, as built in #165.** The Engineer makes the keys, sets them on Netlify, adds the
   `serve.json` path on the NAS if needed, and the team finishes, tests and merges #165.
   Hanna gets what she asked for.
2. **No push; an in-app note instead.** After 20:00, a "No reading logged today yet" bar in the
   app. Nothing for the Engineer, but she only sees it when she opens the app (Hanna named this
   herself as the alternative in #163). #165 is closed.
3. **The in-app note now, push later.** Build option 2 as a task now; keep #165 as a draft until
   the Engineer has time for option 1.

**Recommendation: option 1**, when the Engineer is happy to hold the three keys: it is what
Hanna asked for, the work is done and green, and it costs nothing. Before merging, the tester
checks that `serve.json` covers the new collection, and the backend checks in `backend.yml` are
extended for `push_subscriptions` (owner-only). Option 3 if he has no time for it soon.

# Answer

Open.
