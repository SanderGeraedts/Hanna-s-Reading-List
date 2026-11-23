#!/usr/bin/env node
// T-0042: screenshots of the Badges block as a medal grid.
//
//   pnpm exec vite dev --port 3157          (no POCKETBASE_URL, no .netlify link: G-0019)
//   node docs/tasks/T-0042-screens/screens.mjs --url=http://localhost:3157
//
// Uses `playwright` (a dev dependency), or the module named in PLAYWRIGHT (e.g. a
// playwright-core's index.mjs as a file:// URL). Seeds a demo shelf in localStorage (never a
// real shelf): six finished books in five genres, one set in Paris, so First book and Explorer
// are bronze, 5 books silver and the Postcard from Europe (🏰) gold; 10 books is locked at
// 6 / 10, and 11 secret badges are hidden "?" medals. Prints, per shot, the medals per row,
// the medal size and the card's text.
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright')

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = 'true'] = a.replace(/^--/, '').split('=')
    return [k, v]
  }),
)
const URL = args.url ?? 'http://localhost:3157'
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
const read = (id, n, extra = {}) => ({
  id,
  title: `Book ${id}`,
  authors: [`Author ${id}`],
  color: '#5b3a6e',
  status: 'read',
  addedAt: 0,
  finished: [day(n)],
  readCount: 1,
  ...extra,
})
const shelf = [
  read('a', 90, { genres: ['Fantasy'] }),
  read('b', 75, { genres: ['Romance'] }),
  read('c', 60, { genres: ['Mystery'], places: ['Paris (France)'] }),
  read('d', 45, { genres: ['History'] }),
  read('e', 30, { genres: ['Horror'] }),
  read('f', 15),
]

const SILVER = 'button[aria-label="5 books, silver, unlocked"]'
const BRONZE = 'button[aria-label="First book, bronze, unlocked"]'
const LOCKED = 'button[aria-label="10 books, locked, 6 of 10"]'
const HIDDEN = 'button[aria-label="Hidden badge"]'

const shots = [
  { w: 390, wallpaper: 'lavender', name: 'badges-390-lavender' },
  { w: 390, wallpaper: 'midnight', name: 'badges-390-midnight' },
  { w: 1280, wallpaper: 'lavender', name: 'badges-1280-lavender' },
  { w: 1280, wallpaper: 'midnight', name: 'badges-1280-midnight' },
  { w: 390, wallpaper: 'lavender', name: 'badges-390-lavender-earned', tap: SILVER },
  { w: 1280, wallpaper: 'midnight', name: 'badges-1280-midnight-earned', tap: BRONZE },
  { w: 390, wallpaper: 'midnight', name: 'badges-390-midnight-locked', tap: LOCKED },
  { w: 1280, wallpaper: 'lavender', name: 'badges-1280-lavender-locked', tap: LOCKED },
  { w: 390, wallpaper: 'lavender', name: 'badges-390-lavender-hidden', tap: HIDDEN, last: true },
  { w: 1280, wallpaper: 'midnight', name: 'badges-1280-midnight-hidden', tap: HIDDEN, last: true },
  { w: 390, wallpaper: 'lavender', name: 'badges-390-lavender-focus', keyboard: true },
  { w: 390, wallpaper: 'lavender', name: 'badges-390-lavender-folded', fold: true },
]

const browser = await chromium.launch({ channel: args.channel ?? 'chrome', headless: true })
let failed = 0
try {
  for (const s of shots) {
    const context = await browser.newContext(VP[s.w])
    await context.addInitScript(
      ({ list, wallpaper }) => {
        localStorage.setItem('hannas-reading-list:v1', JSON.stringify(list))
        localStorage.setItem('hannas-reading-list:room', JSON.stringify({ wallpaper }))
      },
      { list: shelf, wallpaper: s.wallpaper },
    )
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto(URL + '/?view=dashboard')
    const card = page.locator('section.dash-card', { has: page.locator('#badges-title') })
    await card.waitFor({ timeout: 60_000 })
    await page.waitForTimeout(1200)
    // the block is taller than the screen and the page scrolls inside the app: grow the
    // window to the whole page (same width, same layout) so the shot has every medal
    const tall = await page.evaluate(() => Math.max(...[...document.querySelectorAll('*')].map((e) => e.scrollHeight)))
    await page.setViewportSize({ width: s.w, height: Math.min(tall + 400, 12_000) })
    await page.waitForTimeout(600)
    if (s.tap) {
      const m = card.locator(s.tap)
      await (s.last ? m.last() : m.first()).click()
    }
    if (s.keyboard) {
      // focus Explorer (bronze) by keyboard, ← to 5 books (silver), Enter: chosen and focused
      await card.locator('button[aria-label="Explorer, bronze, unlocked"]').focus()
      await page.keyboard.press('ArrowLeft')
      await page.keyboard.press('Enter')
    }
    if (s.fold) await card.locator('button.card-fold').click()
    await page.mouse.move(0, 0)
    await page.waitForTimeout(500)
    await card.scrollIntoViewIfNeeded()
    await page.waitForTimeout(300)
    const facts = await card.evaluate((el) => {
      const ms = [...el.querySelectorAll('.medals button')]
      const tops = ms.map((m) => m.getBoundingClientRect().top)
      const r = ms[0]?.getBoundingClientRect()
      const focused = document.activeElement
      return {
        perRow: tops.filter((t) => t === tops[0]).length,
        medals: ms.length,
        size: r ? `${Math.round(r.width)}x${Math.round(r.height)}` : '-',
        card: el.querySelector('#badges-card')?.innerText.replace(/\s+/g, ' ').trim() ?? '',
        focus: focused?.getAttribute('aria-label') ?? focused?.tagName,
        focusVisible: focused?.matches(':focus-visible') ?? false,
      }
    })
    await card.screenshot({ path: join(OUT, `${s.name}.png`) })
    if (errors.length) failed++
    console.log(
      `${s.name}.png | errors ${errors.length} | ${facts.medals} medals, ${facts.perRow} a row, ${facts.size}` +
        (facts.card ? ` | card: ${facts.card}` : '') +
        (s.keyboard ? ` | focus: ${facts.focus} (focus-visible ${facts.focusVisible})` : ''),
    )
    await context.close()
  }
} finally {
  await browser.close()
}
process.exitCode = failed ? 1 : 0
