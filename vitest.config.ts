import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// separate from vite.config.ts: the TanStack Start and Netlify plugins aren't needed for unit tests
export default defineConfig({
  resolve: { alias: { '#': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { environment: 'happy-dom' },
})
