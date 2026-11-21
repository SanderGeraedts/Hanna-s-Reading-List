# AGENTS.md

`hannas-reading-list`: a 3D bookshelf for Hanna's reading list (React, TanStack Start and
Three.js on Netlify), with accounts and shelves in PocketBase on Sander's NAS. The README
explains the features and how the code fits together; `deploy/nas/README.md` explains the
account server.

Built AI-first with [the harness](https://github.com/SanderGeraedts/harness) (D-0001):
agents write the code, working from recorded decisions and tasks.

## Before you change anything

1. Read the rules: `node_modules/@sandergeraedts/harness/rules/AGENTS.md`. They apply here
   in full. If that file is missing, run `pnpm install` first.
2. Run `pnpm exec harness role`, and work in the mode it prints.
3. Read the global decisions (`node_modules/@sandergeraedts/harness/decisions/index.md`),
   then this project's ([docs/decisions/index.md](docs/decisions/index.md)). A project
   decision with `overrules` wins over the global decision it names.
4. Work from a task in [docs/tasks/index.md](docs/tasks/index.md).

## Project rules

Rules that hold only for this project. Each one points at the decision behind it.

- **Whose instance is this?** Two people work on this repository with Claude: Sander built
  and maintains it, hosts the NAS and holds every secret; Hanna uses the app and builds
  features for it herself, and is not an engineer. If your user-level instructions
  (`~/.claude/CLAUDE.md`) say this is **Hanna's instance**, read and follow
  [`docs/hanna-guardrails.md`](docs/hanna-guardrails.md) before doing anything else, and use
  the `feature-chat` skill for feature requests. Otherwise you are working with Sander and the
  guardrails do not apply (D-0001, Q-003).
- **Only production touches production data** (G-0019, D-0003, #96). Never run the dev
  server, a script or a test against the production `POCKETBASE_URL`, and never pull Netlify
  environment variables (`netlify env:get`, `netlify link`, `netlify dev` linked to the site
  and the like). On 9 November 2026 a local test shelf overwrote Hanna's real shelf. Her shelf
  is one JSON record per person in PocketBase, merged on every save by `src/lib/shelfMerge.ts`.
- **New fields on `Book` are optional** (D-0002), so shelves saved before them still load.
- **The backend deploys through the `Backend image` workflow and Watchtower** (D-0005). A
  change in `deploy/nas/` (`Dockerfile`, `pb_migrations/`, `pb_hooks/`) rebuilds the
  PocketBase image, and Watchtower restarts PocketBase on the NAS with it: that is a change to
  the live database. `.github/workflows/backend.yml` is the project's own; don't replace it
  with the harness's reusable one, and never run `harness infra up` or `harness infra down`.
- **Backups** (G-0023): the NAS snapshots the app's data every hour, so a schema change needs
  no manual backup first.
- **Where this project differs from the harness:** D-0002 overrules G-0017 (TanStack Start
  with server functions, not a static app), D-0003 overrules G-0018 (only the app's server
  talks to PocketBase) and D-0005 overrules G-0028 (no `harness infra`).
- **Code owners** (Q-003): `.github/CODEOWNERS` lists the paths only Sander may approve, and
  the `main` ruleset requires his review for them.
- **Commands:** `pnpm install`, `pnpm run dev` (http://localhost:3000), `pnpm test`,
  `pnpm run build`. A merge to `main` deploys the site on Netlify within minutes; every pull
  request gets a Netlify deploy preview.
