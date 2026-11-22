#!/usr/bin/env node
// T-0036: screenshots of the Want-to-read pile block, before and after.
//
//   pnpm exec vite dev --port 3148          (no POCKETBASE_URL, no .netlify link: G-0019)
//   node docs/tasks/T-0036-screens/screens.mjs --url=http://localhost:3148 --label=before
//   node docs/tasks/T-0036-screens/screens.mjs --url=http://localhost:3148 --label=after
//
// Seeds T-0023's mixed shelf in localStorage (never a real shelf), on the lavender wallpaper,
// and shoots the pile block at 390 and 1280 with All and with 🎧 Audiobook picked. Prints the
// grey line and the height line of each shot.
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = 'true'] = a.replace(/^--/, '').split('=')
    return [k, v]
  }),
)
const URL = args.url ?? 'http://localhost:3148'
const LABEL = args.label ?? 'after'
const OUT = dirname(fileURLToPath(import.meta.url))

const VP = {
  390: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  1280: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
}

const day = (n) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}
const book = (id, extra = {}) => ({
  id,
  title: `Book ${id}`,
  authors: ['Someone'],
  color: '#5b3a6e',
  status: 'want',
  addedAt: 0,
  ...extra,
})
/** T-0023's mixed shelf, plus a finished book so the pace line shows. */
const shelf = [
  book('done', { status: 'read', finished: [day(10)], pages: 300 }),
  book('A', { formats: ['paperback'], pages: 300 }),
  book('B', { formats: ['hardcover'], pages: 300 }),
  book('C', { formats: ['ebook'], pages: 300 }),
  book('D', { formats: ['storytel'], pages: 600, minutes: 600 }),
  book('E', { formats: ['paperback', 'storytel'], pages: 300, minutes: 720 }),
  book('F', { formats: ['other'] }),
  book('G', { status: 'read', formats: ['paperback'], pages: 300 }),
]

const browser = await chromium.launch({ channel: args.channel ?? 'chrome', headless: true })
try {
  for (const w of [390, 1280]) {
    for (const pick of ['all', 'audio']) {
      const context = await browser.newContext(VP[w])
      await context.addInitScript(
        ({ list }) => {
          localStorage.setItem('hannas-reading-list:v1', JSON.stringify(list))
          localStorage.setItem('hannas-reading-list:room', JSON.stringify({ wallpaper: 'lavender' }))
        },
        { list: shelf },
      )
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', (e) => errors.push(String(e)))
      await page.goto(URL + '/?view=dashboard')
      const card = page.locator('section.dash-card', { has: page.locator('#pile-title') })
      await card.waitFor({ timeout: 60_000 })
      await page.waitForTimeout(1200)
      if (pick === 'audio') await card.getByRole('button', { name: 'Audiobook' }).click()
      await card.scrollIntoViewIfNeeded()
      await page.waitForTimeout(300)
      const grey = await card.locator('p.muted.small-text').first().textContent()
      const said = await card.locator('.pile-said p').first().textContent()
      const name = `${LABEL}-${w}-lavender-pile-${pick}.png`
      await card.screenshot({ path: join(OUT, name) })
      console.log(`${name}: grey "${grey}" | line "${said}" | page errors ${errors.length}`)
      await context.close()
    }
  }
} finally {
  await browser.close()
}
