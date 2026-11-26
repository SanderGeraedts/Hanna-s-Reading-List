#!/usr/bin/env node
// Measures whether every piece of text on every page can actually be read
// (T-0115, D-0087), the way measure-shelf.mjs measures what the shelf costs:
// from the browser, so it is fair to every look and needs no app code.
//
//   pnpm run dev                                    (another terminal)
//   URL=http://localhost:3000 pnpm run measure:contrast
//
// Options: --looks=lavender,midnight,night  --views=phone,desktop
//          --pages=shelf,dashboard,stats,challenges,calendar,creatures,garden
//          --json=out.json  --all   (--all prints every element, not only the faint ones)
//
// It seeds a demo shelf in the browser's own storage and never signs in, so it
// never touches a real shelf (G-0019). `pnpm run preview` does NOT serve this
// app (it answers 500: the server functions need the Netlify server), so this
// runs against the dev server; the dev server may pick 3001 or 3002 when 3000
// is taken, so the address comes from URL.
//
// For every visible piece of text it works out two colours:
//   - the colour it is really drawn in: its own `color`, blended over what is
//     behind it, with every `opacity` on the way up applied (exactly: a group
//     with opacity o over a backdrop is the group's pixels lerped to the
//     backdrop by o);
//   - the colour really behind it: every ancestor's background composited, a
//     gradient taken at its worst stop, down to the page. Behind the shelf
//     there is no page colour at all but the 3D room, so the darkest wood,
//     rgb(43, 29, 18), stands in for it.
// Then it reports the WCAG contrast and flags anything under 4.5:1 — 3:1 for
// text of 24px or more, for bold text of 19px or more, and for icons.
import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'
import { demoBooks } from './measure-shelf.mjs'

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = 'true'] = a.replace(/^--/, '').split('=')
    return [k, v]
  }),
)
const URL = process.env.URL ?? args.url ?? 'http://localhost:3000'
const LOOKS = (args.looks ?? 'lavender,midnight,night').split(',')
const VIEWS = (args.views ?? 'phone,desktop').split(',')
const PAGES = (args.pages ?? 'shelf,dashboard,stats,challenges,calendar,creatures,garden').split(',')
const SHOW_ALL = args.all === 'true'

const VIEWPORTS = {
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
}

/** The three looks: the two wallpapers by day, and night mode (D-0085). */
const ROOMS = {
  lavender: { wood: 'walnut', wallpaper: 'lavender', night: 'off' },
  midnight: { wood: 'walnut', wallpaper: 'midnight', night: 'off' },
  night: { wood: 'walnut', wallpaper: 'lavender', night: 'on' },
}

const ADDRESS = (page) => (page === 'shelf' ? `${URL}/` : `${URL}/?view=${page}`)

/** measure-shelf's demo books, with finishing dates, ratings and genres so Stats,
 *  Challenges and the Calendar have something to draw. Never a real shelf (G-0019). */
const books = () =>
  demoBooks(60).map((b, i) => ({
    ...b,
    genres: [['Fantasy'], ['Romance'], ['Horror'], ['Classic'], ['Thriller']][i % 5],
    rating: (i % 5) + 1,
    ...(b.status === 'read' && {
      finished: [`2026-${String((i % 11) + 1).padStart(2, '0')}-${String((i % 27) + 1).padStart(2, '0')}`],
      readCount: 1,
    }),
  }))

