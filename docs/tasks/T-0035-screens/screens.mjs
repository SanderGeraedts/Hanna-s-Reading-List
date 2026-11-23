#!/usr/bin/env node
// T-0035: the screenshots in this folder, and the header measurements next to them.
//
//   pnpm exec vite dev --port 3144          (no POCKETBASE_URL, no .netlify link: G-0019)
//   node docs/tasks/T-0035-screens/screens.mjs --url=http://localhost:3144 --label=branch
//   (and once on main with --label=main --only=shelf,dashboard-top, for the side-by-side)
//
// Seeds 150 demo books in localStorage (never a real shelf). Prints, per shot, the header's
// height, whether the page scrolls sideways, and any console errors.
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
const URL = args.url ?? 'http://localhost:3144'
const LABEL = args.label ?? 'branch'
const ONLY = args.only ? args.only.split(',') : null
const OUT = dirname(fileURLToPath(import.meta.url))

const VP = {
  390: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  360: { viewport: { width: 360, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  1280: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
}
// [kind, width, wallpaper, search, scroll (px into .dashboard, or 'shelf')]
const SHOTS = [
  ['dashboard-scrolled', 390, 'lavender', '?view=dashboard', 260],
  ['dashboard-scrolled', 390, 'midnight', '?view=dashboard', 260],
  ['dashboard-scrolled', 360, 'lavender', '?view=dashboard', 260],
  ['dashboard-scrolled', 360, 'midnight', '?view=dashboard', 260],
  ['dashboard-top', 390, 'lavender', '?view=dashboard', 0],
  ['dashboard-top', 390, 'midnight', '?view=dashboard', 0],
  ['challenges-scrolled', 390, 'lavender', '?view=challenges', 420],
  ['challenges-scrolled', 390, 'midnight', '?view=challenges', 420],
  ['calendar-scrolled', 390, 'lavender', '?view=calendar', 300],
  ['calendar-scrolled', 390, 'midnight', '?view=calendar', 300],
  ['dashboard-scrolled', 1280, 'lavender', '?view=dashboard', 300],
  ['dashboard-scrolled', 1280, 'midnight', '?view=dashboard', 300],
  ['challenges-focus-bingo', 390, 'lavender', '?view=challenges&focus=bingo', null],
  ['calendar-month-2026-08', 390, 'lavender', '?view=calendar&month=2026-08', null],
  ['shelf', 390, 'lavender', '', 'shelf'],
  ['shelf', 1280, 'lavender', '', 'shelf'],
]

const browser = await chromium.launch({
  channel: args.channel ?? 'chrome',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
try {
  for (const [kind, w, wallpaper, search, scroll] of SHOTS) {
    if (ONLY && !ONLY.includes(kind)) continue
    const context = await browser.newContext(VP[w])
    await context.addInitScript(
      ({ list, wallpaper }) => {
        localStorage.setItem('hannas-reading-list:v1', JSON.stringify(list))
        localStorage.setItem('hannas-reading-list:room', JSON.stringify({ wallpaper }))
      },
      { list: demoBooks(150), wallpaper },
    )
    const page = await context.newPage()
    const errors = []
    page.on('console', (m) => m.type() === 'error' && errors.push(`${m.text()} ${m.location()?.url ?? ''}`.trim()))
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto(URL + '/' + search)
    if (scroll === 'shelf') {
      await page.waitForSelector('canvas', { timeout: 60_000 })
      await page.waitForTimeout(7000)
    } else {
      await page.waitForSelector('.dashboard', { timeout: 60_000 })
      await page.waitForTimeout(1500)
      if (typeof scroll === 'number') {
        await page.evaluate((y) => (document.querySelector('.dashboard').scrollTop = y), scroll)
        await page.waitForTimeout(400)
      }
    }
    const m = await page.evaluate(() => {
      const h = document.querySelector('.topbar').getBoundingClientRect()
      const d = document.querySelector('.dashboard')
      // for the focus / month shots: where the target lands against the header
      const target = document.querySelector('#challenge-bingo') ?? document.querySelector('.calendar-nav')
      return {
        header: Math.round(h.height * 10) / 10,
        band: getComputedStyle(document.querySelector('.topbar')).backgroundImage !== 'none' ? 'haze' : getComputedStyle(document.querySelector('.topbar')).backgroundColor,
        sideways: document.documentElement.scrollWidth > innerWidth || (d ? d.scrollWidth > d.clientWidth : false),
        target: target ? { top: Math.round(target.getBoundingClientRect().top), headerBottom: Math.round(h.bottom) } : null,
      }
    })
    const name = `${LABEL === 'branch' ? '' : LABEL + '-'}${w}-${wallpaper}-${kind}.jpg`
    await page.screenshot({ path: join(OUT, name), type: 'jpeg', quality: 80 })
    console.log(`${name}: header ${m.header}px, background ${m.band}, sideways scroll ${m.sideways}${m.target && scroll === null ? `, target top ${m.target.top} vs header bottom ${m.target.headerBottom}` : ''}, console errors ${errors.length}${errors.length ? ': ' + errors.slice(0, 2).join(' | ') : ''}`)
    await context.close()
  }
} finally {
  await browser.close()
}
