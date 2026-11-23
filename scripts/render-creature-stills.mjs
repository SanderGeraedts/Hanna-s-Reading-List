// Renders the creatures' still pictures (T-0030 Design §1) from the real models into
// public/creatures/: {species}-{stage}[-shiny].webp (120) and egg-{tier}.webp (6), 192 × 192.
// Dev only: `pnpm run render:creatures`. Run it again after a model, palette or stage changes;
// src/components/creatures/stills.test.ts fails when a picture is missing.
//
// It starts a bare Vite server (no app, no Netlify, no environment) for scripts/creature-stills/,
// opens it in headless Chrome with software WebGL and writes what the page renders.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { chromium } from 'playwright'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'public', 'creatures')
const ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']

const server = await createServer({
  root,
  configFile: false,
  logLevel: 'warn',
  resolve: { tsconfigPaths: true },
  server: { host: '127.0.0.1', port: 0, strictPort: false },
})
await server.listen()
const address = server.httpServer.address()
const url = `http://127.0.0.1:${address.port}/scripts/creature-stills/index.html`

let browser
try {
  browser = await chromium.launch({ headless: true, args: ARGS })
} catch {
  // no Playwright browser downloaded: use the installed Chrome
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: ARGS })
}
try {
  const page = await browser.newPage()
  page.on('pageerror', (e) => console.error('page error:', e.message))
  await page.goto(url)
  await page.waitForFunction(() => window.ready === true, null, { timeout: 120_000 })
  const files = await page.evaluate(() => window.renderAll())
  mkdirSync(out, { recursive: true })
  let bytes = 0
  for (const [name, data] of Object.entries(files)) {
    if (!data.startsWith('data:image/webp;base64,')) throw new Error(`${name}: the browser did not make a WebP`)
    const buf = Buffer.from(data.slice('data:image/webp;base64,'.length), 'base64')
    bytes += buf.length
    writeFileSync(join(out, name), buf)
  }
  console.log(`wrote ${Object.keys(files).length} pictures to public/creatures (${Math.round(bytes / 1024)} KB)`)
} finally {
  await browser.close()
  await server.close()
}
