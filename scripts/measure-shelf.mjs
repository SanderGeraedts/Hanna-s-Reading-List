#!/usr/bin/env node
// Measures what the bookshelf costs to draw (T-0034, D-0035), the way T-0003 did:
// counted at the WebGL level, so it is fair to every look and needs no app code.
//
//   pnpm run build && pnpm run preview --port 3140      (no POCKETBASE_URL, no .netlify link: G-0019)
//   pnpm run measure:shelf                               (another terminal)
//
// Options: --url=http://localhost:3140  --books=150,400  --views=phone,desktop
//          --detailed=on,off  --label=branch  --json=out.json  --seconds=3
//
// For every run it seeds the browser's localStorage with demo books (never a real
// shelf), opens the shelf, waits for it to settle, and counts for --seconds:
// draw calls (drawArrays / drawElements and their instanced forms), picture bytes
// (texImage2D / texStorage2D allocations, texSubImage2D uploads; width × height × 4)
// and geometry bytes (bufferData), on WebGL 1 and 2. Then it opens the Dashboard
// and counts the draw calls behind it.
import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = 'true'] = a.replace(/^--/, '').split('=')
    return [k, v]
  }),
)
const URL = args.url ?? 'http://localhost:3140'
const BOOKS = (args.books ?? '150,400').split(',').map(Number)
const VIEWS = (args.views ?? 'phone,desktop').split(',')
const DETAILED = (args.detailed ?? 'on,off').split(',')
const SECONDS = Number(args.seconds ?? 3)
const LABEL = args.label ?? 'branch'

