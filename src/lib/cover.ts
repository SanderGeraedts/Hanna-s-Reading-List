/** Client-side helpers for cover images. */

export function coverUrlForId(coverId: number, size: 'S' | 'M' | 'L' = 'L') {
  return `/api/cover/id/${coverId}?size=${size}`
}

export function coverUrlForIsbn(isbn: string, size: 'S' | 'M' | 'L' = 'L') {
  return `/api/cover/isbn/${isbn}?size=${size}`
}

/**
 * The app's own Open Library cover (`/api/cover/…`) at another size, for small
 * pictures like the world map's tiles (T-0018). Own photos (`data:`), Storytel
 * covers (`/api/remote-cover`) and anything else stay as they are.
 */
export function coverAtSize(url: string, size: 'S' | 'M' | 'L'): string {
  if (!url.startsWith('/api/cover/')) return url
  const [path, query = ''] = url.split('?')
  const params = new URLSearchParams(query)
  params.set('size', size)
  return `${path}?${params}`
}

/** Storytel covers go through a same-origin proxy so WebGL can use them. */
export function remoteCoverUrl(url: string) {
  return `/api/remote-cover?url=${encodeURIComponent(url)}`
}

const PALETTE = ['#7a2e2e', '#2e4a7a', '#2f5d46', '#6b4c8a', '#8a5a2b', '#3d3d3d', '#a0522d', '#1f5f6b']

/** Stable fallback colour for books without a cover. */
export function colorFromString(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return PALETTE[Math.abs(h) % PALETTE.length]
}

function toHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
}

export interface PixelAnalysis {
  /** the automatic spine colour: the saturation-weighted average, darkened to 0.82 */
  color: string
  /** 1–6 swatches for the Spine colour row (T-0019): `color` first, then the cover's main colours */
  palette: string[]
}

export interface CoverAnalysis extends PixelAnalysis {
  aspect: number
}

/** Swatches closer than this (RGB distance, 0–441) count as the same colour (T-0019). */
export const MIN_SWATCH_DISTANCE = 36
const MAX_SWATCHES = 6
const CLUSTERS = 10
const ROUNDS = 8
const DARKEN = 0.82

function hexDistance(a: string, b: string) {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const dr = ((pa >> 16) & 255) - ((pb >> 16) & 255)
  const dg = ((pa >> 8) & 255) - ((pb >> 8) & 255)
  const db = (pa & 255) - (pb & 255)
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

/**
 * The pixel work of `analyzeCover`, without a canvas: RGBA data in, the
 * automatic colour and a palette out. The automatic colour is exactly what
 * `analyzeCover` always gave, so existing spines keep their colour. The palette
 * comes from a weighted k-means (weights `0.15 + sat²`, like the average),
 * seeded farthest-point from the weighted mean, so the same pixels always give
 * the same swatches.
 */
export function analyzePixels(data: Uint8ClampedArray | ArrayLike<number>): PixelAnalysis {
  const n = Math.floor(data.length / 4)
  const px: [number, number, number][] = []
  const ws: number[] = []
  let r = 0
  let g = 0
  let b = 0
  let wsum = 0
  for (let i = 0; i < n * 4; i += 4) {
    const pr = data[i]
    const pg = data[i + 1]
    const pb = data[i + 2]
    const max = Math.max(pr, pg, pb)
    const min = Math.min(pr, pg, pb)
    const sat = max === 0 ? 0 : (max - min) / max
    const w = 0.15 + sat * sat
    r += pr * w
    g += pg * w
    b += pb * w
    wsum += w
    px.push([pr, pg, pb])
    ws.push(w)
  }
  if (wsum === 0) return { color: '#000000', palette: ['#000000'] }
  // darken slightly – spines read better a bit deeper than the cover average
  const k = DARKEN / wsum
  const color = toHex(r * k, g * k, b * k)

  const d2 = (p: [number, number, number], c: [number, number, number]) =>
    (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2

  // seeds: the weighted mean, then each time the pixel farthest from every seed
  let centres: [number, number, number][] = [[r / wsum, g / wsum, b / wsum]]
  while (centres.length < CLUSTERS) {
    let best = -1
    let bestScore = 0
    for (let i = 0; i < px.length; i++) {
      let near = Infinity
      for (const c of centres) near = Math.min(near, d2(px[i], c))
      const score = near * ws[i]
      if (score > bestScore) {
        bestScore = score
        best = i
      }
    }
    if (best < 0) break // every pixel already sits on a seed
    centres.push([...px[best]])
  }

  let weights: number[] = []
  for (let round = 0; round < ROUNDS; round++) {
    const sums = centres.map(() => [0, 0, 0, 0])
    for (let i = 0; i < px.length; i++) {
      let ci = 0
      let near = Infinity
      for (let c = 0; c < centres.length; c++) {
        const d = d2(px[i], centres[c])
        if (d < near) {
          near = d
          ci = c
        }
      }
      const s = sums[ci]
      s[0] += px[i][0] * ws[i]
      s[1] += px[i][1] * ws[i]
      s[2] += px[i][2] * ws[i]
      s[3] += ws[i]
    }
    const kept = sums.filter((s) => s[3] > 0)
    centres = kept.map((s) => [s[0] / s[3], s[1] / s[3], s[2] / s[3]])
    weights = kept.map((s) => s[3])
  }

  const palette = [color]
  centres
    .map((c, i) => ({ hex: toHex(c[0] * DARKEN, c[1] * DARKEN, c[2] * DARKEN), w: weights[i] }))
    .sort((a, b) => b.w - a.w)
    .forEach(({ hex }) => {
      if (palette.length >= MAX_SWATCHES) return
      if (palette.every((p) => hexDistance(p, hex) >= MIN_SWATCH_DISTANCE)) palette.push(hex)
    })
  return { color, palette }
}

/**
 * The colour "Back to automatic" gives (T-0019): the cover's colour for a book
 * with a cover, or the title's colour without one. `null` when the cover is
 * there but couldn't be analysed (or isn't analysed yet).
 */
export function automaticColour(
  book: { coverUrl?: string; title: string },
  analysis: { color: string } | null | undefined,
): string | null {
  if (!book.coverUrl) return colorFromString(book.title)
  return analysis ? analysis.color : null
}

export function sameColour(a: string | undefined, b: string | undefined) {
  return !!a && !!b && a.toLowerCase() === b.toLowerCase()
}

/**
 * Loads a cover and derives the spine colour (a saturation-weighted average of
 * the cover's pixels, so the spine "matches" the front) and its aspect ratio.
 */
export function analyzeCover(url: string): Promise<CoverAnalysis | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        // Open Library returns a 1x1 pixel for missing covers in some cases
        if (img.naturalWidth < 10 || img.naturalHeight < 10) return resolve(null)
        const size = 24
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!
        ctx.drawImage(img, 0, 0, size, size)
        const { data } = ctx.getImageData(0, 0, size, size)
        resolve({ ...analyzePixels(data), aspect: img.naturalWidth / img.naturalHeight })
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}
