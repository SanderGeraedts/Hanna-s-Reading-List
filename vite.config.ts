import { defineConfig } from 'vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'

import netlify from '@netlify/vite-plugin-tanstack-start'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    tanstackStart(),
    // the app has no edge functions; their local emulator (Deno) fails to start on Windows
    netlify({ dev: { edgeFunctions: { enabled: false } } }),
    viteReact(),
  ],
})

export default config
