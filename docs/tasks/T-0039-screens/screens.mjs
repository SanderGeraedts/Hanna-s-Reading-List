#!/usr/bin/env node
// T-0039: tap a country on the world map, zoom and pan it. Checks and screenshots.
//
//   pnpm exec vite dev --port 3155 --strictPort      (no POCKETBASE_URL, no .netlify link: G-0019)
//   node docs/tasks/T-0039-screens/screens.mjs --url=http://localhost:3155
//
// playwright-core is not a dependency of the app: when it can't be imported from here, pass
// --pw=<path to playwright-core's index.mjs>. Seeds demo books (never a real shelf) in
// localStorage, in many countries and in imaginary lands, and drives the Dashboard's
// "Where your books are set" block at 390 × 844 (touch: real CDP touch events) and 1280 × 800.
// Prints one line per check (ok / FAIL) and writes the screenshots next to this file.
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = 'true'] = a.replace(/^--/, '').split('=')
    return [k, v]
  }),
)
const URL = (args.url ?? 'http://localhost:3155').replace(/\/$/, '')
const OUT = dirname(fileURLToPath(import.meta.url))
const { chromium } = await import('playwright-core').catch(() => import(pathToFileURL(args.pw).href))

// ---- demo shelf ---------------------------------------------------------------------------------
const COLOURS = ['#2e5a8a', '#8a2e2e', '#4f7a3a', '#c99a45', '#6b4a8a', '#3d6b6b', '#8a5a2b']
let n = 0
const book = (title, isbn, places, finished) => ({
  id: `b${++n}`,
  title,
  authors: ['A. Author'],
  color: COLOURS[n % COLOURS.length],
  status: 'read',
  readCount: 1,
  finished: [finished],
  ratingAsked: finished,
  addedAt: n,
  language: 'en',
  genres: ['Fiction'],
  factsChecked: '',
  places,
  ...(isbn ? { coverUrl: `/api/cover/isbn/${isbn}?size=L` } : {}),
})
const shelf = [
  book('The Great Gatsby', '9780743273565', ['New York (N.Y.)'], '2026-10-01'),
  book('To Kill a Mockingbird', '9780061120084', ['Alabama', 'United States'], '2026-08-12'),
  book('Little Women', '9780147514011', ['Massachusetts'], '2025-12-24'),
  book('The Grapes of Wrath', '9780143039433', ['California'], '2025-09-09'),
  book('Pride and Prejudice', '9780141439518', ['England'], '2026-09-15'),
  book('Jane Eyre', '9780141441146', ['Yorkshire (England)'], '2026-03-20'),
  book('Wuthering Heights', '9780141439556', ['Yorkshire'], '2025-10-31'),
  book('Emma', null, ['England'], '2025-01-05'),
  book('Dracula', '9780141439846', ['England', 'Transylvania'], '2024-10-31'),
  book('Les Misérables', '9780451419439', ['Paris (France)'], '2026-05-05'),
  book('The Count of Monte Cristo', '9780140449266', ['France', 'Rome'], '2025-08-08'),
  book('The Name of the Rose', '9780156001311', ['Italy'], '2025-02-14'),
  book('Norwegian Wood', '9780375704024', ['Tokyo (Japan)'], '2026-04-04'),
  book('Anna Karenina', '9780143035008', ['Moscow', 'Saint Petersburg'], '2024-12-12'),
  book('The Miniaturist', '9780062306845', ['Amsterdam (Netherlands)'], '2026-02-02'),
  book('The Book Thief', '9780375842207', ['Germany'], '2025-11-11'),
  book('The Shadow of the Wind', '9780143034902', ['Barcelona (Spain)'], '2025-07-07'),
  book('The Secret History of Greece', null, ['Greece'], '2024-05-05'),
  book('A Fine Balance', '9781400030651', ['India'], '2025-04-04'),
  book('Things Fall Apart', '9780385474542', ['Nigeria'], '2024-03-03'),
  book('Anne of Green Gables', '9780141321592', ['Canada'], '2024-08-08'),
  book('Harry Potter and the Philosopher’s Stone', '9780747532699', ['England', 'Hogwarts School of Witchcraft and Wizardry (Imaginary place)'], '2026-06-30'),
  book('Harry Potter and the Chamber of Secrets', '9780747538493', ['Hogwarts (Imaginary place)'], '2026-07-15'),
  book('Harry Potter and the Prisoner of Azkaban', null, ['Hogwarts (Imaginary place)'], '2026-08-01'),
  book('The Lion, the Witch and the Wardrobe', '9780064404990', ['Narnia (Imaginary place)', 'England'], '2025-12-01'),
  book('The Fellowship of the Ring', '9780547928210', ['Middle-earth (Imaginary place)'], '2025-03-03'),
]

