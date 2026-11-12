import * as THREE from 'three'
import type { Book } from '#/lib/library'
import type { BookDims } from '#/lib/shelfLayout'
import { formatDuration, listenOnly } from '#/lib/listening'

/**
 * Procedural textures. No public API provides spine or back-cover images,
 * so these are painted on a canvas from the book's metadata and the colour
 * sampled from its front cover.
 */

const SERIF = 'Georgia, "Times New Roman", serif'
const SANS = 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif'

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = Math.max(2, Math.round(w))
  c.height = Math.max(2, Math.round(h))
  return c
}

export function toTexture(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

function parseHex(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function shade(hex: string, amount: number) {
  const [r, g, b] = parseHex(hex)
  const f = (v: number) =>
    Math.round(amount >= 0 ? v + (255 - v) * amount : v * (1 + amount))
      .toString(16)
      .padStart(2, '0')
  return `#${f(r)}${f(g)}${f(b)}`
}

/** Dark or light text, whichever reads on `bg`. */
export function inkFor(bg: string) {
  const [r, g, b] = parseHex(bg)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '#1d1a16' : '#f6efe1'
}

function accentFor(bg: string) {
  const [r, g, b] = parseHex(bg)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '#6b4b1f' : '#d8b66a'
}

/** Subtle cloth/paper grain so flat colours don't look plasticky. */
function grain(ctx: CanvasRenderingContext2D, w: number, h: number, strength = 0.06) {
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 255 * strength
    d[i] += n
    d[i + 1] += n
    d[i + 2] += n
  }
  ctx.putImageData(img, 0, 0)
}

function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  start: number,
  min: number,
  weight = '600',
) {
  let size = start
  do {
    ctx.font = `${weight} ${size}px ${SERIF}`
    if (ctx.measureText(text).width <= maxWidth) break
    size -= 1
  } while (size > min)
  return size
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text
  let t = text
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1)
  return t.trimEnd() + '…'
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = word
      if (lines.length === maxLines) break
    } else {
      line = test
    }
  }
  if (lines.length < maxLines && line) lines.push(line)
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = ellipsize(ctx, lines[maxLines - 1] + '…', maxWidth)
  }
  return lines
}

function authorLine(book: Book) {
  return book.authors.length ? book.authors.join(' & ') : 'Unknown author'
}

const PX_PER_UNIT = 2400

/**
 * Size and height of the medal on a finished book's spine (book units).
 * Shared by the spine texture (which paints the ribbon) and the 3D medal.
 */
export function medalLayout(dims: BookDims) {
  const r = Math.min(0.011, Math.max(0.0055, dims.t * 0.36))
  const fromBottom = r + 0.007
  const ribbon = r * 2.4 // ribbon length above the medal's centre
  return { r, fromBottom, top: fromBottom + ribbon + r * 0.28 }
}