// ---------------------------------------------------------------- in the page
// Everything below runs in the browser: it may not use anything from this file.
function measure(darkestWood) {
  const BEHIND_THE_SHELF = darkestWood // the 3D room is not a background the page can report

  /** "rgb(1, 2, 3)" / "rgba(1, 2, 3, .5)" / "#abc" → [r, g, b, a], or null. */
  const parse = (v) => {
    if (!v) return null
    const s = v.trim()
    if (s === 'transparent' || s === 'none') return [0, 0, 0, 0]
    let m = s.match(/^rgba?\(([^)]+)\)/)
    if (m) {
      const p = m[1].split(/[,/]/).map((x) => parseFloat(x))
      return [p[0], p[1], p[2], p.length > 3 && !Number.isNaN(p[3]) ? p[3] : 1]
    }
    m = s.match(/^#([0-9a-f]{3,8})$/i)
    if (m) {
      let h = m[1]
      if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('')
      const n = parseInt(h.slice(0, 6), 16)
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255, h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1]
    }
    return null
  }
  /** a see-through colour over an opaque one */
  const over = (top, under) => [
    top[0] * top[3] + under[0] * (1 - top[3]),
    top[1] * top[3] + under[1] * (1 - top[3]),
    top[2] * top[3] + under[2] * (1 - top[3]),
    1,
  ]
  /** a group drawn with opacity o over its backdrop */
  const lerp = (c, backdrop, o) => [
    c[0] * o + backdrop[0] * (1 - o),
    c[1] * o + backdrop[1] * (1 - o),
    c[2] * o + backdrop[2] * (1 - o),
    1,
  ]
  const luminance = ([r, g, b]) => {
    const ch = (c) => {
      const s = c / 255
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)
  }
  const contrast = (a, b) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
    return (hi + 0.05) / (lo + 0.05)
  }

  const CLEAR = [0, 0, 0, 0]
  /** the top-level pieces of a background-image or a gradient's inside */
  const pieces = (s) => {
    const out = []
    let depth = 0
    let start = 0
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '(') depth++
      else if (s[i] === ')') depth--
      else if (s[i] === ',' && depth === 0) {
        out.push(s.slice(start, i).trim())
        start = i + 1
      }
    }
    out.push(s.slice(start).trim())
    return out.filter(Boolean)
  }

  /**
   * One background layer, as the colour it puts at the point the text sits at.
   * A gradient down the box is read at that point, which matters: the header's
   * haze is nearly solid at the title and gone at the bottom edge.
   */
  const layerColour = (layer, boxTop, boxHeight, pointY) => {
    const open = layer.indexOf('(')
    const kind = open < 0 ? '' : layer.slice(0, open).replace(/^-\w+-/, '')
    const inside = open < 0 ? '' : layer.slice(open + 1, layer.lastIndexOf(')'))
    if (/^url/.test(layer)) return { colour: CLEAR, guessed: true }
    if (kind === 'radial-gradient' || kind === 'conic-gradient') return { colour: CLEAR } // stars and dots: too small to sit under a word
    if (kind !== 'linear-gradient' && kind !== 'repeating-linear-gradient') return { colour: parse(layer) ?? CLEAR }

    const parts = pieces(inside)
    const head = parts[0]
    const hasDirection = /^(to\b|-?[\d.]+(deg|turn|rad|grad)|in\b)/.test(head)
    const direction = hasDirection ? head : 'to bottom'
    const stops = (hasDirection ? parts.slice(1) : parts).map((p) => {
      const colour = parse(p.match(/^(rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}|[a-z]+)/)?.[1] ?? '') ?? CLEAR
      const at = [...p.matchAll(/(-?[\d.]+)(%|px)/g)].map((m) => (m[2] === '%' ? Number(m[1]) / 100 : Number(m[1]) / (boxHeight || 1)))
      return { colour, at: at.length ? at[0] : null }
    })
    const down = /^(to bottom|180deg|0\.5turn)$/.test(direction)
    const up = /^(to top|0deg|360deg)$/.test(direction)
    if (kind === 'repeating-linear-gradient' || !(down || up)) {
      // stripes, or a gradient across: the stop that changes the backdrop most
      return { colour: stops.reduce((worst, s) => (s.colour[3] > worst[3] ? s.colour : worst), CLEAR) }
    }
    // fill in the positions the CSS left out, then read the gradient where the text is
    if (stops[0].at === null) stops[0].at = 0
    if (stops[stops.length - 1].at === null) stops[stops.length - 1].at = 1
    for (let i = 1; i < stops.length - 1; i++) {
      if (stops[i].at !== null) continue
      let j = i
      while (stops[j].at === null) j++
      const from = stops[i - 1].at
      for (let k = i; k < j; k++) stops[k].at = from + ((stops[j].at - from) * (k - i + 1)) / (j - i + 1)
    }
    let t = boxHeight ? (pointY - boxTop) / boxHeight : 0
    if (up) t = 1 - t
    t = Math.min(1, Math.max(0, t))
    let a = stops[0]
    let b = stops[stops.length - 1]
    for (let i = 0; i < stops.length - 1; i++) {
      if (t >= stops[i].at && t <= stops[i + 1].at) {
        a = stops[i]
        b = stops[i + 1]
        break
      }
    }
    const span = b.at - a.at
    const k = span <= 0 ? 0 : (t - a.at) / span
    return { colour: [0, 1, 2, 3].map((i) => a.colour[i] + (b.colour[i] - a.colour[i]) * k) }
  }

  /** what one element puts behind the text: its background layers over its background colour. */
  const layersOf = (el, pointY) => {
    const s = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    const colour = parse(s.backgroundColor) ?? CLEAR
    const layers = []
    let guessed = false
    if (s.backgroundImage && s.backgroundImage !== 'none') {
      for (const layer of pieces(s.backgroundImage)) {
        const got = layerColour(layer, r.top, r.height, pointY)
        if (got.guessed) guessed = true
        if (got.colour[3] > 0) layers.push(got.colour)
      }
    }
    // painted back to front: the background colour first, then the layers in reverse
    return { stack: [colour, ...layers.reverse()].filter((c) => c[3] > 0), opacity: Number(s.opacity) || 0, guessed }
  }

  const isVisible = (el) => {
    const s = getComputedStyle(el)
    if (s.display === 'none' || s.visibility !== 'visible') return false
    const r = el.getBoundingClientRect()
    return r.width > 1 && r.height > 1
  }

  /** the text an element writes itself (not what its children write) */
  const ownText = (el) =>
    [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent)
      .join('')
      .replace(/\s+/g, ' ')
      .trim()

  const ICON_ONLY = /^[^\p{L}\p{N}]+$/u // emoji, arrows, ticks: judged as icons (3:1)

  // everything a reader sees: the words an element writes, and the grey hint inside an
  // empty box, which is text too even though it is not in the page's text
  const readable = []
  for (const el of document.querySelectorAll('body *')) {
    if (!isVisible(el)) continue
    const text = ownText(el)
    if (text) readable.push({ el, text, pseudo: null })
    const hint = el.getAttribute?.('placeholder')
    if (hint && !el.value) readable.push({ el, text: hint, pseudo: '::placeholder' })
  }

  const results = []
  for (const { el, text, pseudo } of readable) {
    const s = getComputedStyle(el, pseudo ?? undefined)
    const colour = parse(s.color) ?? [0, 0, 0, 1]
    const size = parseFloat(s.fontSize)
    const weight = Number(s.fontWeight) || 400
    const icon = ICON_ONLY.test(text)
    const big = size >= 24 || (size >= 19 && weight >= 700)
    const need = icon || big ? 3 : 4.5

    // the chain from <html> down to the element, each level read where the text sits
    const box = el.getBoundingClientRect()
    const pointY = box.top + box.height / 2
    const chain = []
    for (let n = el; n && n !== document.documentElement.parentElement; n = n.parentElement) chain.unshift(n)
    const levels = chain.map((n) => layersOf(n, pointY))
    if (levels.some((l) => l.opacity === 0)) continue

    // down the chain, carrying the opaque colour behind each group; an opacity on the
    // way fades the text and its own background together, over what is behind that group
    const paint = (i, backdrop) => {
      let local = backdrop
      for (const layer of levels[i].stack) local = over(layer, local)
      let fg
      let bg
      if (i === levels.length - 1) {
        bg = local
        fg = over(colour, local)
      } else {
        const inner = paint(i + 1, local)
        fg = inner.fg
        bg = inner.bg
      }
      const o = levels[i].opacity
      return { fg: lerp(fg, backdrop, o), bg: lerp(bg, backdrop, o) }
    }
    const { fg, bg } = paint(0, BEHIND_THE_SHELF)
    const worst = { ratio: contrast(fg, bg), fg, bg }

    const where = (() => {
      const bits = []
      for (let n = el; n && n !== document.body; n = n.parentElement) {
        const cls = (n.className && typeof n.className === 'string' ? n.className.trim().split(/\s+/)[0] : '') || ''
        bits.unshift(n.tagName.toLowerCase() + (cls ? '.' + cls : ''))
        if (bits.length >= 4) break
      }
      return bits.join(' > ')
    })()

    results.push({
      text: (pseudo ? 'hint: ' : '') + text.slice(0, 60),
      where,
      selector: el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).join('.') : ''),
      // a control that is deliberately dimmed to say "you can't do this" is judged apart
      disabled: !!el.closest('[aria-disabled="true"], button:disabled, input:disabled, select:disabled, textarea:disabled, fieldset:disabled'),
      size: Math.round(size),
      weight,
      kind: icon ? 'icon' : big ? 'big' : 'text',
      fg: `rgb(${worst.fg.map((n) => Math.round(n)).slice(0, 3).join(', ')})`,
      bg: `rgb(${worst.bg.map((n) => Math.round(n)).slice(0, 3).join(', ')})`,
      ratio: Math.round(worst.ratio * 100) / 100,
      need,
      // a light or dark halo under the letters (T-0096): WCAG cannot count it, but it is
      // there on purpose, so it is reported apart instead of "fixed" again
      ...(s.textShadow && s.textShadow !== 'none' && { halo: true }),
      ...(levels.some((l) => l.guessed) && { guessed: true }), // a picture behind it we could not read
    })
  }
  return results
}
// ------------------------------------------------------------ back on the node

