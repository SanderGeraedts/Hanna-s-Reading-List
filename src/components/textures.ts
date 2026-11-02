import * as THREE from 'three'
import type { Book } from '#/lib/library'
import type { BookDims } from '#/lib/shelfLayout'

/**
 * Procedural textures. No public API provides spine or back-cover images,
 * so these are painted on a canvas from the book's metadata and the colour
 * sampled from its front cover.
 */

const SERIF = 'Georgia, "Times New Roman", serif'

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

function inkFor(bg: string) {
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

  // decorative bands
  ctx.fillStyle = accent
  for (const y of [H * 0.05, H * 0.9]) {
    ctx.fillRect(0, y, W, Math.max(2, H * 0.006))
    ctx.fillRect(0, y + H * 0.014, W, Math.max(1, H * 0.003))
  }

  // text runs top-to-bottom (English convention)
  ctx.save()
  ctx.translate(W / 2, 0)
  ctx.rotate(Math.PI / 2)
  ctx.fillStyle = ink
  ctx.textBaseline = 'middle'
  const maxFont = W * 0.5
  const titleSpace = H * 0.56
  const titleSize = fitFont(ctx, book.title, titleSpace, Math.round(maxFont), 10)
  ctx.font = `600 ${titleSize}px ${SERIF}`
  ctx.textAlign = 'left'
  ctx.fillText(ellipsize(ctx, book.title, titleSpace), H * 0.1, 0)

  const author = (book.authors[0]?.split(' ').slice(-1)[0] ?? '').toUpperCase()
  if (author) {
    const authorSize = fitFont(ctx, author, H * 0.22, Math.round(Math.min(maxFont * 0.7, titleSize)), 8, '400')
    ctx.font = `400 ${authorSize}px ${SERIF}`
    ctx.textAlign = 'right'
    ctx.globalAlpha = 0.85
    ctx.fillText(ellipsize(ctx, author, H * 0.22), H * 0.87, 0)
  }
  ctx.restore()

  grain(ctx, W, H, 0.05)
  return toTexture(c)
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

  const blurb =
    book.description ??
    `A book on Hanna's reading list${book.year ? `, first published in ${book.year}` : ''}.`
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

  if (book.pages) {
    ctx.fillStyle = ink
    ctx.globalAlpha = 0.7
    ctx.textAlign = 'left'
    ctx.font = `400 18px ${SERIF}`
    ctx.fillText(`${book.pages} pages`, pad, barcodeTop + bh - 24)
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