export function paintSpine(book: Book, dims: BookDims) {
  const H = Math.min(1024, Math.round(dims.h * PX_PER_UNIT * 1.3))
  const W = Math.max(40, Math.round((H * dims.t) / dims.h))
  const c = canvas(W, H)
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  const bg = book.color
  const ink = inkFor(bg)
  const accent = accentFor(bg)

  // rounded-spine shading: darker at the edges, a highlight just off-centre
  const grad = ctx.createLinearGradient(0, 0, W, 0)
  grad.addColorStop(0, shade(bg, -0.35))
  grad.addColorStop(0.35, shade(bg, 0.08))
  grad.addColorStop(0.5, bg)
  grad.addColorStop(1, shade(bg, -0.4))
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // decorative bands (a finished book's medal takes the place of the bottom pair)
  const read = book.status === 'read'
  ctx.fillStyle = accent
  for (const y of read ? [H * 0.05] : [H * 0.05, H * 0.9]) {
    ctx.fillRect(0, y, W, Math.max(2, H * 0.006))
    ctx.fillRect(0, y + H * 0.014, W, Math.max(1, H * 0.003))
  }

  // a small language tag above the top bands, read across the spine
  if (book.language) {
    const code = book.language.toUpperCase()
    ctx.save()
    ctx.font = `600 ${Math.round(Math.min(W * 0.36, H * 0.03))}px ${SANS}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = ink
    ctx.globalAlpha = 0.8
    ctx.fillText(code, W / 2, H * 0.028)
    ctx.restore()
  }

  // text runs top-to-bottom (English convention)
  ctx.save()
  ctx.translate(W / 2, 0)
  ctx.rotate(Math.PI / 2)
  ctx.fillStyle = ink
  ctx.textBaseline = 'middle'
  const maxFont = W * 0.5
  // on finished books the text stops short of the medal and its ribbon
  const textEnd = read ? H * (1 - medalLayout(dims).top / dims.h) - H * 0.02 : H * 0.87
  const authorSpace = Math.min(H * 0.22, (textEnd - H * 0.1) * 0.3)
  const titleSpace = Math.min(H * 0.56, textEnd - H * 0.1 - authorSpace - H * 0.03)
  const titleSize = fitFont(ctx, book.title, titleSpace, Math.round(maxFont), 10)
  ctx.font = `600 ${titleSize}px ${SERIF}`
  ctx.textAlign = 'left'
  ctx.fillText(ellipsize(ctx, book.title, titleSpace), H * 0.1, 0)

  const author = (book.authors[0]?.split(' ').slice(-1)[0] ?? '').toUpperCase()
  if (author) {
    const authorSize = fitFont(ctx, author, authorSpace, Math.round(Math.min(maxFont * 0.7, titleSize)), 8, '400')
    ctx.font = `400 ${authorSize}px ${SERIF}`
    ctx.textAlign = 'right'
    ctx.globalAlpha = 0.85
    ctx.fillText(ellipsize(ctx, author, authorSpace), textEnd, 0)
  }
  ctx.restore()

  grain(ctx, W, H, 0.05)
  if (read) paintMedalRibbon(ctx, W, H, dims)
  return toTexture(c)
}

/** Medal ribbon: a tapered striped band running up from the medal to a gold clasp. */
function paintMedalRibbon(ctx: CanvasRenderingContext2D, W: number, H: number, dims: BookDims) {
  const { r, fromBottom } = medalLayout(dims)
  ctx.save()
  // draw in book units, origin at the medal centre, y growing downwards
  ctx.translate(W / 2, H * (1 - fromBottom / dims.h))
  ctx.scale(W / dims.t, H / dims.h)
  const top = -r * 2.4
  const halfTop = r * 0.62
  const halfBottom = r * 0.42
  const band = () => {
    ctx.beginPath()
    ctx.moveTo(-halfTop, top)
    ctx.lineTo(halfTop, top)
    ctx.lineTo(halfBottom, 0)
    ctx.lineTo(-halfBottom, 0)
    ctx.closePath()
  }
  ctx.shadowColor = 'rgba(0,0,0,0.45)'
  ctx.shadowBlur = r * 0.25 * (H / dims.h)
  ctx.shadowOffsetY = r * 0.08 * (H / dims.h)
  ctx.fillStyle = '#2f4fb5'
  band()
  ctx.fill()
  ctx.shadowColor = 'transparent'
  // stripes: white centre with red pinstripes, following the taper
  ctx.save()
  band()
  ctx.clip()
  const stripe = (frac: number, width: number, color: string) => {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo((frac - width) * halfTop, top)
    ctx.lineTo((frac + width) * halfTop, top)
    ctx.lineTo((frac + width) * halfBottom, 0)
    ctx.lineTo((frac - width) * halfBottom, 0)
    ctx.closePath()
    ctx.fill()
  }
  stripe(0, 0.3, '#f4f1e8')
  stripe(0, 0.08, '#d23a3a')
  // soft fold shading across the band
  const fold = ctx.createLinearGradient(-halfTop, 0, halfTop, 0)
  fold.addColorStop(0, 'rgba(0,0,0,0.25)')
  fold.addColorStop(0.5, 'rgba(255,255,255,0.08)')
  fold.addColorStop(1, 'rgba(0,0,0,0.3)')
  ctx.fillStyle = fold
  ctx.fillRect(-halfTop, top, halfTop * 2, -top)
  ctx.restore()
  // gold clasp bar at the top of the ribbon
  const clasp = ctx.createLinearGradient(0, top - r * 0.28, 0, top + r * 0.05)
  clasp.addColorStop(0, '#fff0a8')
  clasp.addColorStop(0.5, '#e0ad3a')
  clasp.addColorStop(1, '#8a5c12')
  ctx.fillStyle = clasp
  ctx.fillRect(-halfTop * 1.12, top - r * 0.28, halfTop * 2.24, r * 0.33)
  ctx.restore()
}

export type MedalTier = 'bronze' | 'silver' | 'gold'

/** Read once: bronze, twice: silver, three times or more: gold. */
export function medalTier(timesRead: number): MedalTier {
  return timesRead >= 3 ? 'gold' : timesRead === 2 ? 'silver' : 'bronze'
}

export const METALS: Record<
  MedalTier,
  { light: string; mid: string; dark: string; groove: string; shine: string; rim: string; ink: string }
> = {
  gold: {
    light: '#fff4b8',
    mid: '#e9bb45',
    dark: '#9a6a16',
    groove: '100,60,5',
    shine: '255,245,200',
    rim: '#c9962c',
    ink: '#6b4208',
  },
  silver: {
    light: '#ffffff',
    mid: '#c8cdd4',
    dark: '#6c737d',
    groove: '60,66,76',
    shine: '255,255,255',
    rim: '#a9afb8',
    ink: '#3f4650',
  },
  bronze: {
    light: '#ffd2a6',
    mid: '#c47c43',
    dark: '#6b3812',
    groove: '80,38,10',
    shine: '255,225,190',
    rim: '#a5622d',
    ink: '#4f2608',
  },
}

const medalFaces = new Map<string, THREE.CanvasTexture>()

/**
 * The medal's face: struck metal with a milled rim, a ring of laurel leaves
 * and the number of times the book has been read, embossed in the middle.
 * Cached per metal and number, never disposed.
 */
export function medalFaceTexture(tier: MedalTier, count: number) {
  const key = `${tier}:${count}`
  const cached = medalFaces.get(key)
  if (cached) return cached
  const m = METALS[tier]
  const S = 256
  const c = canvas(S, S)
  const ctx = c.getContext('2d')!
  const R = S / 2
  ctx.translate(R, R)

  // body, lit from the top left
  const body = ctx.createRadialGradient(-R * 0.35, -R * 0.4, R * 0.05, 0, 0, R)
  body.addColorStop(0, m.light)
  body.addColorStop(0.45, m.mid)
  body.addColorStop(1, m.dark)
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.arc(0, 0, R, 0, Math.PI * 2)
  ctx.fill()

  // milled rim
  ctx.strokeStyle = `rgba(${m.groove},0.55)`
  ctx.lineWidth = 2
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(Math.cos(a) * R * 0.9, Math.sin(a) * R * 0.9)
    ctx.lineTo(Math.cos(a) * R * 0.99, Math.sin(a) * R * 0.99)
    ctx.stroke()
  }
  // raised inner ring: dark groove plus a highlight
  ctx.lineWidth = R * 0.04
  ctx.strokeStyle = `rgba(${m.groove},0.6)`
  ctx.beginPath()
  ctx.arc(0, 0, R * 0.84, 0, Math.PI * 2)
  ctx.stroke()
  ctx.lineWidth = R * 0.02
  ctx.strokeStyle = `rgba(${m.shine},0.7)`
  ctx.beginPath()
  ctx.arc(0, 0, R * 0.8, 0, Math.PI * 2)
  ctx.stroke()

  // laurel leaves round the field
  ctx.fillStyle = `rgba(${m.groove},0.5)`
  for (let i = 0; i < 18; i++) {
    if (i === 0 || i === 9) continue // gaps at top and bottom
    const a = -Math.PI / 2 + (i / 18) * Math.PI * 2
    ctx.beginPath()
    ctx.ellipse(Math.cos(a) * R * 0.68, Math.sin(a) * R * 0.68, R * 0.06, R * 0.03, a + Math.PI / 2, 0, Math.PI * 2)
    ctx.fill()
  }

  // the number, struck into the face: dark, with a light lower edge
  const text = count > 99 ? '99+' : String(count)
  const size = R * (text.length === 1 ? 0.95 : text.length === 2 ? 0.72 : 0.52)
  ctx.font = `700 ${size}px ${SERIF}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const y = R * 0.05
  ctx.fillStyle = `rgba(${m.shine},0.85)`
  ctx.fillText(text, R * 0.03, y + R * 0.035)
  ctx.fillStyle = m.ink
  ctx.fillText(text, 0, y)

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  medalFaces.set(key, tex)
  return tex
}

export function paintBack(book: Book, dims: BookDims) {
  const W = 640
  const H = Math.round((W * dims.h) / dims.w)
  const c = canvas(W, H)
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  const bg = book.color
  const ink = inkFor(bg)
  const accent = accentFor(bg)

  const grad = ctx.createLinearGradient(0, 0, W, H)
  grad.addColorStop(0, shade(bg, 0.06))
  grad.addColorStop(1, shade(bg, -0.18))
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)
  // hinge shadow next to the spine (spine is on the right when viewing the back)
  const hinge = ctx.createLinearGradient(W - 40, 0, W, 0)
  hinge.addColorStop(0, 'rgba(0,0,0,0)')
  hinge.addColorStop(1, 'rgba(0,0,0,0.35)')
  ctx.fillStyle = hinge
  ctx.fillRect(W - 40, 0, 40, H)

  const pad = 56
  ctx.fillStyle = ink
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  ctx.font = `600 ${fitFont(ctx, book.title, W - pad * 2, 40, 18)}px ${SERIF}`
  ctx.fillText(ellipsize(ctx, book.title, W - pad * 2), W / 2, pad)
  ctx.font = `italic 400 24px ${SERIF}`
  ctx.globalAlpha = 0.85
  ctx.fillText(ellipsize(ctx, authorLine(book), W - pad * 2), W / 2, pad + 52)
  ctx.globalAlpha = 1

  ctx.fillStyle = accent
  ctx.fillRect(W / 2 - 40, pad + 96, 80, 3)

  const blurb = backText(book)
  ctx.fillStyle = ink
  ctx.textAlign = 'left'
  ctx.font = `400 22px ${SERIF}`
  const lineH = 32
  const top = pad + 128
  const barcodeTop = H - pad - 110
  const maxLines = Math.max(1, Math.floor((barcodeTop - top - 20) / lineH))
  wrapLines(ctx, blurb, W - pad * 2, maxLines).forEach((l, i) => ctx.fillText(l, pad, top + i * lineH))

  // barcode box
  const bw = 200
  const bh = 110
  const bx = W - pad - bw
  ctx.fillStyle = '#fbfaf6'
  ctx.fillRect(bx, barcodeTop, bw, bh)
  ctx.fillStyle = '#111'
  let x = bx + 14
  const seed = book.isbn ?? book.id
  for (let i = 0; x < bx + bw - 14; i++) {
    const code = seed.charCodeAt(i % seed.length)
    const bar = 1 + (code % 3)
    if (i % 2 === 0) ctx.fillRect(x, barcodeTop + 12, bar * 1.6, bh - 44)
    x += bar * 1.6 + 1.2
  }
  ctx.font = `500 15px ui-monospace, monospace`
  ctx.textAlign = 'center'
  ctx.fillText(book.isbn ? `ISBN ${book.isbn}` : 'NO ISBN', bx + bw / 2, barcodeTop + bh - 26)

  const length = listenOnly(book) && book.minutes ? formatDuration(book.minutes) : book.pages ? `${book.pages} pages` : null
  if (length) {
    ctx.fillStyle = ink
    ctx.globalAlpha = 0.7
    ctx.textAlign = 'left'
    ctx.font = `400 18px ${SERIF}`
    ctx.fillText(length, pad, barcodeTop + bh - 24)
    ctx.globalAlpha = 1
  }

  grain(ctx, W, H, 0.04)
  return toTexture(c)
}

