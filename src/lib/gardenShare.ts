import { shareFileName } from './shareImage'

/**
 * A picture of the garden (D-0071 §4). The challenges' picture maker draws a
 * grid of tiles (`shareImage.ts`), which a garden is not: the garden is already
 * a drawing, so this one photographs the drawing instead.
 *
 * The flat garden is an inline SVG of plain shapes — no pictures to fetch, so
 * it serialises and draws cleanly — and the 3D garden is a canvas, which is
 * copied straight off. Whatever she has on screen is what she shares: the
 * season she is looking at, the bed she has open, the night.
 */

export const WIDTH = 1080
const PAD = 48
const HEADER = 150
const FOOTER = 64
const BG = '#1b1512'
const TEXT = '#f3ece2'
const ACCENT = '#d9a85b'
const MUTED = '#a5978a'
const SERIF = "'Iowan Old Style', Georgia, serif"

/** An image element with the SVG drawn into it, as a data URL (nothing is fetched). */
export function svgToImage(svg: SVGSVGElement): Promise<HTMLImageElement> {
  const copy = svg.cloneNode(true) as SVGSVGElement
  copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  const box = svg.viewBox.baseVal
  const w = box?.width || svg.clientWidth || WIDTH
  const h = box?.height || svg.clientHeight || WIDTH
  copy.setAttribute('width', String(w * 40))
  copy.setAttribute('height', String(h * 40))
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(copy))}`
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not read the garden'))
    img.src = url
  })
}

/** The drawing inside the stage: the flat garden's SVG, or the 3D garden's canvas. */
export async function stagePicture(stage: HTMLElement): Promise<CanvasImageSource & { width: number; height: number }> {
  const svg = stage.querySelector('svg.garden-svg')
  if (svg) return await svgToImage(svg as SVGSVGElement)
  const canvas = stage.querySelector('canvas')
  if (canvas) return canvas as HTMLCanvasElement
  throw new Error('Nothing to take a picture of')
}

export interface GardenShareSpec {
  title: string
  subtitle: string
}

/** Draws the picture: the garden under a heading, on the app's own dark card. */
export async function renderGardenImage(stage: HTMLElement, spec: GardenShareSpec): Promise<Blob> {
  const picture = await stagePicture(stage)
  const w = WIDTH - PAD * 2
  const scale = w / (picture.width || WIDTH)
  const h = Math.max(1, Math.round((picture.height || WIDTH) * scale))
  const height = HEADER + h + FOOTER
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not draw the picture')
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, WIDTH, height)

  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = TEXT
  ctx.font = `600 58px ${SERIF}`
  ctx.fillText(spec.title, PAD, 86)
  ctx.fillStyle = ACCENT
  ctx.font = `34px ${SERIF}`
  ctx.fillText(spec.subtitle, PAD, 132)

  ctx.drawImage(picture, PAD, HEADER, w, h)

  ctx.fillStyle = MUTED
  ctx.font = `26px ${SERIF}`
  ctx.fillText("Hanna's Reading List", PAD, height - 26)

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not draw the picture'))), 'image/png'),
  )
}

/** Draws the picture and shares it, or downloads it where sharing files isn't possible. */
export async function shareGarden(stage: HTMLElement, spec: GardenShareSpec): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const blob = await renderGardenImage(stage, spec)
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
