---
id: D-0005
title: "The backend is deployed by its own image workflow and Watchtower on a NAS app set up by hand; harness infra is not used"
description: "The PocketBase image is built from deploy/nas/ by the project's own Backend image workflow and published as ghcr.io/sandergeraedts/reading-list-pocketbase; Watchtower on the NAS pulls :stable; the NAS app was set up by hand, so harness infra up and down are never run for this project and the reusable backend workflow is not used."
status: Accepted
date: 2026-11-21
decided_by: engineer
overrules: [G-0028]
replaces: []
replaced_by: []
resolves: []
tags: [backend, deploy, infrastructure]
---

# Context

G-0028 says a project's hosting and backend are spun up through the infrastructure workflows
(`harness infra up`): a Netlify site, and a PocketBase app on the NAS built from the project's
`backend/` folder, with a Tailscale sidecar, Funnel on the paths in `backend/funnel.json`, its
image at `ghcr.io/<owner>/<repository>-backend:stable`, Watchtower, and a snapshot task. The
harness's reusable `backend.yml` builds and publishes that image from `backend/`.

This app's backend existed before all of that. Recorded by the architect from the repository
at adoption (T-0001):

- `deploy/nas/` holds the `Dockerfile` (PocketBase with `pb_migrations/` and `pb_hooks/` baked
  in), `compose.yaml` (Tailscale, PocketBase, Watchtower) and `serve.json` (the Funnel paths).
  The Engineer installed the app by hand in TrueNAS, following `deploy/nas/README.md`.
- `.github/workflows/backend.yml` ("Backend image") builds the image on every pull request that
  touches it, starts it on an empty database, checks the collections, owner-only rules, the
  sign-up allowlist, the nightly secret and the shelf history, and on `main` publishes it as
  `ghcr.io/sandergeraedts/reading-list-pocketbase:stable` and `:sha-<commit>`. The package is
  public.
- Watchtower on the NAS polls `:stable` every 5 minutes and restarts only PocketBase with it;
  PocketBase applies new migrations on start-up.
- The reusable workflow would publish `ghcr.io/sandergeraedts/hanna-s-reading-list-backend`
  instead, from a `backend/` folder with `throwaway.sh` and `smoke-test.sh` that this
  repository doesn't have. Switching would leave the NAS watching an image that no longer
  updates, until the Engineer changes the app on the NAS.
- The Engineer reports hourly ZFS snapshots of the app's data on the NAS (G-0023).

# Decision

- **The backend image is built and published by this project's own `Backend image` workflow**
  (`.github/workflows/backend.yml`) from `deploy/nas/`, as
  `ghcr.io/sandergeraedts/reading-list-pocketbase`. The harness's reusable `backend.yml` is not
  used.
- **The NAS app stays as the Engineer set it up by hand;** Watchtower deploys `:stable`.
- **`harness infra up` and `harness infra down` are never run for this project.** They would
  create a second backend, or remove one they didn't make.
- **The front end deploys as it does now:** Netlify builds `main` for production and every pull
  request as a deploy preview (G-0018 holds for this part).
- **After an auto-merge that touches the backend, the auto-merge workflow starts `backend.yml`**
  (`backend-workflow`, `backend-paths`), and a pull request whose `Backend image` run failed
  doesn't merge (`wait-for`), as G-0011 asks.
- **Snapshots replace a manual backup before a schema change** (G-0023), now that hourly ones
  exist.

# Rationale

The backend works and its workflow checks more than the harness's smoke test does. Moving it
onto the harness's layout means changing the app on the NAS and the image it pulls: work for
the Engineer that gains nothing Hanna would see. G-0028 is about creating new projects; this
one is not new.

# Consequences

- Changes to `compose.yaml` and `serve.json`, and the Tailscale and Watchtower versions, reach
  the NAS only when the Engineer applies them by hand.
- A migration reaches production within about ten minutes of the merge, while Netlify deploys
  the app at once: schema changes must be ones the current app tolerates (add first, use later).
- Should the Engineer ever want this backend under `harness infra`, that is a replacing
  decision and a migration of the NAS app, which is his.

# Guidance for agents

- Never run `harness infra up` or `harness infra down` for this project.
- Never edit a migration that has run; add a new one (`<unix time>_<what>.js`).
- Keep the `Backend image` checks passing, and extend them when a backend change adds a rule.
- Changes to `compose.yaml`, `serve.json`, the image name or anything else that must be applied
  on the NAS wait for the Engineer: raise a question.
