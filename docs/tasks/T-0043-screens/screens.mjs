#!/usr/bin/env node
// T-0043: screenshots of the Badges block with the twelve new badges and the birthday row.
//
//   pnpm exec vite dev --port 3159          (no POCKETBASE_URL, no .netlify link: G-0019)
//   node docs/tasks/T-0043-screens/screens.mjs --url=http://localhost:3159
//
// Uses `playwright` (a dev dependency), or the module named in PLAYWRIGHT (e.g. a
// playwright-core's index.mjs as a file:// URL). Seeds a demo shelf in localStorage (never a
// real shelf): eight finished books, one on 14 May 2026 (for the birthday), four by one author
// (Superfan locked at 4 / 10), a horror book finished on 31 October (Spooky season, gold), a
// paperback, an e-book and an audiobook (Mix it up, gold), five authors (Wide reader 5 / 25).
// The birthday, where a shot needs it set, is seeded as this device's `MM-DD` (D-0039).
// Prints, per shot, the medals per row and in all, the row's control heights, the card's text
// and the stored birthday after each step.
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright')

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = 'true'] = a.replace(/^--/, '').split('=')
    return [k, v]
  }),
)
const URL = args.url ?? 'http://localhost:3159'
const OUT = dirname(fileURLToPath(import.meta.url))
const BIRTHDAY = 'hannas-reading-list:birthday'

const VP = {
  390: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  1280: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
}

const read = (id, day, extra = {}) => ({
  id,
  title: `Book ${id}`,
  authors: [`Author ${id}`],
  color: '#5b3a6e',
  status: 'read',
  addedAt: Date.parse('2025-09-01'),
  finished: [day],
  readCount: 1,
  ...extra,
})
const shelf = [
  read('a', '2026-02-03', { authors: ['Leigh Bardugo'], genres: ['Fantasy'], formats: ['paperback'] }),
  read('b', '2026-03-10', { authors: ['Leigh Bardugo'], genres: ['Fantasy'] }),
  read('c', '2026-04-12', { authors: ['Leigh Bardugo'] }),
  read('d', '2026-06-20', { authors: ['Leigh Bardugo'] }),
  read('e', '2026-05-14', { genres: ['Romance'] }),
  read('f', '2025-10-31', { genres: ['Horror'] }),
  read('g', '2026-08-02', { genres: ['Mystery'], formats: ['ebook'] }),
  read('h', '2026-09-15', { formats: ['audiobook'], minutes: 600 }),
]

const SILVER = 'button[aria-label="5 books, silver, unlocked"]'
const SUPERFAN = 'button[aria-label="Superfan, locked, 4 of 10"]'
const CAKE = 'button[data-id="birthday"]'

const shots = [
  { w: 390, wallpaper: 'lavender', name: 'badges-390-lavender-empty', then: 'save' },
  { w: 1280, wallpaper: 'midnight', name: 'badges-1280-midnight-empty' },
  { w: 390, wallpaper: 'midnight', name: 'badges-390-midnight-set', birthday: '05-14' },
  { w: 1280, wallpaper: 'lavender', name: 'badges-1280-lavender-set', birthday: '05-14' },
  { w: 390, wallpaper: 'lavender', name: 'badges-390-lavender-change', birthday: '05-14', change: true },
  { w: 1280, wallpaper: 'midnight', name: 'badges-1280-midnight-change', birthday: '05-14', change: true },
  { w: 390, wallpaper: 'midnight', name: 'badges-390-midnight-error', pick: ['31', '04'] },
  { w: 390, wallpaper: 'lavender', name: 'badges-390-lavender-birthday', birthday: '05-14', tap: CAKE },
  { w: 1280, wallpaper: 'lavender', name: 'badges-1280-lavender-locked', tap: SUPERFAN },
  { w: 390, wallpaper: 'midnight', name: 'badges-390-midnight-silver-chosen', tap: SILVER },
  { w: 1280, wallpaper: 'lavender', name: 'badges-1280-lavender-chosen-focus', keyboard: true },
]

