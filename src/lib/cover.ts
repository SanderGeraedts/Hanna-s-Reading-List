/** Client-side helpers for cover images. */

export function coverUrlForId(coverId: number, size: 'S' | 'M' | 'L' = 'L') {
  return `/api/cover/id/${coverId}?size=${size}`
}

export function coverUrlForIsbn(isbn: string, size: 'S' | 'M' | 'L' = 'L') {
  return `/api/cover/isbn/${isbn}?size=${size}`
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

export interface CoverAnalysis {
  color: string
  aspect: number
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
        let r = 0
        let g = 0
        let b = 0
        let wsum = 0
        for (let i = 0; i < data.length; i += 4) {
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
        }
        // darken slightly – spines read better a bit deeper than the cover average
        const k = 0.82 / wsum
        resolve({
          color: toHex(r * k, g * k, b * k),
          aspect: img.naturalWidth / img.naturalHeight,
        })
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}
