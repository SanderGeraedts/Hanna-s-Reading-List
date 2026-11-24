import { defineConfig } from 'vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'

import netlify from '@netlify/vite-plugin-tanstack-start'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  // Bundle three.js into the server build instead of loading it from node_modules at run time:
  // three's examples (BufferGeometryUtils) are ES modules, and the Netlify function loads
  // node_modules with require(), which crashed every page (ERR_REQUIRE_ESM, 2026-11-23).
  ssr: { noExternal: ['three', /^three\//, /^@react-three\//] },
  plugins: [
    tanstackStart(),
    netlify({
      dev: {
        // the app has no edge functions; their local emulator (Deno) fails to start on Windows
        edgeFunctions: { enabled: false },
        // Never load the Netlify site's environment variables into the dev server (#156,
        // docs/data-safety.md). On a checkout linked to the site (a .netlify/ folder from
        // `netlify link`), the plugin would otherwise pull production's POCKETBASE_URL and the
        // dev server would sign in against the real account server: the route by which a local
        // test shelf overwrote Hanna's shelf (#96). The dev server only sees what is set locally.
        environmentVariables: { enabled: false },
      },
    }),
    viteReact(),
  ],
})

export default config