/** Used when Open Library has no cover for the book. */
export function paintFallbackCover(book: Book, dims: BookDims) {
  const W = 640
  const H = Math.round((W * dims.h) / dims.w)
  const c = canvas(W, H)
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  const bg = book.color
  const ink = inkFor(bg)
  const accent = accentFor(bg)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = accent
  ctx.lineWidth = 4
  ctx.strokeRect(36, 36, W - 72, H - 72)
  ctx.lineWidth = 1.5
  ctx.strokeRect(48, 48, W - 96, H - 96)

  ctx.fillStyle = ink
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.font = `700 56px ${SERIF}`
  const lines = wrapLines(ctx, book.title, W - 160, 4)
  lines.forEach((l, i) => ctx.fillText(l, W / 2, H * 0.28 + i * 66))
  ctx.fillStyle = accent
  ctx.fillRect(W / 2 - 50, H * 0.28 + lines.length * 66 + 20, 100, 3)
  ctx.fillStyle = ink
  ctx.font = `italic 400 30px ${SERIF}`
  ctx.fillText(ellipsize(ctx, authorLine(book), W - 160), W / 2, H * 0.78)
  grain(ctx, W, H, 0.05)
  return toTexture(c)
}

function paintPages(vertical: boolean) {
  const W = vertical ? 256 : 64
  const H = vertical ? 64 : 256
  const c = canvas(W, H)
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#efe6d2'
  ctx.fillRect(0, 0, W, H)
  const n = vertical ? W : H
  for (let i = 0; i < n; i += 2) {
    ctx.fillStyle = `rgba(120, 100, 70, ${0.05 + Math.random() * 0.12})`
    if (vertical) ctx.fillRect(i, 0, 1, H)
    else ctx.fillRect(0, i, W, 1)
  }
  return toTexture(c)
}

