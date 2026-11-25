---
id: T-0099
title: "Skip Netlify builds when a change touches only docs/ and root Markdown"
description: "Add a dependency-free ignore script and a [build] ignore line in netlify.toml, so a docs-only pull request gets no deploy preview and a docs-only merge doesn't redeploy, with a test over git ranges and one real docs-only pull request as proof."
status: Doing
size: small
depends_on: []
decisions: [D-0078, G-0011, G-0018, G-0019, D-0077]
raised_on: 2026-11-25
done_on: ""
result: ["https://github.com/SanderGeraedts/Hanna-s-Reading-List/pull/276"]
---

# Goal

Netlify's build minutes are nearly used up this month (278 of 300 on 25 November 2026), and
this site uses about three quarters of them, many for pull requests and merges that change only
task files, decisions and other docs. Sander decided to skip those builds (D-0078). This task
makes Netlify cancel a build, for a deploy preview or for production, when every changed file
is under `docs/` or is a `.md` file at the repository root, and build as before for everything
else.

What a user sees: nothing changes in the app. On a docs-only pull request, Netlify's status
says the deploy preview was skipped instead of giving a preview link; on every other pull
request the preview appears as before.

# Done when

1. `pnpm test` passes, including a new test of the ignore script that builds throwaway git
   repositories in a temp folder (no network, no Netlify) and runs the script with the Netlify
   variables set, expecting exit 0 (skip) or non-zero (build):
   - preview, pull request changes only `docs/tasks/x.md` → skip
   - preview, only root `README.md` and `AGENTS.md` → skip
   - preview, only `src/…` → build
   - preview, `docs/…` and `src/…` together → build
   - preview, a docs-only last commit on a branch whose earlier commit changed `src/` → build
   - preview, only `public/notes.md`, `deploy/nas/README.md` or `netlify.toml` → build
   - preview, a rename from `src/a.ts` to `docs/a.ts` → build
   - production, `CACHED_COMMIT_REF..COMMIT_REF` docs-only → skip; with an app file → build
   - production, `CACHED_COMMIT_REF` empty, equal to `COMMIT_REF`, or not an ancestor → build
   - `CONTEXT=branch-deploy` or unset → build
   - no `main` to find a merge base with → build
2. `netlify.toml` has the `ignore` line under `[build]`, and `pnpm exec harness check` passes.
3. A real docs-only pull request (this task's own docs update after the code has merged, or a
   one-line change in `docs/`) shows on GitHub, from the developer or tester:
   `gh pr checks <n>` with Netlify's deploy-preview status reported as skipped or canceled
   (not built), `checks / checks` green, and the pull request merged by the auto-merge workflow.
   After the merge, the Netlify deploy list for `main` shows that commit's production build as
   skipped, and the live site still loads (the previous deploy). The pull request with the
   script itself must build (it touches `scripts/` and `netlify.toml`): its preview appearing
   is part of the check.

# Notes

- **Mechanism (D-0078):** `[build] ignore = "node scripts/netlify-ignore.mjs"` (or the
  equivalent `sh` script; the developer picks). Netlify cancels the build on exit 0 and builds
  on any other exit. It runs after the clone and before `pnpm install`, so the script may use
  only Node's built-ins and `git`. Netlify sets `CONTEXT`, `COMMIT_REF`, `CACHED_COMMIT_REF`,
  `BRANCH` and `HEAD`; the base branch is `main`.
- **Preview:** diff `git merge-base <main> COMMIT_REF`..`COMMIT_REF`, where `<main>` is
  `origin/main` if present, else try `git fetch origin main` (a failure means build). Don't use
  `CACHED_COMMIT_REF` for previews: on a pull request's first preview it isn't the pull
  request's base, and a plain `git diff --quiet $CACHED_COMMIT_REF $COMMIT_REF` would skip the
  first build of a new branch.
- **Production:** diff `CACHED_COMMIT_REF..COMMIT_REF` only when both are set, they differ and
  `git merge-base --is-ancestor` holds; otherwise build.
- Use `git diff --name-status --no-renames` (or check both names of a rename) so a file moved
  out of `src/` counts as an app change.
- **Docs-only paths:** `docs/**` and `*.md` at the root only. Checked on 25 November 2026:
  nothing in `src/`, `netlify/`, `vite.config.ts` or `public/` imports or serves a file from
  `docs/` or the root Markdown (two comments in `src/server/` mention docs paths; they are not
  imports). Don't add `public/`, `deploy/` or `.github/`.
- **Merging is unaffected:** the `harness: default branch` ruleset requires only
  `checks / checks`, and `.github/workflows/auto-merge.yml` waits only for CI and Backend image,
  never for Netlify (D-0077). A skipped preview leaves no failing required check.
- **Update the docs that promise a preview for every pull request:** the last bullet of
  `AGENTS.md` ("every pull request gets a Netlify deploy preview") and `docs/hanna-setup.md`
  line about checking the deploy preview: say docs-only pull requests get none.
  `.claude/skills/feature-chat/SKILL.md` asks what Hanna checks on the preview; her feature
  pull requests change `src/`, so they still get one. If the skill is generated by
  `harness sync`, leave it.
- **Hanna (Requester):** her feature pull requests touch the app and keep their previews. If
  she or her Claude ever opens a docs-only pull request (her backlog, say), there will be no
  preview to look at, and nothing in the app changed.
- The test must never set or read `POCKETBASE_URL` or any Netlify site setting, and never run
  `netlify` commands (G-0019, AGENTS.md).
- The same approach is going into Sander's other Netlify site at the same time; keep the rule
  and the variable handling the same so both stay consistent.
- Size: small. Tooling only, no new collection, route or service, nothing in the app changes.

# Design

Nothing visible in the app.

# Test

# Log

- 2026-11-25 architect: Sander decided (in session) to skip Netlify previews for docs-only pull requests in both repositories, to save build minutes; recorded D-0078 (overrules G-0018 for docs-only changes, production skipped too) and wrote this task. Size: small.
- 2026-11-25 developer: built `scripts/netlify-ignore.mjs` (Node built-ins and git only; previews diff `merge-base(origin/main or a fetched main, COMMIT_REF)..COMMIT_REF`, production diffs `CACHED_COMMIT_REF..COMMIT_REF` only when both are set, differ and the cached one is an ancestor; `--name-status --no-renames`; anything uncertain or an empty diff builds), the `[build] ignore` line in `netlify.toml`, and `scripts/netlify-ignore.test.ts` (22 cases over throwaway git repositories, every case in *Done when* 1 plus `docs-not/`, `src/notes.md`, a cached ref that isn't in the clone and preview ignoring `CACHED_COMMIT_REF`). AGENTS.md and `docs/hanna-setup.md` now say docs-only pull requests get no preview; `.claude/skills/feature-chat/SKILL.md` left as is (her feature pull requests change `src/`). Check: `pnpm exec vitest run scripts/netlify-ignore.test.ts` → `Tests 22 passed (22)`; `pnpm test` → `Test Files 199 passed | 2 skipped (201)`, `Tests 2480 passed | 22 skipped (2502)`. For the architect: `tsc --noEmit` on `main` already reports two unused imports (`src/components/GardenPage.test.tsx` `SPOTS_PER_BED`, `src/lib/dashboardLayout.test.ts` `toggleFavourite`); not fixed here.
