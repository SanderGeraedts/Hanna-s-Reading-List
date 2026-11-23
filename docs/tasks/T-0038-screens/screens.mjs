#!/usr/bin/env node
// T-0038: the screenshots in this folder (the Arrange bar with its capped, scrollable chips; a
// phone held sideways scrolled to the bingo card, the bar scrolled away with the page).
//
//   pnpm exec vite dev --port 3151          (no POCKETBASE_URL, no .netlify link: G-0019)
//   node docs/tasks/T-0038-screens/screens.mjs --url=http://localhost:3151
//
// Seeds 150 demo books in localStorage (never a real shelf). Prints, per shot, the bar's height
// and position, where the first bingo square lands against the header, sideways scroll and
// console errors.
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { demoBooks } from '../../../scripts/measure-shelf.mjs'

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = 'true'] = a.replace(/^--/, '').split('=')
    return [k, v]
  }),
)
const URL = args.url ?? 'http://localhost:3151'
const OUT = dirname(fileURLToPath(import.meta.url))

const phone = (width, height) => ({ viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
const VP = {
  '390': phone(390, 844),
  '844x390': phone(844, 390),
  '1280': { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
}
// [name, viewport, wallpaper, search, hidden, scroll ('bingo' or none)]
const SHOTS = [
  ['arrange-30-hidden-390-lavender', '390', 'lavender', '?view=dashboard', 30],
  ['arrange-30-hidden-390-midnight', '390', 'midnight', '?view=dashboard', 30],
  ['arrange-30-hidden-1280-lavender', '1280', 'lavender', '?view=dashboard', 30],
  ['arrange-6-hidden-844x390-lavender', '844x390', 'lavender', '?view=dashboard', 6, 'bingo'],
  ['arrange-6-hidden-844x390-midnight', '844x390', 'midnight', '?view=dashboard', 6, 'bingo'],
  ['arrange-challenges-844x390-lavender', '844x390', 'lavender', '?view=challenges', 0],
]

const browser = await chromium.launch({ channel: args.channel ?? 'chrome', headless: true })
try {
  for (const [name, vp, wallpaper, search, hidden, scroll] of SHOTS) {
    const context = await browser.newContext(VP[vp])
    await context.addInitScript(
      ({ list, wallpaper }) => {
        if (!sessionStorage.getItem('seeded')) {
          localStorage.setItem('hannas-reading-list:v1', JSON.stringify(list))
          localStorage.setItem('hannas-reading-list:room', JSON.stringify({ wallpaper }))
          sessionStorage.setItem('seeded', '1')
        }
      },
      { list: demoBooks(150), wallpaper },
    )
    const page = await context.newPage()
    const errors = []
    page.on('console', (m) => m.type() === 'error' && !/favicon/.test(m.location()?.url ?? '') && errors.push(m.text()))
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto(URL + '/' + search)
    await page.waitForSelector('.dashboard', { timeout: 60_000 })
    await page.waitForTimeout(1500)
    await page.locator('.dashboard-bar button', { hasText: 'Arrange' }).first().click()
    await page.waitForSelector('.dashboard-bar.arranging')
    for (let i = 0; i < hidden; i++) await page.locator('button[aria-label^="Hide "]').first().click()
    await page.evaluate(() => (document.querySelector('.dashboard').scrollTop = 0))
    await page.waitForTimeout(300)
    if (scroll === 'bingo') {
      // focus the first bingo square, as Tab would bring it into view
      await page.locator('.bingo .bingo-square.tappable, .bingo button').first().focus()
      await page.waitForTimeout(400)
    }
    const m = await page.evaluate(() => {
      const bar = document.querySelector('.dashboard-bar.arranging')
      const b = bar.getBoundingClientRect()
      const h = document.querySelector('.topbar').getBoundingClientRect()
      const sq = document.activeElement?.closest('.bingo') ? document.activeElement.getBoundingClientRect() : null
      const d = document.querySelector('.dashboard')
      return {
        bar: Math.round(b.height),
        barTop: Math.round(b.top),
        position: getComputedStyle(bar).position,
        headerBottom: Math.round(h.bottom),
        square: sq ? { top: Math.round(sq.top), bottom: Math.round(sq.bottom) } : null,
        sideways: document.documentElement.scrollWidth > innerWidth || d.scrollWidth > d.clientWidth,
      }
    })
    await page.screenshot({ path: join(OUT, `${name}.jpg`), type: 'jpeg', quality: 80 })
    console.log(
      `${name}.jpg: bar ${m.bar} px at top ${m.barTop} (${m.position}), header bottom ${m.headerBottom}${m.square ? `, focused bingo square ${m.square.top}–${m.square.bottom}` : ''}, sideways scroll ${m.sideways}, console errors ${errors.length}${errors.length ? ': ' + errors.slice(0, 2).join(' | ') : ''}`,
    )
    await context.close()
  }
} finally {
  await browser.close()
}