let pagesCache: { fore: THREE.Texture; topBottom: THREE.Texture } | null = null
/** Page-edge textures are shared by every book. */
export function pageTextures() {
  if (!pagesCache) pagesCache = { fore: paintPages(true), topBottom: paintPages(false) }
  return pagesCache
}

interface OakPalette {
  /** base tones across the board, top to bottom */
  base: string[]
  /** latewood (dark grain lines), as "r, g, b" */
  late: string
  /** earlywood (light grain lines) */
  early: string
  pores: string
  flecks: string
}

/** Grey "sonoma"-style oak, like a light grey laminate: beige with a cool grey cast. */
const GREY_OAK: OakPalette = {
  base: ['#cbc3b6', '#c0b8aa', '#d0c9bd', '#b8afa0', '#c7bfb2'],
  late: '112, 102, 88',
  early: '226, 221, 211',
  pores: '96, 88, 76',
  flecks: '238, 234, 226',
}

/** Warm honey European oak (used for the floor). */
const HONEY_OAK: OakPalette = {
  base: ['#bda283', '#b39776', '#c2a888', '#ab8e6c', '#bb9f7f'],
  late: '96, 72, 46',
  early: '222, 204, 174',
  pores: '78, 58, 36',
  flecks: '240, 222, 186',
}

