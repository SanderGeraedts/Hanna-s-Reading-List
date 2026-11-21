# Data safety when running the app locally

Hanna's shelf lives only on the account server on Sander's NAS, and only the live site may
touch it (G-0019, D-0003). On 9 November 2026 a local test shelf overwrote her real shelf
(#96). These rules keep a developer's machine away from it. The full rules are in
`CLAUDE.md` → *Data safety*; this page adds what is not there yet.

## The Netlify plugin never loads the site's environment (#156)

`vite.config.ts` passes `environmentVariables: { enabled: false }` to the Netlify Vite plugin
(`@netlify/vite-plugin-tanstack-start`), next to `edgeFunctions: { enabled: false }`.

Why: on a checkout that is linked to the Netlify site (a `.netlify/` folder from
`netlify link`), the plugin would otherwise pull the site's environment variables into
`npm run dev`, including the production `POCKETBASE_URL`. The dev server would then sign in
against the real account server: the same route by which the local test shelf overwrote
Hanna's shelf. With the option off, the dev server sees only what is set on your own machine.

What you will see: the dev log still prints `⬥ Netlify Environment loaded`. That line is
printed whenever the plugin starts, whatever is switched on. What matters is the next line,
`Middleware loaded. Emulating features: …`, which no longer lists `environmentVariables`.

Keep the option off. Don't remove it to "get the right settings" locally.

## Running locally

- No `POCKETBASE_URL`: no sign-in, and the shelf lives in the browser.
- To try sign-in and syncing: a local PocketBase and
  `POCKETBASE_URL=http://127.0.0.1:8090`, as in the README (*Accounts and syncing*) and
  `docs/hanna-guardrails.md` (*Running the app locally*).
- Never set the production `POCKETBASE_URL`, never run `netlify env:get`, and never run
  `netlify dev` linked to the site.
