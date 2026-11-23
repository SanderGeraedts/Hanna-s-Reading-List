#!/usr/bin/env node
// T-0040: screenshots of the Badges block with the travel badges.
//
//   pnpm exec vite dev --port 3154          (no POCKETBASE_URL, no .netlify link: G-0019)
//   node docs/tasks/T-0040-screens/screens.mjs --url=http://localhost:3154
//
// Seeds a demo shelf in localStorage (never a real shelf): finished books set in seven
// countries on five continents and in two imaginary lands, so Passport stamped and five
// postcards are earned, Frequent flyer, World tour and Dreamwalker show progress, and Home
// sweet home is a hidden tile (shot with its riddle open). The "home" shot adds a book set in
// Amsterdam, which unlocks it. Prints the travel tiles of each shot.
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = 'true'] = a.replace(/^--/, '').split('=')
    return [k, v]
  }),
)
const URL = args.url ?? 'http://localhost:3154'
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
const read = (id, n, places) => ({
  id,
  title: `Book ${id}`,
  authors: [`Author ${id}`],
  color: '#5b3a6e',
  status: 'read',
  addedAt: 0,
  finished: [day(n)],
  readCount: 1,
  places,
})
const away = [
  read('paris', 60, ['Paris (France)']),
  read('tokyo', 50, ['Tokyo (Japan)']),
  read('nairobi', 40, ['Nairobi (Kenya)']),
  read('rio', 30, ['Rio de Janeiro (Brazil)']),
  read('moscow', 20, ['Moscow (Russia)', 'Lima (Peru)']),
  read('toronto', 12, ['Toronto (Canada)']),
  read('narnia', 9, ['Narnia (Imaginary place)']),
  read('hogwarts', 5, ['Hogwarts School of Witchcraft and Wizardry (Imaginary place)']),
]
const home = [...away, read('amsterdam', 2, ['Amsterdam (Netherlands)'])]

const shots = [
  { w: 390, wallpaper: 'lavender', shelf: away, riddle: true, name: 'badges-390-lavender' },
  { w: 390, wallpaper: 'midnight', shelf: away, riddle: true, name: 'badges-390-midnight' },
  { w: 1280, wallpaper: 'lavender', shelf: away, riddle: true, name: 'badges-1280-lavender' },
  { w: 390, wallpaper: 'lavender', shelf: home, riddle: false, name: 'badges-390-lavender-home' },
]
const TRAVEL = /Passport|Frequent|World|Around|Postcard|Dreamwalker|Realm|Home sweet/

const browser = await chromium.launch({ channel: args.channel ?? 'chrome', headless: true })
try {
  for (const s of shots) {
    const context = await browser.newContext(VP[s.w])
    await context.addInitScript(
      ({ list, wallpaper }) => {
        localStorage.setItem('hannas-reading-list:v1', JSON.stringify(list))
        localStorage.setItem('hannas-reading-list:room', JSON.stringify({ wallpaper }))
      },
      { list: s.shelf, wallpaper: s.wallpaper },
    )
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto(URL + '/?view=dashboard')
    const card = page.locator('section.dash-card', { has: page.locator('#badges-title') })
    await card.waitFor({ timeout: 60_000 })
    await page.waitForTimeout(1200)
    // Home sweet home is the last hidden badge: open its riddle
    if (s.riddle) await card.locator('.hidden-badges .secret-tile').last().click()
    // the block is taller than the screen and the page scrolls inside the app: grow the
    // window to the whole page (same width, same layout) so the shot has every tile
    const tall = await page.evaluate(() => Math.max(...[...document.querySelectorAll('*')].map((e) => e.scrollHeight)))
    await page.setViewportSize({ width: s.w, height: Math.min(tall + 200, 12_000) })
    await page.waitForTimeout(800)
    await card.scrollIntoViewIfNeeded()
    await page.waitForTimeout(300)
    const tiles = (await card.locator('li.badge').allTextContents()).filter((t) => TRAVEL.test(t))
    const riddle = s.riddle ? await card.locator('.secret-tile.open').textContent() : ''
    await card.screenshot({ path: join(OUT, `${s.name}.png`) })
    console.log(`${s.name}.png | errors ${errors.length}\n  ${tiles.join('\n  ')}${riddle ? `\n  open riddle: ${riddle}` : ''}`)
    await context.close()
  }
} finally {
  await browser.close()
}