/**
 * Paints European oak: straight, fairly tight grain, open pores and the ray
 * flecks typical of quarter-sawn oak. Grain runs along u (horizontal).
 */
function paintOak(ctx: CanvasRenderingContext2D, W: number, H: number, p: OakPalette) {
  const base = ctx.createLinearGradient(0, 0, 0, H)
  p.base.forEach((c, i) => base.addColorStop(i / (p.base.length - 1), c))
  ctx.fillStyle = base
  ctx.fillRect(0, 0, W, H)

  // growth rings: long, nearly straight lines with a slow drift
  for (let i = 0; i < 140; i++) {
    const y = Math.random() * H
    const drift = (Math.random() - 0.5) * 14
    const wobble = 0.6 + Math.random() * 1.6
    const freq = 0.001 + Math.random() * 0.003
    const phase = Math.random() * Math.PI * 2
    const late = Math.random() < 0.55 // latewood is darker and denser
    ctx.strokeStyle = late
      ? `rgba(${p.late}, ${0.18 + Math.random() * 0.22})`
      : `rgba(${p.early}, ${0.12 + Math.random() * 0.15})`
    ctx.lineWidth = late ? 0.8 + Math.random() * 2.2 : 1 + Math.random() * 3
    ctx.beginPath()
    for (let x = 0; x <= W; x += 16) {
      const yy = y + (drift * x) / W + Math.sin(x * freq + phase) * wobble
      if (x === 0) ctx.moveTo(x, yy)
      else ctx.lineTo(x, yy)
    }
    ctx.stroke()
  }

  // open pores: tiny dark dashes along the grain
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = `rgba(${p.pores}, ${0.12 + Math.random() * 0.2})`
    ctx.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 7, 0.8)
  }

  // medullary ray flecks: short, pale, slightly lustrous streaks
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * W
    const y = Math.random() * H
    const len = 6 + Math.random() * 34
    const h = 1.5 + Math.random() * 3.5
    const g = ctx.createLinearGradient(x, 0, x + len, 0)
    const a = 0.12 + Math.random() * 0.18
    g.addColorStop(0, `rgba(${p.flecks}, 0)`)
    g.addColorStop(0.5, `rgba(${p.flecks}, ${a})`)
    g.addColorStop(1, `rgba(${p.flecks}, 0)`)
    ctx.fillStyle = g
    ctx.fillRect(x, y, len, h)
  }

  grain(ctx, W, H, 0.035)
}