const browser = await chromium.launch({ channel: args.channel ?? 'chrome', headless: true })
let failed = 0
try {
  for (const s of shots) {
    const context = await browser.newContext(VP[s.w])
    await context.addInitScript(
      ({ list, wallpaper, birthday, key }) => {
        if (sessionStorage.getItem('seeded')) return
        sessionStorage.setItem('seeded', '1')
        localStorage.setItem('hannas-reading-list:v1', JSON.stringify(list))
        localStorage.setItem('hannas-reading-list:room', JSON.stringify({ wallpaper }))
        if (birthday) localStorage.setItem(key, birthday)
      },
      { list: shelf, wallpaper: s.wallpaper, birthday: s.birthday ?? null, key: BIRTHDAY },
    )
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto(URL + '/?view=dashboard')
    const card = page.locator('section.dash-card', { has: page.locator('#badges-title') })
    await card.waitFor({ timeout: 60_000 })
    await page.waitForTimeout(1200)
    // grow the window to the whole page (same width, same layout) so the shot has every medal
    const tall = await page.evaluate(() => Math.max(...[...document.querySelectorAll('*')].map((e) => e.scrollHeight)))
    await page.setViewportSize({ width: s.w, height: Math.min(tall + 400, 12_000) })
    await page.waitForTimeout(600)
    const row = card.locator('.birthday-row')
    const stored = () => page.evaluate((k) => localStorage.getItem(k), BIRTHDAY)
    const steps = []
    if (s.tap) await card.locator(s.tap).first().click()
    if (s.change) await row.getByRole('button', { name: 'Change birthday' }).click()
    if (s.pick) {
      await row.getByRole('combobox', { name: 'Day' }).selectOption(s.pick[0])
      await row.getByRole('combobox', { name: 'Month' }).selectOption(s.pick[1])
      steps.push(`picked ${s.pick.join('/')}: stored ${await stored()}`)
      await row.getByRole('button', { name: 'Save' }).click()
      steps.push(`after Save: stored ${await stored()}`)
    }
    if (s.keyboard) {
      // focus a medal by keyboard, → to the next, Enter: chosen and still focused
      await card.locator('.medals button[tabindex="0"]').focus()
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('Enter')
    }
    await page.mouse.move(0, 0)
    await page.waitForTimeout(500)
    await card.scrollIntoViewIfNeeded()
    await page.waitForTimeout(300)
    const facts = await card.evaluate((el) => {
      const ms = [...el.querySelectorAll('.medals button')]
      const tops = ms.map((m) => m.getBoundingClientRect().top)
      const controls = [...el.querySelectorAll('.birthday-row select, .birthday-row button')]
      const focused = document.activeElement
      return {
        perRow: tops.filter((t) => t === tops[0]).length,
        medals: ms.length,
        row: el.querySelector('.birthday-row')?.innerText.replace(/\s+/g, ' ').trim() ?? '',
        heights: controls.map((c) => `${c.getAttribute('aria-label') ?? c.textContent.trim()} ${Math.round(c.getBoundingClientRect().height)}`).join(', '),
        // lines of controls, by their middles (selects and buttons differ in height)
        rowLines: new Set(controls.map((c) => Math.round((c.getBoundingClientRect().top + c.getBoundingClientRect().bottom) / 2 / 8))).size,
        card: el.querySelector('#badges-card')?.innerText.replace(/\s+/g, ' ').trim() ?? '',
        focus: focused?.getAttribute('aria-label') ?? focused?.tagName,
        focusVisible: focused?.matches(':focus-visible') ?? false,
        shadow: focused?.classList.contains('chosen') ? getComputedStyle(focused).boxShadow : '',
      }
    })
    await card.screenshot({ path: join(OUT, `${s.name}.png`) })
    steps.push(`stored ${await stored()}`)
    if (s.then === 'save') {
      // the real flow after the shot: pick 14 May and Save
      await row.getByRole('combobox', { name: 'Day' }).selectOption('14')
      await row.getByRole('combobox', { name: 'Month' }).selectOption('05')
      steps.push(`picked 14/05: stored ${await stored()}`)
      await row.getByRole('button', { name: 'Save' }).click()
      const after = await row.innerText()
      const cake = await card.locator(CAKE).getAttribute('aria-label')
      steps.push(`after Save: stored ${await stored()}, row "${after.replace(/\s+/g, ' ').trim()}", medal "${cake}"`)
    }
    if (errors.length) failed++
    console.log(
      `${s.name}.png | errors ${errors.length} | ${facts.medals} medals, ${facts.perRow} a row | row: ${facts.row} (${facts.rowLines} line(s)) | heights: ${facts.heights}` +
        (facts.card ? ` | card: ${facts.card}` : '') +
        (s.keyboard ? ` | focus: ${facts.focus} (focus-visible ${facts.focusVisible})` : '') +
        (facts.shadow ? ` | chosen ring: ${facts.shadow}` : '') +
        ` | ${steps.join('; ')}`,
    )
    await context.close()
  }
} finally {
  await browser.close()
}
process.exitCode = failed ? 1 : 0
