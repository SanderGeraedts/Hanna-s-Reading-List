# Hanna's Reading List

A 3D bookshelf for Hanna's reading list: React, TanStack Start and Three.js, hosted on Netlify. Accounts and shelves live in PocketBase on Sander's NAS. The README explains the features and how the code fits together; `deploy/nas/README.md` explains the account server.

## Whose instance is this?

Two people work on this repo with Claude:

- **Sander** built and maintains it. He hosts the NAS and holds every secret.
- **Hanna** uses the app and builds features for it herself. She is not an engineer.

If your user-level instructions (`~/.claude/CLAUDE.md`) say this is **Hanna's instance**, read and follow [`docs/hanna-guardrails.md`](docs/hanna-guardrails.md) before doing anything else, and use the `feature-chat` skill for feature requests. Otherwise you are working with Sander and the guardrails do not apply.

## Commands

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # vitest
npm run build      # production build
```

CI (`.github/workflows/ci.yml`) runs `npm test` and `npm run build` on every PR. Both must pass before merging.

## How changes reach the live site

- A merge to `main` deploys the site on Netlify within minutes. Every PR gets a Netlify deploy preview.
- A change in `deploy/nas/` (Dockerfile, `pb_migrations/`, `pb_hooks/`) also rebuilds the PocketBase image, and Watchtower restarts PocketBase on the NAS with it. That is a change to the live database.
- `.github/CODEOWNERS` lists the paths only Sander may approve.

## Data safety

Hanna's shelf is one JSON record per person in PocketBase, merged on every save by `src/lib/shelfMerge.ts`. On 9 November 2026 a local test shelf overwrote her real shelf (#96). Since #94 a save can't drop books, but:

- Never run the dev server, a script or a test against the production `POCKETBASE_URL`, and never pull Netlify environment variables (`netlify env:get` and the like).
- New fields on `Book` must be optional, so shelves saved before them still load.
