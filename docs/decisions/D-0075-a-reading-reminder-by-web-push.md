---
id: D-0075
title: "The app may send a reading reminder at 20:00 by web push, with its keys on Netlify and a collection on the NAS"
description: "Hanna's 20:00 reminder on days without reading (#163) is built as web push (#165): VAPID keys on Netlify for production only, a push_subscriptions collection and hook on PocketBase, and a second scheduled function; Sander keeps them running."
status: Accepted
date: 2026-11-24
decided_by: engineer
overrules: []
replaces: []
replaced_by: []
resolves: [Q-001]
tags: [backend, infrastructure, notifications]
---

# Context

Hanna asked in #163 for a notification on her phone at 20:00 on days she hasn't logged any
reading yet, also when the app is closed. Her instance built it as draft PR #165 (labelled
`needs-sander`), because it needs secrets, a new collection on the live database and a scheduled
job that only the Engineer can set up and keep running. That was open question Q-001, with three
options: web push as built, an in-app note only, or the note now and push later.

# Decision

Web push, as built in #165:

- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` are secrets on Netlify for the
  **production** context only (G-0019, D-0003). Sander created them on 2026-11-24.
- A `push_subscriptions` collection (owner-only) and a reminders hook behind `NIGHTLY_SECRET`
  on PocketBase, deployed like every backend change (D-0005).
- A second scheduled function on Netlify sends the reminder at 20:00 Amsterdam time.
- The NAS's own `serve.json` gets a Funnel path for the new collection if the app's server
  needs one; that is a change on the NAS by hand.

# Rationale

It is what Hanna asked for, the work was already done, and it costs nothing. The in-app note
only helps when she opens the app, which is exactly when she doesn't need the reminder.

# Consequences

- Sander holds three more secrets. Replacing the private key means every device turns the
  reminder on again.
- The browsers' push services become an outside dependency in practice; iPhones only allow it
  for the app added to the home screen. If they change how web push works, it needs fixing.
- The backend checks in `backend.yml` cover `push_subscriptions` (owner-only), like the other
  collections.

# Guidance for agents

- Keep the VAPID keys off deploy previews and local development (G-0019); locally, make
  throwaway keys.
- A reminder must never be sent more than once a day, and never when the reading log already has
  something for that day.
- Don't add other notifications on the back of this without asking: each one is a new thing that
  can annoy her or break.
