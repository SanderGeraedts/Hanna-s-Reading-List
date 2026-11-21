---
id: T-0002
title: "Stop the local dev server from loading production's environment through the Netlify plugin"
description: "#156: turn off the Netlify Vite plugin's environment variables in vite.config.ts, so a checkout linked to the Netlify site never reaches the production account server."
status: Done
depends_on: []
decisions: [G-0019, D-0003]
raised_on: 2026-11-21
done_on: 2026-11-21
result: ["https://github.com/SanderGeraedts/Hanna-s-Reading-List/pull/191"]
---

# Goal

Issue #156 (raised by Sander): on a checkout that is linked to the Netlify site (a `.netlify/`
folder from `netlify link`), `npm run dev` loads the site's environment variables through
`@netlify/vite-plugin-tanstack-start`, including the production `POCKETBASE_URL`. The dev server
then signs in against the real account server: the same route by which a local test shelf
overwrote Hanna's shelf on 9 November (#96). G-0019 says only production reaches the backend.

Fix it as #156 describes: in `vite.config.ts`, pass `environmentVariables: { enabled: false }`
to the plugin's `dev` options, next to `edgeFunctions: { enabled: false }`. After that the dev
server only sees what is set locally. Mention it in the project's data-safety rules (in
`AGENTS.md` if T-0001 has merged, otherwise in `CLAUDE.md` → *Data safety*).

This task doesn't wait for T-0001: it closes a risk to Hanna's data that every developer and
tester working tonight is exposed to. Whichever of the two merges second takes the other's
changes in.

# Done when

The tester, in a worktree with a `.netlify/` folder that holds **only a fake link** (a
`.netlify/state.json` with a made-up `siteId`, never `netlify link` to the real site, never
real environment variables):

- `vite.config.ts` passes `environmentVariables: { enabled: false }` in the Netlify plugin's
  `dev` options (read the diff).
- Starting the dev server (`pnpm run dev`, or `npm run dev` before T-0001) with no
  `POCKETBASE_URL` set: its log does **not** contain `Netlify Environment loaded`, and
  `http://localhost:3000` opens the shelf without a sign-in screen.
- With a local PocketBase as in `docs/hanna-guardrails.md` (*Running the app locally*),
  `POCKETBASE_URL=http://127.0.0.1:8090` and the dev server: the sign-in screen appears and a
  test account `test@example.com` can sign up and save a book.
