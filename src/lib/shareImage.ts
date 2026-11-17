/**
 * A picture of a challenge to send to friends (#153): bingo, the A–Z
 * challenges and the monthly challenge are drawn as a grid of tiles on a
 * canvas, then shared with the phone's share sheet, or downloaded where
 * sharing files isn't possible (most desktop browsers).
 *
 * Covers come from this app's own server (`/api/cover`, `/api/remote-cover`)
 * or are stored with the shelf, so the canvas may read them; a cover that
 * doesn't load is drawn in the book's colour instead.
 */

export interface ShareTile {
  /** big text on the tile: a letter, a month */
  label: string
  /** small text under it: a title, a bingo square */
  caption?: string
  /** cover to fill the tile with */
  cover?: string
  /** colour behind it (the book's colour) */
  color?: string
  /** done: drawn bright with a tick; not done: dimmed */
  on: boolean
}

export interface ShareSpec {
  title: string
  subtitle: string
  columns: number
  /** tile height / width: 1 for squares, 1.5 for covers */
  aspect: number
  tiles: ShareTile[]
}

export const WIDTH = 1080
const PAD = 60
const GAP = 14
const HEADER = 190
const FOOTER = 70

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** Where each tile goes, and how tall the picture is. */
export function layoutTiles(spec: Pick<ShareSpec, 'columns' | 'aspect'> & { count: number }) {
  const w = (WIDTH - PAD * 2 - GAP * (spec.columns - 1)) / spec.columns
  const h = w * spec.aspect
  const rows = Math.ceil(spec.count / spec.columns)
  const rects: Rect[] = Array.from({ length: spec.count }, (_, i) => ({
    x: PAD + (i % spec.columns) * (w + GAP),
    y: HEADER + Math.floor(i / spec.columns) * (h + GAP),
    w,
    h,
  }))
  const height = HEADER + rows * h + Math.max(0, rows - 1) * GAP + FOOTER
  return { rects, height: Math.round(height) }
}

const BG = '#1b1512'
const TEXT = '#f3e9da'
const MUTED = '#a8998a'
const ACCENT = '#d9a85b'
const SERIF = 'Georgia, "Times New Roman", serif'

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function roundRect(ctx: CanvasRenderingContext2D, r: Rect, radius: number) {
  ctx.beginPath()
  ctx.roundRect(r.x, r.y, r.w, r.h, radius)
}

/** Fill a rect with an image, cropped like `object-fit: cover`. */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, r: Rect) {
  const scale = Math.max(r.w / img.width, r.h / img.height)
  const sw = r.w / scale
  const sh = r.h / scale
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, r.x, r.y, r.w, r.h)
}

function fitText(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text
  let t = text
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1)
  return `${t.trimEnd()}…`
}

