---
id: D-0002
title: "The app is a TanStack Start app with server functions and a 3D shelf, not a static single-page app"
description: "The front end is React and TypeScript on TanStack Start with server functions and server routes, Three.js through react-three-fiber, Vitest, its own CSS design system and a local copy of the shelf in localStorage, instead of the static Vite SPA with Tailwind, Dexie, Playwright and vite-plugin-pwa of G-0017."
status: Accepted
date: 2026-11-21
decided_by: engineer
overrules: [G-0017]
replaces: []
replaced_by: []
resolves: []
tags: [stack]
---

# Context

G-0017 says a new project's front end is a static single-page app in React and TypeScript
built with Vite, routed with TanStack Router, styled with Tailwind, tested with Vitest and
Playwright, installable through vite-plugin-pwa, and storing local data in IndexedDB through
Dexie.

This app was built before the harness existed, and differs on purpose where the code shows a
reason. Recorded by the architect from the code at adoption (T-0001); the choices themselves
were made when the features were built.

- **It needs code on a server.** The Storytel import sends Hanna's Storytel password to
  `src/server/storytel.ts` and seals the login with `STORYTEL_COOKIE_SECRET`; the cover proxy
  (`src/routes/api/cover.$kind.$value.ts`, `remote-cover.ts`) makes covers usable as WebGL
  textures; sign-in keeps the token in an httpOnly cookie (D-0004); the nightly Storytel sync
  runs in `src/routes/api/nightly-storytel.ts`. None of that can live in a static bundle, so
  the app is a TanStack Start app (`@tanstack/react-start`) with server functions, deployed on
  Netlify through `@netlify/vite-plugin-tanstack-start` (D-0003).
- **The shelf is 3D:** Three.js through `@react-three/fiber` (`src/components/BookshelfScene.tsx`).
- **Styling is its own design system** (`src/styles.css`, the style page `src/routes/style.tsx`,
  #157), not Tailwind.
- **The local copy is in `localStorage`** (`src/lib/library.ts`): one JSON shelf per account,
  synced as a whole and merged on the server (`src/lib/shelfMerge.ts`). It works offline as
  G-0020 asks, without Dexie.
- **Tests are Vitest** (`vitest.config.ts`, happy-dom); there are no end-to-end tests yet, and
  no service worker or web manifest.

# Decision

- The front end stays React, TypeScript and Vite on **TanStack Start with server functions and
  server routes**, with **Three.js** for the shelf, **its own CSS design system**, **Vitest**,
  and the shelf's local copy in **`localStorage`**.
- Server-only code lives in `src/server/` and `src/routes/api/`; secrets are read there from the
  environment and never reach the browser.
- Moving to Dexie, Tailwind or a static build is not planned. Adding Playwright tests or a PWA
  manifest is allowed when a task needs it; it doesn't need a new decision.

# Rationale

Rewriting a working, daily-used app onto the template stack would cost a great deal and put
Hanna's data path at risk for no gain she would see. The server functions are what make the
Storytel import, the cover proxy and a cookie-only session possible.

# Consequences

- The harness's template code (`src/sync/`, `src/auth/`, Dexie) does not apply here; don't
  copy it in.
- Every build runs server code on Netlify, so a change in `src/server/` or `src/routes/api/` is
  a change to what runs on the server (D-0003).
- The CI checks are `pnpm test` and `pnpm run build` (there is no `typecheck` script yet).

# Guidance for agents

- Keep server-only code and secrets in `src/server/` and `src/routes/api/`; never import them
  into a component.
- New fields on `Book` stay optional, so shelves saved before them still load.
- Don't introduce Dexie or Tailwind piecemeal; that would be a replacing decision first.