const VIEWPORTS = {
  // the phone of T-0003: the app caps it at 1.5 pixels per point
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  phone360: { viewport: { width: 360, height: 800 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
}

/** Demo books, the same every run: a mix of read (medals), reading (bookmarks) and unread. */
export function demoBooks(n) {
  const colours = ['#7b2d26', '#1f4e5f', '#2f5d3a', '#c9a227', '#5b3a6e', '#d9c7a3', '#283044', '#a4462f', '#e8dccb', '#3c6e71']
  const words = ['Night', 'Garden', 'River', 'Winter', 'House', 'Letters', 'Salt', 'Glass', 'Fox', 'Island', 'Summer', 'Shadow']
  const statuses = ['read', 'want', 'want', 'read', 'reading', 'want', 'read', 'paused', 'want', 'dnf']
  return Array.from({ length: n }, (_, i) => ({
    id: `demo-${i}`,
    title: `The ${words[i % words.length]} of ${words[(i * 7 + 3) % words.length]} ${i}`,
    authors: [`Author ${String.fromCharCode(65 + (i % 26))}. Writer${i % 17}`],
    color: colours[(i * 3) % colours.length],
    status: statuses[i % statuses.length],
    pages: 120 + ((i * 53) % 600),
    progress: (i % 10) / 10,
    language: i % 5 === 0 ? 'nl' : 'en',
    addedAt: 1_700_000_000_000 + i * 86_400_000,
    ...(i % 10 === 9 && { readCount: 1 }),
  }))
}

// runs in the page before the app: wraps the WebGL calls and counts them
function counters() {
  const c = {
    draws: 0,
    frames: 0,
    texAlloc: 0,
    texUpload: 0,
    geometry: 0,
    buffers: 0,
    textures: 0,
    lost: 0,
    contexts: 0,
  }
  window.__shelfCounters = c
  const raf = window.requestAnimationFrame.bind(window)
  window.requestAnimationFrame = (cb) => raf((t) => (c.frames++, cb(t)))
  const size = (s) => (s ? (s.videoWidth || s.naturalWidth || s.displayWidth || s.width || 0) * (s.videoHeight || s.naturalHeight || s.displayHeight || s.height || 0) : 0)
  const wrap = (proto, name, count) => {
    const orig = proto[name]
    if (!orig) return
    proto[name] = function (...a) {
      count(a)
      return orig.apply(this, a)
    }
  }
  for (const P of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
    if (!P) continue
    const p = P.prototype
    for (const d of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced', 'drawRangeElements']) wrap(p, d, () => c.draws++)
    // texImage2D(target, level, internalformat, width, height, border, format, type, pixels) or (…, format, type, source)
    wrap(p, 'texImage2D', (a) => (c.texAlloc += (a.length >= 8 ? a[3] * a[4] : size(a[5])) * 4))
    wrap(p, 'texStorage2D', (a) => (c.texAlloc += a[3] * a[4] * 4))
    // texSubImage2D(target, level, x, y, width, height, format, type, pixels) or (…, x, y, format, type, source)
    wrap(p, 'texSubImage2D', (a) => (c.texUpload += (a.length >= 8 ? a[4] * a[5] : size(a[6])) * 4))
    wrap(p, 'bufferData', (a) => (c.geometry += typeof a[1] === 'number' ? a[1] : (a[1]?.byteLength ?? 0)))
    wrap(p, 'createBuffer', () => c.buffers++)
    wrap(p, 'deleteBuffer', () => c.buffers--)
    wrap(p, 'createTexture', () => c.textures++)
    wrap(p, 'deleteTexture', () => c.textures--)
  }
  const getContext = HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    const ctx = getContext.call(this, type, ...rest)
    if (ctx && /webgl/.test(type) && !this.__counted) {
      this.__counted = true
      c.contexts++
      this.addEventListener('webglcontextlost', () => c.lost++)
    }
    return ctx
  }
}

const snap = (page) => page.evaluate(() => ({ ...window.__shelfCounters }))

async function window3s(page) {
  const a = await snap(page)
  await page.waitForTimeout(SECONDS * 1000)
  const b = await snap(page)
  const draws = b.draws - a.draws
  const frames = b.frames - a.frames
  return { draws, frames, perFrame: frames ? draws / frames : 0 }
}

async function run(browser, { view, books, detailed }) {
  const context = await browser.newContext(VIEWPORTS[view])
  const room = detailed === 'off' ? { detailedBooks: false } : detailed === 'on' ? { detailedBooks: true } : null
  await context.addInitScript(
    ({ list, room }) => {
      localStorage.setItem('hannas-reading-list:v1', JSON.stringify(list))
      if (room) localStorage.setItem('hannas-reading-list:room', JSON.stringify(room))
      else localStorage.removeItem('hannas-reading-list:room')
    },
    { list: demoBooks(books), room },
  )
  await context.addInitScript(counters)
  const page = await context.newPage()
  await page.goto(URL)
  await page.waitForSelector('canvas', { timeout: 60_000 })
  // let the shelf build, paint its spines and settle
  await page.waitForTimeout(6000)
  const shelf = await window3s(page)
  const totals = await snap(page)
  const note = await page.locator('.shelf-error').count()
  await page.getByRole('button', { name: 'Dashboard' }).first().click()
  await page.waitForTimeout(1000)
  const behind = await window3s(page)
  await context.close()
  return {
    label: LABEL,
    view,
    books,
    detailed,
    drawsPerFrame: Math.round(shelf.perFrame * 10) / 10,
    drawsPer3s: Math.round((shelf.draws * 3) / SECONDS),
    frames: shelf.frames,
    pictureMB: +(totals.texAlloc / 1e6).toFixed(2),
    pictureUploadMB: +(totals.texUpload / 1e6).toFixed(2),
    geometryMB: +(totals.geometry / 1e6).toFixed(3),
    liveBuffers: totals.buffers,
    liveTextures: totals.textures,
    contextsLost: totals.lost,
    note: note > 0,
    drawsBehindDashboard: behind.draws,
  }
}

// run only when called as a script, so the demo books can be imported elsewhere
if (import.meta.url === pathToFileURL(process.argv[1]).href) await main()

async function main() {
  const browser = await chromium.launch({
    channel: args.channel ?? 'chrome',
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  })
  const results = []
  try {
    for (const view of VIEWS)
      for (const books of BOOKS)
        for (const detailed of DETAILED) {
          const r = await run(browser, { view, books, detailed })
          results.push(r)
          console.log(JSON.stringify(r))
        }
  } finally {
    await browser.close()
  }
  console.table(results)
  if (args.json) writeFileSync(args.json, JSON.stringify(results, null, 2))
}
