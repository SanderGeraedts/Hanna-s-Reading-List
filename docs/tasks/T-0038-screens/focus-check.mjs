#!/usr/bin/env node
// T-0038: the Arrange bar stays small. Extends T-0035's focus check (docs/tasks/T-0035-screens/
// focus-check.mjs): on the Dashboard and the Challenges page with Arrange on, with 0, 6 and 30
// blocks hidden (or as many as the page has), at 844 × 390, 800 × 360 (phones held sideways),
// 390 × 844, 360 × 800 and 1280 × 800:
//   - focus() every focusable element inside .dashboard from the last to the first (as Shift+Tab
//     would) and count what ends up under the header or the Arrange bar (an element counts as
//     under the bar only when it overlaps it, as in T-0035);
//   - the bar's height, and as a share of the screen height.
// Then, at 390 × 844 on the Dashboard: hide every block with a real (not forced) Playwright click
// on its Hide button, bring every block back with a real click on its chip, and Tab to each chip
// with 30 hidden and check it is fully visible inside the chip area.
//
//   pnpm exec vite dev --port 3151          (no POCKETBASE_URL, no .netlify link: G-0019)
//   node docs/tasks/T-0038-screens/focus-check.mjs --url=http://localhost:3151 --label=branch
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
const URL = args.url ?? 'http://localhost:3151'
const LABEL = args.label ?? 'branch'
const SKIP_CLICKS = args['no-clicks'] === 'true'

