// Measures what the page costs to LOAD: every file the browser fetches on a cold
// visit, how many bytes, and how long until the shelf is really there. It seeds a
// demo shelf in the browser's own storage and never signs in, so it never touches
// a real shelf (G-0019).
//
//   pnpm run dev                       (another terminal)
//   URL=http://localhost:3000 node scripts/measure-load.mjs
//
// Careful with what the numbers mean:
//   - `pnpm run preview` does NOT serve this app (it answers 500: the server
//     functions need the Netlify server), and the live site asks for a sign-in
//     before the shelf, so neither can be measured without an account. Against
//     the dev server the **timings are relative only** — dev serves unbundled
//     modules. For real byte counts, read the sizes `pnpm run build` prints.
import { chromium } from 'playwright'

const URL = process.env.URL ?? 'http://localhost:3000'
const COLORS = ['#7a4f3a', '#2f5d50', '#5b4b8a', '#8a3b4b', '#2d6b8a']
const shelf = Array.from({ length: 150 }, (_, i) => ({
  id: `b${i}`,
  title: `Book number ${i}`,
  authors: ['A. Writer'],
  color: COLORS[i % COLORS.length],
  status: i % 5 === 0 ? 'read' : i % 3 === 0 ? 'want' : 'reading',
  addedAt: 1700000000000 + i * 1000,
  pages: 200 + ((i * 37) % 500),
  genres: [['Fantasy'], ['Romance'], ['Horror'], ['Classic']][i % 4],
  ...(i % 5 === 0 ? { finished: [`2026-0${(i % 9) + 1}-10`], readCount: 1 } : {}),
}))

// a slow-ish phone connection, so the difference between 300 kB and 600 kB is visible
const NET = { offline: false, downloadThroughput: (4 * 1024 * 1024) / 8, uploadThroughput: (1024 * 1024) / 8, latency: 150 }

const run = async (browser, { name, viewport, cpu, net }) => {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  await page.addInitScript(
    ([books, key]) => localStorage.setItem(key, JSON.stringify(books)),
    [shelf, 'hannas-reading-list:v1'],
  )
  const session = await context.newCDPSession(page)
  await session.send('Network.enable')
  if (net) await session.send('Network.emulateNetworkConditions', net)
  if (cpu > 1) await session.send('Emulation.setCPUThrottlingRate', { rate: cpu })

  const files = []
  page.on('response', async (r) => {
    try {
      const h = r.headers()
      const len = Number(h['content-length'] ?? 0)
      files.push({
        url: r.url().replace(URL, ''),
        type: r.request().resourceType(),
        bytes: len || (await r.body().catch(() => Buffer.alloc(0))).length,
      })
    } catch {}
  })

  const t0 = Date.now()
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  const domReady = Date.now() - t0
  // the shelf is really there when the loading line has gone and a canvas is drawing
  await page.waitForFunction(() => !document.querySelector('.stage-loading') && !!document.querySelector('canvas'), null, { timeout: 60000 })
  const canvas = Date.now() - t0
  await page.waitForTimeout(4000)
  const painted = await page.evaluate(() => {
    const p = performance.getEntriesByType('paint').find((e) => e.name === 'first-contentful-paint')
    const nav = performance.getEntriesByType('navigation')[0]
    return { fcp: Math.round(p?.startTime ?? 0), domContentLoaded: Math.round(nav?.domContentLoadedEventEnd ?? 0), load: Math.round(nav?.loadEventEnd ?? 0) }
  })

  const js = files.filter((f) => f.type === 'script')
  const total = files.reduce((n, f) => n + f.bytes, 0)
  console.log(`\n== ${name}`)
  console.log(`   first paint ${painted.fcp} ms · shelf drawn ${canvas} ms (dom ready ${domReady} ms)`)
  console.log(`   ${files.length} files, ${(total / 1024).toFixed(0)} kB on the wire; JavaScript: ${js.length} files, ${(js.reduce((n, f) => n + f.bytes, 0) / 1024).toFixed(0)} kB`)
  for (const f of js.sort((a, b) => b.bytes - a.bytes).slice(0, 8)) {
    console.log(`     ${String((f.bytes / 1024).toFixed(0)).padStart(6)} kB  ${f.url}`)
  }
  await context.close()
  return { name, fcp: painted.fcp, canvas, bytes: total }
}

const browser = await chromium.launch()
await run(browser, { name: 'phone, 4 Mbit, 4× slower processor', viewport: { width: 390, height: 844 }, cpu: 4, net: NET })
await run(browser, { name: 'computer, no throttling', viewport: { width: 1440, height: 900 }, cpu: 1, net: null })
await browser.close()
