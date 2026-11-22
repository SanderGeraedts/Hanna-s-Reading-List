import * as THREE from 'three'

/** share of a phone screen taken by the header at the top, until its real height is known */
export const HEADER_SHARE = 0.1

/**
 * On a phone the details sheet covers the bottom of the screen: fit the
 * inspected book into the space between the header and the sheet.
 */
export function portraitInspect(frame: { fill: number; yShift: number }, sheet: number, aspect: number, header = HEADER_SHARE) {
  const s = Math.min(0.9, Math.max(0, sheet))
  const free = Math.max(0.15, 1 - s - header)
  // also keep the widest books (cover aspect up to 0.82) inside the screen width
  const byWidth = (0.88 * aspect) / 0.82
  frame.fill = Math.min(0.6, free * 0.85, byWidth)
  frame.yShift = (s - header) / 2
}

/** distance from the camera at which a book of height `h` fills `fill` of the view's height */
export function inspectDistance(h: number, fill: number, fov: number) {
  return h / (2 * Math.tan(THREE.MathUtils.degToRad(fov / 2)) * fill)
}

export interface PlacementInput {
  /** z of the camera at her zoom (`cameraZ(toCase)`) */
  cameraZ: number
  /** z of the case's front edge */
  caseFront: number
  bookH: number
  bookW: number
  bookT?: number
  fill: number
  fov: number
}

export interface Placement {
  cameraZ: number
  bookZ: number
  backdropZ: number
}

/** room kept between each layer, in metres */
export const INSPECT_MARGIN = 0.02
/** how far something may stick out of the case: a search match comes forward MATCH_FORWARD (0.06), a hovered book 0.035 */
const STICKS_OUT = 0.06

/**
 * Where the camera, the opened book and the dimming stand, front to back (T-0026):
 * camera → the book, `dist` in front of it (so it fills `fill` of the view) → room for the book to
 * turn plus a margin → the dimming → a margin → the case's front and what sticks out of it.
 * The camera steps back from her zoom only when that order needs it, so the book keeps its size
 * and place on screen and both stay in front of the case.
 */
export function inspectPlacement({ cameraZ, caseFront, bookH, bookW, bookT = 0, fill, fov }: PlacementInput): Placement {
  const dist = inspectDistance(bookH, fill, fov)
  // however she turns the book by dragging, no corner reaches further than this from its centre
  const reach = Math.hypot(bookW, bookH, bookT) / 2
  const backdropMin = caseFront + STICKS_OUT + INSPECT_MARGIN
  const bookMin = backdropMin + reach + INSPECT_MARGIN
  const camera = Math.max(cameraZ, bookMin + dist)
  const bookZ = camera - dist
  // the dimming stands right behind the turning book, so nothing between them is dimmed twice
  return { cameraZ: camera, bookZ, backdropZ: bookZ - reach - INSPECT_MARGIN }
}
