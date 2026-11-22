#!/usr/bin/env node
// T-0035: "focus not hidden" (WCAG 2.4.11). On each page view (Dashboard, Challenges, Calendar,
// and the Dashboard and Challenges with Arrange on), at 390 × 844 and 1280 × 800: scroll the page
// to the bottom, then focus() every focusable element inside .dashboard from the last to the first
// (as Shift+Tab would), and after each one check that its top is at or below the header's bottom
// (and, while arranging, not under the sticky Arrange bar: an element that overlaps the bar must be
// at or below its bottom). Prints how many end up under them.
//
//   pnpm exec vite dev --port 3144          (no POCKETBASE_URL, no .netlify link: G-0019)
//   node docs/tasks/T-0035-screens/focus-check.mjs --url=http://localhost:3144 --label=branch
//
// The shelf is the same demo books every run, seeded in the browser's localStorage (never a real shelf).
import { chromium } from 'playwright'
import { demoBooks } from '../../../scripts/measure-shelf.mjs'

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = 'true'] = a.replace(/^--/, '').split('=')
    return [k, v]
  }),
)
const URL = args.url ?? 'http://localhost:3144'
const LABEL = args.label ?? 'branch'

const VIEWPORTS = {
  390: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  1280: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
}
const PAGES = [
  { name: 'dashboard', search: '?view=dashboard' },
  { name: 'challenges', search: '?view=challenges' },
  { name: 'calendar', search: '?view=calendar' },
  { name: 'dashboard+arrange', search: '?view=dashboard', arrange: true },
  { name: 'challenges+arrange', search: '?view=challenges', arrange: true },
  // with blocks hidden, the bar grows a "Hidden:" row of chips (taller, measured into --arrange-h)
  { name: 'dashboard+arrange+6-hidden', search: '?view=dashboard', arrange: true, hide: 6 },
]

/** Runs in the page: Shift+Tab-like focus from the last to the first, counting what lands under the header or the bar. */
async function check() {
  const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  const dash = document.querySelector('.dashboard')
  const header = document.querySelector('.topbar')
  dash.scrollTop = dash.scrollHeight
  await frame()
  const sel = 'a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])'
  const all = [...dash.querySelectorAll(sel)].filter((el) => {
    if (el.disabled || el.closest('[inert], [hidden]')) return false
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'
  })
  const hidden = []
  for (const el of all.reverse()) {
    el.focus()
    await frame()
    if (document.activeElement !== el) continue
    const bar = dash.querySelector('.dashboard-bar.arranging')
    const { top, bottom } = el.getBoundingClientRect()
    // under the bar = overlapping it; what comes before the bar on the page (the Today strip) sits
    // above it while the bar hasn't stuck yet, and is not covered by it
    const b = bar && !bar.contains(el) ? bar.getBoundingClientRect() : null
    const underBar = b && top < b.bottom && bottom > b.top
    const limit = Math.max(header.getBoundingClientRect().bottom, underBar ? b.bottom : 0)
    if (top < limit - 0.5) hidden.push(`${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40)}" top ${Math.round(top)} < ${Math.round(limit)}`)
  }
  return { focusable: all.length, under: hidden.length, examples: hidden.slice(0, 3) }
}

const browser = await chromium.launch({ channel: args.channel ?? 'chrome', headless: true })
let total = 0
try {
  for (const [vw, opts] of Object.entries(VIEWPORTS)) {
    for (const p of PAGES) {
      const context = await browser.newContext(opts)
      await context.addInitScript((list) => {
        if (!sessionStorage.getItem('seeded')) {
          localStorage.setItem('hannas-reading-list:v1', JSON.stringify(list))
          sessionStorage.setItem('seeded', '1')
        }
      }, demoBooks(150))
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', (e) => errors.push(String(e)))
      await page.goto(URL + '/' + p.search)
      await page.waitForSelector('.dashboard', { timeout: 60_000 })
      await page.waitForTimeout(1500)
      if (p.arrange) {
        await page.locator('.dashboard-bar button', { hasText: 'Arrange' }).first().click()
        await page.waitForSelector('.dashboard-bar.arranging')
        for (let i = 0; i < (p.hide ?? 0); i++) await page.locator('button[aria-label^="Hide "]').first().click()
        await page.waitForTimeout(300)
      }
      const r = await page.evaluate(check)
      total += r.under
      console.log(`${LABEL} ${vw} ${p.name}: ${r.under} of ${r.focusable} focusable elements under the header${p.arrange ? ' or the Arrange bar' : ''}${errors.length ? ` (page errors: ${errors.length})` : ''}`)
      for (const e of r.examples) console.log(`    e.g. ${e}`)
      await context.close()
    }
  }
} finally {
  await browser.close()
}
console.log(`${LABEL} total: ${total} elements under the header`)