/** Grey oak for the bookcase. */
export function woodTexture() {
  const W = 2048
  const H = 512
  const c = canvas(W, H)
  paintOak(c.getContext('2d', { willReadFrequently: true })!, W, H, GREY_OAK)
  const t = toTexture(c)
  t.wrapS = THREE.RepeatWrapping
  t.wrapT = THREE.RepeatWrapping
  return t
}

/** Honey oak floorboards: one tile holds 4 boards with staggered end joints. */
export const FLOOR_TILE_METRES = 0.8

export function floorTexture() {
  const W = 2048
  const H = 1024
  const boards = 4
  const c = canvas(W, H)
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  paintOak(ctx, W, H, HONEY_OAK)

  const bh = H / boards
  for (let b = 0; b < boards; b++) {
    const y = b * bh
    // each board a slightly different shade
    ctx.fillStyle = `rgba(${Math.random() < 0.5 ? '255, 245, 225' : '60, 40, 20'}, ${0.04 + Math.random() * 0.06})`
    ctx.fillRect(0, y, W, bh)
    // seam between boards
    ctx.fillStyle = 'rgba(55, 38, 20, 0.55)'
    ctx.fillRect(0, y, W, 3)
    // a staggered end joint per board
    const jx = ((b * 0.37 + 0.15) % 1) * W
    ctx.fillRect(jx, y, 3, bh)
  }
  const t = toTexture(c)
  t.wrapS = THREE.RepeatWrapping
  t.wrapT = THREE.RepeatWrapping
  return t
}

const WALL_HEIGHT_M = 8

/**
 * Lavender-cornflower wall: deeper at the floor, fading to a pale periwinkle above the bookcase.
 * Slightly over-saturated on purpose – the warm room lights pull it back toward grey.
 */
export function wallTexture() {
  const c = canvas(4, 1024)
  const ctx = c.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, 0, c.height)
  // stops are placed by height above the floor (metres); canvas y=0 is the top
  const at = (metres: number) => 1 - metres / WALL_HEIGHT_M
  g.addColorStop(at(WALL_HEIGHT_M), '#e3e9ff')
  g.addColorStop(at(3.2), '#cdd8ff')
  g.addColorStop(at(2), '#aabcfa')
  g.addColorStop(at(0.9), '#8ba1f0')
  g.addColorStop(at(0), '#6c84e0')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, c.width, c.height)
  return toTexture(c)
}

/** Text printed on the back cover: the blurb, or a short placeholder when there is none. */
export function backText(book: Book) {
  return (
    book.description?.trim() ||
    `A book on Hanna's reading list${book.year ? `, first published in ${book.year}` : ''}.`
  )
}