- The data-safety rules mention that the Netlify plugin's environment loading is off and why
  (#156).
- `pnpm test` (or `npm test`) and the build pass; CI is green.

# Notes

- `options.environmentVariables?.enabled !== false` in `@netlify/vite-plugin` is what the
  option switches (from #156).
- `vite.config.ts` is not a code-owner path; `CLAUDE.md` is, `AGENTS.md` will be after T-0001.
- Never run `netlify link`, `netlify dev` against the real site or `netlify env:get`.
- Close #156 from the pull request ("Closes #156").

# Design

Nothing visible.

# Test

Tester, 2026-11-21, on `fa2c3de` in a fresh worktree (not the developer's, not the main clone).

**Two Done-when lines can't pass as written; the orchestrator accepted these corrected checks:**

1. Not "the log does not contain `Netlify Environment loaded`": the plugin always prints that
   line. Instead: `environmentVariables` is absent from the `Emulating features` line on this
   branch and present with main's `vite.config.ts`.
2. With the Netlify CLI logged in on this machine, a made-up `siteId` stops the dev server
   (and sends a request to Netlify). So every dev-server run below had `APPDATA` pointed at an
   empty scratch folder: no stored login was found, and nothing reached Netlify.

**Setup:** `.netlify/state.json` held only `{"siteId":"00000000-fake-0000-0000-t0002tester0"}`;
no `netlify link`, no `.env` files, and `POCKETBASE_URL` and all `NETLIFY*` variables unset.

**Install, tests, build**

- `npm ci`: OK.
- `npm test`: `Test Files  42 passed (42)`, `Tests  280 passed (280)`.
- `npm run build`: exit 0, `✓ built in 716ms`, `✓ built in 512ms`.

**Diff:** `vite.config.ts` passes `environmentVariables: { enabled: false }` in the Netlify
plugin's `dev` options, next to `edgeFunctions: { enabled: false }`.

**Dev server, no `POCKETBASE_URL`**

- This branch: `⬥ Netlify Environment loaded`, then
  `⬥ Netlify Middleware loaded. Emulating features: aiGateway, blobs, database, functions, geolocation, headers, images, redirects, server, static.`
  `http://localhost:3000`, rendered in headless Chrome, showed the shelf ("An empty shelf,
  waiting for stories … + Add book") with no sign-in screen.
- Main's `vite.config.ts` (swapped in temporarily):
  `⬥ Netlify Middleware loaded. Emulating features: aiGateway, blobs, database, environmentVariables, functions, geolocation, headers, images, redirects, server, static.`

**Does a site variable really reach the dev server, and does the fix stop it?** Without the
real site, I added a harmless variable to the site's own config instead: a temporary
`POCKETBASE_URL = "http://127.0.0.1:8090"` line in `netlify.toml` `[build.environment]` (a
local address only, reverted afterwards, not committed). The plugin feeds this config into the
same injection path as the site's environment variables (`injectEnvVariables`, gated by
`features.environmentVariables` in `@netlify/dev`).

- Main's config: the page showed "Sign in to open your shelf." The variable reached
  `process.env`: this is the #156 route.
- This branch: the page showed the shelf with no sign-in screen. The variable did not get
  through.

**With a local PocketBase.** I used PocketBase 0.40.6, the same version as
`deploy/nas/Dockerfile`, with a fresh data folder, `SIGNUP_EMAILS=test@example.com`, the repo's
`pb_migrations` and `pb_hooks`, and `POCKETBASE_URL=http://127.0.0.1:8090 npm run dev`. The
Emulating line again had no `environmentVariables`. I drove headless Chrome over the DevTools
protocol:

- The sign-in screen appeared: "Sign in to open your shelf. Email Password Sign in New here?
  Create an account".
- I signed up as `test@example.com` (name "Tester") and the shelf opened.
- I added "T0002 Tester Book" by Test Author on the Manual tab. Read back from the local
  PocketBase as that user, `libraries` had `records: 1` and `has T0002 Tester Book: true`.

**Trying to break it**

- **Other ways Netlify's environment could reach dev:**
  - Every `process.env` read in `src/` is server code: `POCKETBASE_URL`, `NIGHTLY_SECRET`,
    `STORYTEL_COOKIE_SECRET` and `NODE_ENV`. It runs in the Vite process, which the plugin's
    injection fills.
  - `netlify/functions/nightly-storytel.mts` reads `NIGHTLY_SECRET` and `URL` from the same
    `process.env`.
  - In `@netlify/dev`, `injectEnvVariables` is the only code that copies site or config
    variables into `process.env`. AI Gateway setup is also gated on `environmentVariables`.
  - No `.env` files are in the repository or the worktree.
- **The new unit test fails on main:**
  - With main's `vite.config.ts`, `npx vitest run vite.config.test.ts` gave
    `× never loads the Netlify site environment into the dev server (#156)` and
    `AssertionError: expected undefined to deeply equal { enabled: false }`.
  - With this branch's config: `Tests  1 passed (1)`.
- **The production build is unaffected:**
  - `@netlify/vite-plugin-tanstack-start` spreads `options.dev` into the plugin options, and
    the plugin reads them only in `configureServer` (dev).
  - I built on this branch and on main's config: the md5 of all 23 files in `dist/` matched
    (`IDENTICAL`).
- **Code-owned paths:** the PR touches `README.md`, `docs/data-safety.md`, this task,
  `docs/tasks/index.md`, `vite.config.ts` and `vite.config.test.ts`. None of them is
  code-owned.
- **Data-safety rules:** the mention is in a new `docs/data-safety.md`, linked from the
  README's local-development section. It is not in `CLAUDE.md` → *Data safety*, which is
  code-owned and would need Sander's approval. The line for `AGENTS.md` still has to be added
  in T-0001. T-0001's task doesn't list it yet.
- **CI on `fa2c3de`:** `test` SUCCESS, Netlify deploy preview SUCCESS. I did not use the
  deploy preview.

**Verdict: passed.**

# Log

- 2026-11-21 architect: Task written from #156, ordered right after the adoption and without a
  dependency on it, because the main clone has a `.netlify/` folder.
- 2026-11-21 developer: Built in `vite.config.ts`: `environmentVariables: { enabled: false }` in
  the Netlify plugin's `dev` options, next to `edgeFunctions`, with a comment (#156, #96).
  `vite.config.test.ts` checks the option (fails on main: `expected undefined to equal
  { enabled: false }`; passes with the fix). Data-safety mention in a new `docs/data-safety.md`,
  linked from the README's local-development section; the line for `CLAUDE.md` / `AGENTS.md`
  goes in with T-0001, which is code-owned, so `CLAUDE.md` is not edited here. Checks, in a
  fresh worktree with `.netlify/state.json` holding only a made-up `siteId`, no
  `POCKETBASE_URL`: dev server log `⬥ Netlify Middleware loaded. Emulating features: aiGateway,
  blobs, database, functions, geolocation, headers, images, redirects, server, static.` (on
  main the same line lists `environmentVariables`); `http://localhost:3000` opened the shelf
  with no sign-in screen. With a local PocketBase 0.40.6 (`SIGNUP_EMAILS=test@example.com`,
  repo migrations and hooks) and `POCKETBASE_URL=http://127.0.0.1:8090`: sign-in screen shown,
  `test@example.com` signed up, a manually added book "T0002 Local Test Book" was saved (the
  local `libraries` record holds it). `npm test`: `Test Files 42 passed (42)`, `Tests 280
  passed (280)`; `npm run build`: `✓ built`.
- 2026-11-21 developer: For the architect, two things in the *Done when* that the fix can't
  meet as written (not changed here): (1) `@netlify/vite-plugin` logs `⬥ Netlify Environment
  loaded` every time it starts, whatever is enabled (`logger.log("Environment loaded")` after
  `netlifyDev.start()`), so that line stays in the log with the fix; the proof the option works
  is that `environmentVariables` is gone from the `Emulating features` line. (2) On a machine
  where the Netlify CLI is logged in, a made-up `siteId` stops the dev server before it starts
  (`Failed retrieving site data for site …: Not Found`, from `@netlify/config` resolving the
  site), independent of this change; the checks above ran with `APPDATA` pointed at an empty
  scratch folder so no stored Netlify login was found and nothing reached Netlify.
- 2026-11-21 tester: passed. Two Done-when lines were corrected (the plugin always logs `Netlify Environment loaded`; a made-up `siteId` needs an empty `APPDATA` on a logged-in machine). The `AGENTS.md` data-safety line goes in with T-0001.
