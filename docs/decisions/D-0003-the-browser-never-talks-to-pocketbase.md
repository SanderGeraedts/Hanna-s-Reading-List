---
id: D-0003
title: "The browser never talks to PocketBase: the app's server functions on Netlify are its only client"
description: "PocketBase on the NAS behind Tailscale Funnel stays the backend, but only the app's server functions and the scheduled nightly function on Netlify call it, with POCKETBASE_URL set for production only; Funnel exposes only the paths those need."
status: Accepted
date: 2026-11-21
decided_by: engineer
overrules: [G-0018]
replaces: []
replaced_by: []
resolves: []
tags: [stack, backend]
---

# Context

G-0018 says a project's backend is a PocketBase app on the NAS, reachable from the internet
through its own Tailscale Funnel address, and that the front end is a Netlify site with a
deploy preview for every pull request; its guidance is not to add another hosted service. The
harness's template builds on that with a static front end whose browser code calls PocketBase
directly, with CORS for the site.

This app keeps PocketBase on the NAS behind Funnel and Netlify with deploy previews, but puts a
server tier on Netlify between the two. Recorded by the architect from the code at adoption
(T-0001):

- `src/server/pocketbase.ts`: "The browser never talks to PocketBase." Server functions read
  `POCKETBASE_URL`, forward the session token from an httpOnly cookie, and treat 502/503/504
  from Tailscale as "the server can't be reached".
- `netlify/functions/nightly-storytel.mts`: a Netlify **scheduled function** that, at 23:00
  Amsterdam time, calls the app's own `/api/nightly-storytel`, which reads and saves shelves
  through `/api/nightly/` on PocketBase with `NIGHTLY_SECRET` (`deploy/nas/pb_hooks/nightly.pb.js`).
- `deploy/nas/serve.json`: Funnel on port 443 serves only `/api/health`, the `users`,
  `libraries` and `storytel_logins` collections, and `/api/nightly/`; everything else, the admin
  screen and superuser sign-in included, is 404. The full PocketBase is on port 8443 for the
  tailnet only.
- `POCKETBASE_URL` and `NIGHTLY_SECRET` are set on Netlify for the production context only
  (`deploy/nas/README.md`, steps 7 and 9), so previews and local development run without the
  account server (G-0019).

# Decision

- **PocketBase on the NAS behind Funnel stays the backend,** and the front end stays on Netlify
  with deploy previews: that part of G-0018 holds.
- **Only the app's server code calls PocketBase:** the server functions in `src/server/` and
  `src/routes/api/`, and the scheduled function in `netlify/functions/`. The browser only ever
  talks to the app's own origin.
- **Netlify Functions (including scheduled functions) are part of this app's hosting,** not an
  extra service in the sense of G-0018's guidance.
- **Funnel exposes only the paths the server code needs** (`deploy/nas/serve.json`); the admin
  screen and superuser sign-in are never on the Funnel address.
- **`POCKETBASE_URL` and `NIGHTLY_SECRET` exist only in Netlify's production context.**

# Rationale

A cookie-only session keeps the PocketBase token out of reach of page scripts, the Storytel
login can be sealed and opened on the server only, and PocketBase needs no CORS or public
superuser surface. The nightly sync needs something that runs when nobody has the app open,
and Netlify's scheduled functions do that without anything new on the NAS.

# Consequences

- The NAS is called from Netlify's servers, not from Hanna's devices; when the NAS is down,
  signed-in devices keep working from their local copy.
- A change to `serve.json` is a change on the NAS, done by hand by the Engineer
  (`deploy/nas/README.md`); a new collection the server code needs also needs a `serve.json`
  path, so it waits for the Engineer.
- The harness's infrastructure checks for a template backend (CORS for the site, a
  `backend/funnel.json`) don't describe this app; D-0005 covers how it is deployed.

# Guidance for agents

- Never call PocketBase from browser code, and never put `POCKETBASE_URL` or a token in the
  client bundle.
- Never run the dev server, a script or a test against the production `POCKETBASE_URL`, and
  never pull Netlify's environment variables (G-0019; #96, #156).
- A feature that needs a new Funnel path, a new Netlify secret or a new scheduled job needs the
  Engineer: raise a question.