// ---- helpers ------------------------------------------------------------------------------------
let failures = 0
const check = (ok, what, detail = '') => {
  if (!ok) failures++
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${detail ? ` (${detail})` : ''}`)
}
const wait = (page, ms) => page.waitForTimeout(ms)

const browser = await chromium.launch({ channel: args.channel ?? 'chrome', headless: true })

async function open(width, wallpaper) {
  const phone = width === 390
  const ctx = await browser.newContext(
    phone
      ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
      : { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
  )
  await ctx.addInitScript(
    ({ list, wallpaper }) => {
      if (sessionStorage.getItem('t39-seeded')) return
      for (const k of Object.keys(localStorage)) if (k.startsWith('hannas-reading-list')) localStorage.removeItem(k)
      localStorage.setItem('hannas-reading-list:v1', JSON.stringify(list))
      localStorage.setItem('hannas-reading-list:room', JSON.stringify({ wallpaper }))
      sessionStorage.setItem('t39-seeded', '1')
    },
    { list: shelf, wallpaper },
  )
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  // a cover Open Library doesn't have answers 404 (the spine colour shows, T-0018), and the dev server has no
  // favicon.ico: neither is an error of this block
  page.on('console', (m) => m.type() === 'error' && !/\/api\/cover\/|\/favicon\.ico$/.test(m.location()?.url ?? '') && errors.push(`${m.text()} ${m.location()?.url ?? ''}`))
  const cdp = phone ? await ctx.newCDPSession(page) : null
  await gotoDashboard(page)
  return { ctx, page, cdp, errors, phone }
}
async function gotoDashboard(page) {
  await page.goto(URL + '/?view=dashboard', { waitUntil: 'load' })
  await page.locator('section.world-card svg.world-map').waitFor({ timeout: 60_000 })
  await centreMap(page)
  await wait(page, 1500)
}
/** the map in the middle of the screen, clear of the header */
const centreMap = async (page) => {
  await page.evaluate(() => document.querySelector('svg.world-map').scrollIntoView({ block: 'center' }))
  await wait(page, 400)
}
const card = (page) => page.locator('section.world-card')
const viewBox = (page) => page.evaluate(() => document.querySelector('svg.world-map').getAttribute('viewBox').split(' ').map(Number))
const scrolled = (page) => page.evaluate(() => ({ win: Math.round(scrollY), dash: Math.round(document.querySelector('.dashboard')?.scrollTop ?? 0) }))
const pageMoved = (a, b) => a.win !== b.win || a.dash !== b.dash
const cardHeading = (page) => page.evaluate(() => document.querySelector('.world-pick h3')?.textContent ?? null)
/** a point on screen where the map shows this country (or its tap zone) */
const pointIn = (page, name) =>
  page.evaluate((name) => {
    const p = [...document.querySelectorAll('svg.world-map path.world-country')].find((e) => e.getAttribute('data-country') === name)
    const r = p.getBoundingClientRect()
    const pts = []
    for (let i = 1; i < 16; i++) for (let j = 1; j < 16; j++) pts.push([r.left + (r.width * i) / 16, r.top + (r.height * j) / 16])
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    pts.sort((a, b) => Math.hypot(a[0] - cx, a[1] - cy) - Math.hypot(b[0] - cx, b[1] - cy))
    for (const [x, y] of pts) {
      if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue
      const hits = document.elementsFromPoint(x, y)
      // the country's own shape there, and no other country's tap zone above it unless it's a lit shape (which wins over a zone)
      const own = hits.find((e) => e.classList?.contains('world-country'))
      if (own?.getAttribute('data-country') !== name) continue
      const top = hits.find((e) => e.getAttribute?.('data-country'))
      if (top === own || own.classList.contains('lit') || top?.getAttribute('data-country') === name) return { x: Math.round(x), y: Math.round(y) }
    }
    return null
  }, name)
/** a tap: a real touch on the phone, a click on the computer */
async function tap(env, x, y) {
  if (env.phone) await env.page.touchscreen.tap(x, y)
  else await env.page.mouse.click(x, y)
  await wait(env.page, 350)
}
async function touchDrag(env, x0, y0, x1, y1, steps = 14) {
  const { cdp, page } = env
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0, id: 1 }] })
  for (let i = 1; i <= steps; i++)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + ((x1 - x0) * i) / steps, y: y0 + ((y1 - y0) * i) / steps, id: 1 }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await wait(page, 700)
}
async function pinch(env, cx, cy, d0, d1, steps = 14) {
  const { cdp, page } = env
  const pts = (d) => [
    { x: cx - d / 2, y: cy, id: 1 },
    { x: cx + d / 2, y: cy, id: 2 },
  ]
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(d0) })
  for (let i = 1; i <= steps; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(d0 + ((d1 - d0) * i) / steps) })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await wait(page, 500)
}
async function mouseDrag(page, x0, y0, x1, y1) {
  await page.mouse.move(x0, y0)
  await page.mouse.down()
  for (let i = 1; i <= 12; i++) await page.mouse.move(x0 + ((x1 - x0) * i) / 12, y0 + ((y1 - y0) * i) / 12)
  await page.mouse.up()
  await wait(page, 350)
}
// the app's fixed header and buttons would lie over the block in an element shot: hidden while snapping
async function snap(loc, name) {
  const page = loc.page()
  await page.evaluate(() => {
    for (const e of document.querySelectorAll('body *')) {
      if (e.closest('.world-card') || e.querySelector('.world-card')) continue
      const p = getComputedStyle(e).position
      if (p === 'fixed' || p === 'sticky') e.setAttribute('data-shot-hidden', e.style.visibility || ' '), (e.style.visibility = 'hidden')
    }
  })
  // a block taller than the screen only draws what's on screen: a taller window while snapping
  const vp = page.viewportSize()
  const h = Math.ceil((await loc.boundingBox()).height) + 240
  if (h > vp.height) {
    await page.setViewportSize({ width: vp.width, height: h })
    await loc.scrollIntoViewIfNeeded()
    await page.waitForTimeout(600)
  }
  await loc.screenshot({ path: join(OUT, `${name}.png`) })
  if (h > vp.height) {
    await page.setViewportSize(vp)
    await centreMap(page)
  }
  await page.evaluate(() => {
    for (const e of document.querySelectorAll('[data-shot-hidden]')) (e.style.visibility = e.getAttribute('data-shot-hidden').trim()), e.removeAttribute('data-shot-hidden')
  })
  console.log(`     shot ${name}.png`)
}
/** the land and card covers are lazy: bring them in before a shot */
async function loadCovers(page) {
  for (const img of await card(page).locator('.world-cover img').all()) await img.scrollIntoViewIfNeeded().catch(() => {})
  await centreMap(page)
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
  await wait(page, 600)
}
const noDigits = (page) =>
  page.evaluate(() => {
    const block = document.querySelector('.world-card')
    const bad = []
    if (/\d/.test(block.innerText)) bad.push('text: ' + block.innerText.match(/.*\d.*/g).join(' | '))
    for (const el of block.querySelectorAll('[aria-label], [title], [alt]'))
      for (const a of ['aria-label', 'title', 'alt']) if (/\d/.test(el.getAttribute(a) ?? '')) bad.push(`${a}: ${el.getAttribute(a)}`)
    for (const t of block.querySelectorAll('title')) if (/\d/.test(t.textContent)) bad.push('svg title: ' + t.textContent)
    return bad
  })
const noSideScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.body.scrollWidth <= innerWidth)

// ---- the checks ---------------------------------------------------------------------------------
async function run(width) {
  console.log(`\n== ${width} (lavender) ==`)
  const env = await open(width, 'lavender')
  const { page } = env
  const w0 = (await viewBox(page))[2]

  // the zoom strip: under the map, inside its frame, + − ⤢, 44 × 44
  const strip = await page.evaluate(() => {
    const svg = document.querySelector('svg.world-map').getBoundingClientRect()
    const frame = document.querySelector('.world-map-frame').getBoundingClientRect()
    return [...document.querySelectorAll('.world-zoom button')].map((b) => {
      const r = b.getBoundingClientRect()
      return { glyph: b.textContent, label: b.getAttribute('aria-label'), w: r.width, h: r.height, below: r.top >= svg.bottom - 0.5, inside: r.bottom <= frame.bottom + 0.5 && r.right <= frame.right + 0.5, x: r.left, disabled: b.disabled }
    })
  })
  check(strip.map((b) => b.glyph).join(' ') === '+ − ⤢', 'zoom buttons + − ⤢, left to right', strip.map((b) => b.glyph).join(' '))
  check(strip.map((b) => b.label).join(', ') === 'Zoom in, Zoom out, Show the whole map', 'zoom labels', strip.map((b) => b.label).join(', '))
  check(strip.every((b) => b.w === 44 && b.h === 44), 'zoom buttons 44 × 44', strip.map((b) => `${b.w}×${b.h}`).join(' '))
  check(strip.every((b) => b.below && b.inside) && strip[0].x < strip[1].x && strip[1].x < strip[2].x, 'zoom strip under the map, inside its frame')
  check(!strip[0].disabled && strip[1].disabled && strip[2].disabled, 'at zoom one − and ⤢ are disabled')
  if (env.phone) await snap(page.locator('.world-map-frame'), 'controls-390-lavender')

  // tap a lit country: the card, with covers in tile order; focus on its heading
  let pt = await pointIn(page, 'United Kingdom')
  await tap(env, pt.x, pt.y)
  check((await cardHeading(page)) === 'United Kingdom', 'tapping a lit country opens its card', `${await cardHeading(page)}`)
  check(await page.evaluate(() => document.activeElement?.matches('.world-pick h3')), 'opening a card moves focus to its heading')
  const covers = await page.evaluate(() => [...document.querySelectorAll('.world-pick .world-cover')].map((b) => ({ name: b.getAttribute('aria-label'), w: b.getBoundingClientRect().width, top: Math.round(b.getBoundingClientRect().top) })))
  check(covers.length === 7, 'the UK card has one cover per book', `${covers.length}: ${covers.map((c) => c.name).join(' / ')}`)
  check(covers.every((c) => c.w >= 44), 'card covers at least 44 px wide', covers.map((c) => c.w).join(','))
  check(new Set(covers.map((c) => c.top)).size >= 2 || width === 1280, 'covers wrap onto a second line on the phone', `${new Set(covers.map((c) => c.top)).size} lines`)
  const mark = await page.evaluate(() => {
    const top = getComputedStyle(document.querySelector('.world-marks .world-mark'))
    const edge = getComputedStyle(document.querySelector('.world-marks .world-mark-edge'))
    return { top: top.strokeWidth, edge: edge.strokeWidth, dash: top.strokeDasharray, ve: top.vectorEffect }
  })
  check(mark.top === '2.5px' && mark.edge === '5px' && mark.dash === 'none' && mark.ve === 'non-scaling-stroke', 'chosen country: solid 2.5 px gold over 5 px', JSON.stringify(mark))
  check((await noDigits(page)).length === 0, 'no digit in the block with a lit card open', (await noDigits(page)).join(' ; '))
  await loadCovers(page)
  await snap(card(page), `card-lit-${width}-lavender`)

  // × puts focus back on what opened it: here a name in the list (Enter on it)
  await page.locator('.world-pick .bingo-suggest-close').click()
  await page.locator('.world-top .world-name', { hasText: 'France' }).focus()
  await page.keyboard.press('Enter')
  await wait(page, 300)
  check((await cardHeading(page)) === 'France', 'Enter on a name opens its card')
  check(await page.evaluate(() => document.querySelector('.world-top .world-name.chosen')?.getAttribute('aria-expanded') === 'true'), 'the chosen name has aria-expanded true')
  await page.keyboard.press('Escape')
  await wait(page, 200)
  check((await cardHeading(page)) === null && (await page.evaluate(() => document.activeElement?.textContent)) === 'France', 'Escape closes it, focus back on the name')

  // a plain country
  await centreMap(page)
  pt = await pointIn(page, 'Brazil')
  await tap(env, pt.x, pt.y)
  const plainText = await page.evaluate(() => document.querySelector('.world-pick p')?.textContent)
  check((await cardHeading(page)) === 'Brazil' && plainText === 'No books set here yet.', 'a plain country: its name and "No books set here yet."', `${await cardHeading(page)} / ${plainText}`)
  const wash = await page.evaluate(() => getComputedStyle(document.querySelector('.world-marks .world-mark-edge.plain')).fill)
  check(/rgba\(217, 168, 91, 0\.18\)/.test(wash), 'a plain chosen country has the gold wash', wash)
  check((await noDigits(page)).length === 0, 'no digit in the block with a plain card open', (await noDigits(page)).join(' ; '))
  if (env.phone) await snap(card(page), 'card-plain-390-lavender')
  // tapping it again closes it
  await centreMap(page)
  pt = await pointIn(page, 'Brazil')
  await tap(env, pt.x, pt.y)
  check((await cardHeading(page)) === null, 'tapping the chosen country again closes the card')

  // the tiny Netherlands: a tap about 15 px off its edge, on the sea (phone, zoom one)
  if (env.phone) {
    await centreMap(page)
    const off = await page.evaluate(() => {
      const nl = [...document.querySelectorAll('svg.world-map path.world-country')].find((e) => e.getAttribute('data-country') === 'Netherlands')
      const r = nl.getBoundingClientRect()
      const sea = (x, y) => !document.elementsFromPoint(x, y).some((e) => e.classList?.contains('world-country'))
      for (const [x, y, side] of [
        [r.left - 15, r.top + r.height / 2, 'west'],
        [r.left + r.width / 2, r.top - 15, 'north'],
        [r.left - 11, r.top - 11, 'north-west'],
      ])
        if (sea(x, y)) return { x: Math.round(x), y: Math.round(y), side, w: r.width }
      return null
    })
    check(!!off, 'found the sea about 15 px off the Netherlands', JSON.stringify(off))
    if (off) {
      await tap(env, off.x, off.y)
      check((await cardHeading(page)) === 'Netherlands', 'a tap 15 px off the Netherlands (on the sea) opens its card', `${off.side} of a ${off.w.toFixed(1)} px wide country: ${await cardHeading(page)}`)
      await snap(card(page), 'tiny-390-lavender')
      await page.locator('.world-pick .bingo-suggest-close').click()
    }
  }

  // a cover in the card opens its book
  await centreMap(page)
  pt = await pointIn(page, 'France')
  await tap(env, pt.x, pt.y)
  const cover = page.locator('.world-pick .world-cover').first()
  const coverName = await cover.getAttribute('aria-label')
  if (env.phone) {
    const b = await cover.boundingBox()
    await tap(env, b.x + b.width / 2, b.y + b.height / 2)
  } else await cover.click()
  const panel = page.locator(`aside.panel[aria-label="Details for ${coverName}"]`)
  check(await panel.waitFor({ timeout: 5000 }).then(() => true, () => false), 'tapping a cover in the card opens that book’s panel', coverName)

  // a land cover opens its book
  await gotoDashboard(page)
  const land = card(page).locator('.world-land-books .world-cover').first()
  await land.scrollIntoViewIfNeeded()
  const landName = await land.getAttribute('aria-label')
  const lw = (await land.boundingBox()).width
  check(lw >= 44, 'land covers at least 44 px wide', `${lw}`)
  if (env.phone) {
    const b = await land.boundingBox()
    await tap(env, b.x + b.width / 2, b.y + b.height / 2)
  } else await land.click()
  check(
    await page.locator(`aside.panel[aria-label="Details for ${landName}"]`).waitFor({ timeout: 5000 }).then(() => true, () => false),
    'tapping a land cover opens its book',
    landName,
  )
  await gotoDashboard(page)

  // zoom one: the page scrolls under a swipe and under a plain wheel, the map doesn't move
  const box = await page.locator('svg.world-map').boundingBox()
  const cx = Math.round(box.x + box.width / 2)
  const cy = Math.round(box.y + box.height / 2)
  if (env.phone) {
    const s0 = await scrolled(page)
    await touchDrag(env, cx, cy + 30, cx, cy - 120)
    const s1 = await scrolled(page)
    check(pageMoved(s0, s1) && (await viewBox(page))[2] === w0, 'zoom one: a one-finger swipe over the map scrolls the page', `${JSON.stringify(s0)} → ${JSON.stringify(s1)}`)
    check((await cardHeading(page)) === null, 'the swipe opened no card')
    await centreMap(page)
  }
  {
    await page.mouse.move(cx, cy)
    const s0 = await scrolled(page)
    await page.mouse.wheel(0, 240)
    await wait(page, 600)
    const s1 = await scrolled(page)
    check(pageMoved(s0, s1) && (await viewBox(page))[2] === w0, 'zoom one: a plain wheel over the map scrolls the page, no zoom', `${JSON.stringify(s0)} → ${JSON.stringify(s1)}`)
    await centreMap(page)
  }

  // buttons: one press doubles, three reach the maximum, ⤢ brings it back
  {
    const zoomIn = page.getByRole('button', { name: 'Zoom in' })
    await zoomIn.click()
    await wait(page, 300)
    const w1 = (await viewBox(page))[2]
    await zoomIn.click()
    await wait(page, 300)
    await zoomIn.click()
    await wait(page, 300)
    const w3 = (await viewBox(page))[2]
    check(Math.abs(w1 - w0 / 2) < 0.01 && Math.abs(w3 - w0 / 8) < 0.01 && (await zoomIn.isDisabled()), 'one press doubles the zoom, three reach the maximum (+ disabled)', `${w0} → ${w1} → ${w3}`)
    const thin = await page.evaluate(() => {
      const s = getComputedStyle(document.querySelector('svg.world-map path.world-country:not(.lit)'))
      const o = getComputedStyle(document.querySelector('svg.world-map .world-outline'))
      return { border: s.strokeWidth, bve: s.vectorEffect, outline: o.strokeWidth, ove: o.vectorEffect }
    })
    check(thin.border === '0.3px' && thin.bve === 'non-scaling-stroke' && thin.ove === 'non-scaling-stroke', 'borders and gold outlines as thin at 8× as at zoom one', JSON.stringify(thin))
    check((await noDigits(page)).length === 0, 'no digit in the block zoomed in', (await noDigits(page)).join(' ; '))
    await page.getByRole('button', { name: 'Show the whole map' }).click()
    await wait(page, 300)
    check((await viewBox(page))[2] === w0, '⤢ shows the whole map again')
  }

  // pinch (phone) or Ctrl+scroll (computer) over Europe zooms around that point
  await centreMap(page)
  const eu = await pointIn(page, 'France')
  const s0 = await scrolled(page)
  if (env.phone) await pinch(env, eu.x, eu.y, 40, 160)
  else {
    await page.mouse.move(eu.x, eu.y)
    await page.keyboard.down('Control')
    for (let i = 0; i < 4; i++) await page.mouse.wheel(0, -35)
    await page.keyboard.up('Control')
    await wait(page, 400)
  }
  const vz = await viewBox(page)
  const scale = await page.evaluate(() => visualViewport?.scale ?? 1)
  check(vz[2] < w0 / 2, env.phone ? 'a two-finger pinch (CDP touch) zooms the map' : 'Ctrl+scroll zooms the map, not the page', `w ${w0} → ${vz[2].toFixed(1)}, page scale ${scale}`)
  check(scale === 1 && !pageMoved(s0, await scrolled(page)), 'the page itself neither zoomed nor scrolled')
  check((await pointIn(page, 'France')) !== null, 'the point zoomed around (France) is still on the map')
  check((await cardHeading(page)) === null, 'the pinch / zoom opened no card')

  // zoomed in: a drag pans the map, doesn't scroll the page, and opens no card
  {
    const before = await viewBox(page)
    const sb = await scrolled(page)
    if (env.phone) await touchDrag(env, cx + 40, cy, cx - 40, cy + 20)
    else await mouseDrag(page, cx + 40, cy, cx - 40, cy + 20)
    const after = await viewBox(page)
    check(after[0] !== before[0] && !pageMoved(sb, await scrolled(page)), `zoomed in: a ${env.phone ? 'one-finger' : 'mouse'} drag pans the map and doesn't scroll the page`, `x ${before[0].toFixed(1)} → ${after[0].toFixed(1)}`)
    check((await cardHeading(page)) === null, 'a drag never opens a card')
    const all = await page.evaluate(() => [...document.querySelectorAll('.world-zoom button')].every((b) => !b.disabled))
    check(all, 'zoomed in: all three zoom buttons enabled')
    // a tap still opens a country when zoomed in
    const p = await pointIn(page, 'Germany')
    if (p) {
      await tap(env, p.x, p.y)
      check((await cardHeading(page)) === 'Germany', 'zoomed in, a tap still opens a country', `${await cardHeading(page)}`)
      await page.locator('.world-pick .bingo-suggest-close').click()
    }
    await loadCovers(page)
    if (env.phone || width === 1280) await snap(card(page).locator('.world-map-frame'), `zoomed-${width}-lavender`)
  }

  // keyboard: Tab reaches the lit countries, the zoom buttons and the names; Enter opens a card
  if (!env.phone) {
    await page.getByRole('button', { name: 'Show the whole map' }).click()
    await wait(page, 300)
    await page.evaluate(() => document.getElementById('world-title').focus())
    const seen = []
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab')
      const a = await page.evaluate(() => {
        const e = document.activeElement
        if (!e?.closest('.world-card')) return null
        return { label: e.getAttribute('aria-label') ?? e.textContent.trim(), kind: e.classList.contains('world-country') ? 'country' : e.classList.contains('world-name') ? 'name' : e.closest('.world-zoom') ? 'zoom' : e.classList.contains('world-cover') ? 'cover' : e.tagName }
      })
      if (!a) break
      seen.push(a)
    }
    const kinds = seen.map((s) => s.kind)
    check(kinds.includes('country') && kinds.includes('zoom') && kinds.includes('name'), 'Tab reaches the lit countries, the zoom buttons and the list names', seen.map((s) => `${s.kind}:${s.label}`).join(', '))
    check(kinds.indexOf('country') < kinds.indexOf('zoom') && kinds.indexOf('zoom') < kinds.indexOf('name') && kinds.lastIndexOf('name') < kinds.lastIndexOf('cover'), 'Tab order: countries, zoom, names, land covers')
    // Tab to the United Kingdom: the dashed mark; Enter opens its card; Escape back on it
    await page.evaluate(() => document.getElementById('world-title').focus())
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab')
      if (await page.evaluate(() => document.activeElement?.getAttribute('aria-label') === 'United Kingdom')) break
    }
    const dashed = await page.evaluate(() => {
      const m = document.querySelector('.world-marks .world-mark.focus')
      return m ? getComputedStyle(m).strokeDasharray : null
    })
    check(!!dashed && dashed !== 'none', 'a Tab-focused lit country has the dashed gold mark', `${dashed}`)
    await snap(card(page), 'focus-1280-lavender')
    await page.keyboard.press('Enter')
    await wait(page, 300)
    check((await cardHeading(page)) === 'United Kingdom', 'Enter on a focused country opens its card')
    await page.keyboard.press('Escape')
    await wait(page, 200)
    check(await page.evaluate(() => document.activeElement?.getAttribute('aria-label') === 'United Kingdom'), 'Escape puts focus back on the country')
  } else {
    // the land covers, one focused by the keyboard: the gold ring
    const land = card(page).locator('.world-land-books .world-cover').nth(1)
    await land.scrollIntoViewIfNeeded()
    await page.keyboard.press('Shift')
    await land.focus()
    const ring = await land.evaluate((e) => e.matches(':focus-visible') && getComputedStyle(e).outlineStyle)
    check(ring === 'solid', 'a keyboard-focused land cover has the gold ring', `${ring}`)
    await loadCovers(page)
    await land.focus()
    await snap(card(page).locator('.world-lands-block'), 'lands-focus-390-lavender')
  }

  check(await noSideScroll(page), 'no horizontal scroll of the page')
  check(env.errors.length === 0, 'no console errors', env.errors.join(' | '))
  await env.ctx.close()
}