async function sweep(browser, { look, view, page: name }) {
  const context = await browser.newContext(VIEWPORTS[view])
  await context.addInitScript(
    ({ books, room }) => {
      localStorage.setItem('hannas-reading-list:v1', JSON.stringify(books))
      localStorage.setItem('hannas-reading-list:room', JSON.stringify(room))
    },
    { books: books(), room: ROOMS[look] },
  )
  const page = await context.newPage()
  await page.goto(ADDRESS(name), { waitUntil: 'domcontentloaded' })
  // the dev server builds the app on the first visit, so give it room
  await page.waitForSelector('canvas', { timeout: 120_000 }).catch(() => {})
  await page.waitForFunction(() => !document.querySelector('.stage-loading'), null, { timeout: 120_000 }).catch(() => {})
  await page.waitForTimeout(6000)
  const found = await page.evaluate(measure, [43, 29, 18, 1])
  await context.close()
  return found.map((r) => ({ look, view, page: name, ...r }))
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  })
  const all = []
  try {
    for (const look of LOOKS)
      for (const view of VIEWS)
        for (const name of PAGES) {
          const found = await sweep(browser, { look, view, page: name })
          const faint = found.filter((r) => r.ratio < r.need)
          all.push(...found)
          console.log(
            `${look.padEnd(9)} ${view.padEnd(8)} ${name.padEnd(11)} ${String(found.length).padStart(4)} pieces of text, ${faint.length} too faint`,
          )
        }
  } finally {
    await browser.close()
  }
  const faint = all.filter((r) => r.ratio < r.need)
  // one line per thing that is too faint, worst first; the same thing in two looks is two lines
  const seen = new Map()
  for (const r of SHOW_ALL ? all : faint) {
    const key = `${r.look}|${r.page}|${r.selector}|${r.ratio}`
    if (!seen.has(key)) seen.set(key, r)
  }
  const rows = [...seen.values()].sort((a, b) => a.ratio - b.ratio)
  console.log(`\n${faint.length} of ${all.length} measurements are under the bar:\n`)
  for (const r of rows) {
    console.log(
      `${String(r.ratio).padStart(5)}:1 (needs ${r.need}) ${r.look.padEnd(9)} ${r.page.padEnd(11)} ${r.view.padEnd(8)}` +
        `${r.disabled ? ' [disabled]' : ''}${r.halo ? ' [halo]' : ''}${r.guessed ? ' [picture]' : ''} ${r.fg} on ${r.bg}  ${r.where}  "${r.text}"`,
    )
  }
  if (args.json) writeFileSync(args.json, JSON.stringify(all, null, 2))
  return faint.length
}

await main()
