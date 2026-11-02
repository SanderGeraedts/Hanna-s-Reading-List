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

export function woodTexture() {
  const W = 1024
  const H = 256
  const c = canvas(W, H)
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.fillStyle = '#7b4a26'
  ctx.fillRect(0, 0, W, H)
  for (let i = 0; i < 90; i++) {
    const y = Math.random() * H
    const amp = 2 + Math.random() * 6
    const freq = 0.004 + Math.random() * 0.01
    const phase = Math.random() * Math.PI * 2
    ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(60,30,12,0.25)' : 'rgba(170,110,60,0.18)'
    ctx.lineWidth = 0.6 + Math.random() * 2.2
    ctx.beginPath()
    for (let x = 0; x <= W; x += 8) {
      const yy = y + Math.sin(x * freq + phase) * amp
      if (x === 0) ctx.moveTo(x, yy)
      else ctx.lineTo(x, yy)
    }
    ctx.stroke()
  }
  grain(ctx, W, H, 0.05)
  const t = toTexture(c)
  t.wrapS = THREE.RepeatWrapping
  t.wrapT = THREE.RepeatWrapping
  return t
}