/** the midnight wallpaper: the same card, mark and zoom (only the wallpaper around the card differs) */
async function midnight(width) {
  console.log(`\n== ${width} (midnight) ==`)
  const env = await open(width, 'midnight')
  const { page } = env
  const pt = await pointIn(page, 'United Kingdom')
  await tap(env, pt.x, pt.y)
  check((await cardHeading(page)) === 'United Kingdom', 'midnight: the UK card opens')
  await loadCovers(page)
  await snap(card(page), `card-lit-${width}-midnight`)
  if (env.phone) {
    await page.locator('.world-pick .bingo-suggest-close').click()
    await centreMap(page)
    const eu = await pointIn(page, 'France')
    await pinch(env, eu.x, eu.y, 40, 160)
    const box = await page.locator('svg.world-map').boundingBox()
    await touchDrag(env, box.x + box.width / 2 + 30, box.y + box.height / 2, box.x + box.width / 2 - 10, box.y + box.height / 2 + 10)
    await loadCovers(page)
    await snap(card(page).locator('.world-map-frame'), 'zoomed-390-midnight')
  }
  check(env.errors.length === 0, 'midnight: no console errors', env.errors.join(' | '))
  await env.ctx.close()
}

try {
  for (const w of [390, 1280]) {
    await run(w)
    await midnight(w)
  }
} finally {
  await browser.close()
}
console.log(`\n${failures ? `${failures} check(s) failed` : 'all checks passed'}`)
process.exit(failures ? 1 : 0)
