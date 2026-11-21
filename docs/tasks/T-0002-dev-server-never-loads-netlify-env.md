---
id: T-0002
title: "Stop the local dev server from loading production's environment through the Netlify plugin"
description: "#156: turn off the Netlify Vite plugin's environment variables in vite.config.ts, so a checkout linked to the Netlify site never reaches the production account server."
status: Doing
depends_on: []
decisions: [G-0019, D-0003]
raised_on: 2026-11-21
done_on: ""
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