/** Up to `max` lines of `text`, the last one cut short with … if it doesn't fit. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, width: number, max: number) {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width <= width || !line) line = next
    else lines.push(line), (line = word)
  }
  if (line) lines.push(line)
  if (lines.length > max) lines.splice(max - 1, lines.length, lines.slice(max - 1).join(' '))
  return lines.map((l) => fitText(ctx, l, width))
}

/** Draw the picture. */
export async function renderShareImage(spec: ShareSpec): Promise<Blob> {
  const { rects, height } = layoutTiles({ ...spec, count: spec.tiles.length })
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, WIDTH, height)

  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = TEXT
  ctx.font = `600 58px ${SERIF}`
  ctx.fillText(fitText(ctx, spec.title, WIDTH - PAD * 2), PAD, 100)
  ctx.fillStyle = ACCENT
  ctx.font = `34px ${SERIF}`
  ctx.fillText(fitText(ctx, spec.subtitle, WIDTH - PAD * 2), PAD, 152)

  const images = await Promise.all(spec.tiles.map((t) => (t.cover ? loadImage(t.cover) : Promise.resolve(null))))

  spec.tiles.forEach((tile, i) => {
    const r = rects[i]
    const radius = Math.min(18, r.w / 8)
    ctx.save()
    roundRect(ctx, r, radius)
    ctx.clip()
    ctx.fillStyle = tile.on ? (tile.color ?? '#3a2e26') : '#2a221d'
    ctx.fillRect(r.x, r.y, r.w, r.h)
    const img = images[i]
    if (img) drawCover(ctx, img, r)
    if (!tile.on) {
      ctx.fillStyle = 'rgba(27, 21, 18, 0.72)'
      ctx.fillRect(r.x, r.y, r.w, r.h)
    }
    // a band at the bottom for the label (and caption)
    const hasCover = !!img || (tile.on && !!tile.color)
    const band = Math.min(r.h * 0.42, tile.caption ? r.w * 0.42 : r.w * 0.3)
    if (hasCover) {
      const g = ctx.createLinearGradient(0, r.y + r.h - band * 1.4, 0, r.y + r.h)
      g.addColorStop(0, 'rgba(0,0,0,0)')
      g.addColorStop(1, 'rgba(0,0,0,0.8)')
      ctx.fillStyle = g
      ctx.fillRect(r.x, r.y + r.h - band * 1.4, r.w, band * 1.4)
    }
    ctx.restore()

    const big = Math.round(Math.min(r.w * (hasCover ? 0.3 : 0.45), 64))
    ctx.textAlign = 'center'
    ctx.fillStyle = tile.on ? TEXT : MUTED
    ctx.font = `600 ${big}px ${SERIF}`
    if (hasCover || tile.caption) {
      const small = Math.round(Math.max(14, Math.min(r.w * 0.11, 24)))
      ctx.font = `${small}px ${SERIF}`
      const caption = tile.caption ? wrapText(ctx, tile.caption, r.w - 16, 2) : []
      const captionTop = r.y + r.h - small * 0.7 - (caption.length - 1) * small * 1.15
      caption.forEach((l, n) => ctx.fillText(l, r.x + r.w / 2, captionTop + n * small * 1.15))
      if (tile.label) {
        ctx.font = `600 ${big}px ${SERIF}`
        const labelY = caption.length ? captionTop - small * 1.2 : r.y + r.h - big * 0.35
        ctx.fillText(fitText(ctx, tile.label, r.w - 12), r.x + r.w / 2, labelY)
      }
    } else {
      ctx.textBaseline = 'middle'
      ctx.fillText(tile.label, r.x + r.w / 2, r.y + r.h / 2)
      ctx.textBaseline = 'alphabetic'
    }
    ctx.textAlign = 'left'

    // border, and a tick on what's done
    roundRect(ctx, r, radius)
    ctx.lineWidth = tile.on ? 4 : 2
    ctx.strokeStyle = tile.on ? ACCENT : '#4a3d33'
    ctx.stroke()
    if (tile.on) {
      const d = Math.max(22, Math.min(r.w * 0.22, 40))
      ctx.beginPath()
      ctx.arc(r.x + r.w - d * 0.75, r.y + d * 0.75, d / 2, 0, Math.PI * 2)
      ctx.fillStyle = ACCENT
      ctx.fill()
      ctx.fillStyle = BG
      ctx.font = `700 ${Math.round(d * 0.7)}px ${SERIF}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('✓', r.x + r.w - d * 0.75, r.y + d * 0.78)
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
    }
  })

  ctx.fillStyle = MUTED
  ctx.font = `26px ${SERIF}`
  ctx.fillText("Hanna's Reading List", PAD, height - 30)

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not draw the picture'))), 'image/png'),
  )
}

/** A file name for the picture: "a-z-challenge-2026.png". */
export const shareFileName = (title: string) =>
  `${
    title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'challenge'
  }.png`

/** Draw the picture and share it, or download it where sharing files isn't possible. */
export async function shareChallenge(spec: ShareSpec): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const blob = await renderShareImage(spec)
  const name = shareFileName(spec.title)
  const file = new File([blob], name, { type: 'image/png' })
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: spec.title, text: spec.subtitle })
      return 'shared'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
      // sharing refused (e.g. no user gesture left): download instead
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'downloaded'
}