const phone = (width, height) => ({ viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
const VIEWPORTS = {
  '844x390': phone(844, 390),
  '800x360': phone(800, 360),
  '390x844': phone(390, 844),
  '360x800': phone(360, 800),
  '1280x800': { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
}
const PAGES = [
  { name: 'dashboard', search: '?view=dashboard' },
  { name: 'challenges', search: '?view=challenges' },
]
const HIDDEN = [0, 6, 30]

/** Runs in the page: Shift+Tab-like focus from the last to the first, counting what lands under the header or the bar. */
async function check() {
  const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  const dash = document.querySelector('.dashboard')
  const header = document.querySelector('.topbar')
  const bar0 = dash.querySelector('.dashboard-bar.arranging')
  const barHeight = bar0 ? bar0.getBoundingClientRect().height : 0
  const barPosition = bar0 ? getComputedStyle(bar0).position : null
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
    const b = bar && !bar.contains(el) ? bar.getBoundingClientRect() : null
    const underBar = b && top < b.bottom && bottom > b.top
    const limit = Math.max(header.getBoundingClientRect().bottom, underBar ? b.bottom : 0)
    if (top < limit - 0.5) hidden.push(`${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40)}" top ${Math.round(top)} < ${Math.round(limit)}`)
  }
  const sideways = document.documentElement.scrollWidth > innerWidth || dash.scrollWidth > dash.clientWidth
  return { focusable: all.length, under: hidden.length, examples: hidden.slice(0, 3), barHeight, barPosition, sideways, screen: innerHeight }
}

async function open(browser, opts, search) {
  const context = await browser.newContext(opts)
  await context.addInitScript((list) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('hannas-reading-list:v1', JSON.stringify(list))
      sessionStorage.setItem('seeded', '1')
    }
  }, demoBooks(150))
  const page = await context.newPage()
  const errors = []
  page.on('console', (m) => m.type() === 'error' && !/favicon/.test(m.location()?.url ?? '') && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto(URL + '/' + search)
  await page.waitForSelector('.dashboard', { timeout: 60_000 })
  await page.waitForTimeout(1500)
  await page.locator('.dashboard-bar button', { hasText: 'Arrange' }).first().click()
  await page.waitForSelector('.dashboard-bar.arranging')
  return { context, page, errors }
}

/** Hides up to n blocks with real clicks on their Hide buttons; returns how many were hidden. */
async function hide(page, n, progress = () => {}) {
  let done = 0
  for (; done < n; done++) {
    const btn = page.locator('button[aria-label^="Hide "]').first()
    if ((await btn.count()) === 0) break
    await btn.click({ timeout: 5000 })
    progress(done + 1)
  }
  await page.waitForTimeout(300)
  return done
}

const browser = await chromium.launch({ channel: args.channel ?? 'chrome', headless: true })
let total = 0
try {
  for (const [vw, opts] of Object.entries(VIEWPORTS)) {
    for (const p of PAGES) {
      for (const n of HIDDEN) {
        const { context, page, errors } = await open(browser, opts, p.search)
        let hiddenCount = 0
        try {
          hiddenCount = await hide(page, n, (k) => (hiddenCount = k))
        } catch (e) {
          console.log(`${LABEL} ${vw} ${p.name}+arrange+${n}-hidden: a Hide click failed: ${String(e).split('\n')[0]}`)
          // carry on with dispatched clicks so the focus count still runs (on main before T-0038 the
          // last Hide buttons are under or past the grown bar, out of reach even for a forced click)
          for (; hiddenCount < n; hiddenCount++) {
            const btn = page.locator('button[aria-label^="Hide "]').first()
            if ((await btn.count()) === 0) break
            await btn.dispatchEvent('click')
          }
          await page.waitForTimeout(300)
        }
        const r = await page.evaluate(check)
        total += r.under
        const share = Math.round((r.barHeight / r.screen) * 1000) / 10
        console.log(
          `${LABEL} ${vw} ${p.name}+arrange+${hiddenCount}-hidden: ${r.under} of ${r.focusable} focusable elements under the header or the Arrange bar; bar ${Math.round(r.barHeight)} px (${share} % of ${r.screen}), ${r.barPosition}; sideways scroll ${r.sideways}; console errors ${errors.length}`,
        )
        for (const e of r.examples) console.log(`    e.g. ${e}`)
        await context.close()
      }
    }
  }
  console.log(`${LABEL} total: ${total} elements under the header or the bar`)

  if (!SKIP_CLICKS) {
    // real clicks at 390 × 844: every Hide button, then every chip
    const { context, page, errors } = await open(browser, VIEWPORTS['390x844'], '?view=dashboard')
    let hideOk = 0
    let hideFail = ''
    for (;;) {
      const btn = page.locator('button[aria-label^="Hide "]').first()
      if ((await btn.count()) === 0) break
      try {
        await btn.click({ timeout: 5000 })
        hideOk++
      } catch (e) {
        hideFail = String(e).split('\n')[0]
        break
      }
    }
    const barAll = await page.locator('.dashboard-bar.arranging').evaluate((b) => b.getBoundingClientRect().height)
    console.log(`${LABEL} clicks 390x844: ${hideOk} Hide buttons clicked for real${hideFail ? `, then failed: ${hideFail}` : ' (all of them)'}; bar with all ${hideOk} hidden: ${Math.round(barAll)} px`)
    let chipOk = 0
    let chipFail = ''
    for (;;) {
      const chip = page.locator('.hidden-blocks button').last()
      if ((await chip.count()) === 0) break
      try {
        await chip.click({ timeout: 5000 })
        chipOk++
      } catch (e) {
        chipFail = String(e).split('\n')[0]
        break
      }
    }
    console.log(`${LABEL} clicks 390x844: ${chipOk} chips clicked for real${chipFail ? `, then failed: ${chipFail}` : ' (all of them, every block back)'}; console errors ${errors.length}`)
    await context.close()

    // Tab through the chips with 30 hidden: each focused chip fully inside the chip area
    const t = await open(browser, VIEWPORTS['390x844'], '?view=dashboard')
    let n = 0
    try {
      n = await hide(t.page, 30, (k) => (n = k))
    } catch {
      for (; n < 30; n++) await t.page.locator('button[aria-label^="Hide "]').first().dispatchEvent('click')
      await t.page.waitForTimeout(300)
    }
    await t.page.locator('.dashboard-bar button', { hasText: 'Done' }).focus()
    const chips = await t.page.locator('.hidden-blocks button').count()
    let visible = 0
    const bad = []
    for (let i = 0; i < chips; i++) {
      await t.page.keyboard.press('Tab')
      await t.page.waitForTimeout(80)
      const r = await t.page.evaluate(() => {
        const el = document.activeElement
        const area = document.querySelector('.hidden-blocks')
        if (!area || !area.contains(el)) return { inArea: false, text: el?.textContent?.trim() }
        const a = area.getBoundingClientRect()
        const c = el.getBoundingClientRect()
        return { inArea: true, text: el.textContent.trim(), inside: c.top >= a.top - 0.5 && c.bottom <= a.bottom + 0.5 }
      })
      if (r.inArea && r.inside) visible++
      else bad.push(`${r.text} ${r.inArea ? 'not fully visible' : 'focus left the chip area'}`)
    }
    console.log(`${LABEL} tab 390x844 with ${n} hidden: ${visible} of ${chips} chips fully visible in the chip area when reached by Tab${bad.length ? ' — ' + bad.slice(0, 3).join('; ') : ''}`)
    await t.context.close()
  }
} finally {
  await browser.close()
}
