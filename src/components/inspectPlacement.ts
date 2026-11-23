import * as THREE from 'three'

/** share of a phone screen taken by the header at the top, until its real height is known */
export const HEADER_SHARE = 0.1

/** the details sheet on a phone: its lowest height (the handle and the title) and its highest share */
export const SHEET_MIN_PX = 96
export const SHEET_MAX = 0.88
/** while a book is open on a phone, at least this share of the screen stays free for it between the header and the sheet (T-0037) */
export const MIN_BOOK_SPACE = 0.25

/** the highest the sheet may go, as a share of the screen, for the header's share (T-0037) */
export const sheetCap = (header: number) => Math.min(SHEET_MAX, 1 - header - MIN_BOOK_SPACE)

/** the header's share of the screen: measured once it is known, HEADER_SHARE until then */
export const headerShareOf = (headerPx: number, screenPx: number) => (headerPx > 0 ? headerPx / Math.max(1, screenPx) : HEADER_SHARE)

/** a sheet height in px, kept between its lowest and the cap (a share of the screen) */
export const clampSheetPx = (px: number, screenPx: number, cap: number) =>
  Math.round(Math.min(screenPx * cap, Math.max(SHEET_MIN_PX, px)))

/** the widest cover a book has (width / height) */
export const WIDEST_COVER = 0.82

/** how the opened book is framed: share of the view's height it fills, and how far it sits up and sideways (shares of the view's height and width) */
export interface InspectFrame {
  fill: number
  yShift: number
  xShift: number
}

export const DEFAULT_INSPECT: Readonly<InspectFrame> = { fill: 0.6, yShift: 0, xShift: 0 }

/**
 * On a phone the details sheet covers the bottom of the screen: fit the
 * inspected book into the space between the header and the sheet.
 * `clip` is how far a book's paper clip sticks out above it, as a share of the book's height
 * (0 for a book without one): the book and its clip both fit, and stand centred together (T-0037).
 */
export function portraitInspect(frame: InspectFrame, sheet: number, aspect: number, header = HEADER_SHARE, clip = 0) {
  const s = Math.min(0.9, Math.max(0, sheet))
  const free = Math.max(0.15, 1 - s - header)
  // also keep the widest books (cover aspect up to 0.82) inside the screen width
  const byWidth = (0.88 * aspect) / WIDEST_COVER
  frame.fill = Math.min(0.6, free * 0.85, free / (1 + clip), byWidth)
  // the book and its clip are centred in the space: the cover half a clip lower
  frame.yShift = (s - header) / 2 - (frame.fill * clip) / 2
  frame.xShift = 0
}

/** room kept between the opened book and the header, the panel and the screen's edges, in px */
export const INSPECT_EDGE_PX = 12

/** the free part of a screen that is not portrait, in px from the top left */
export interface FreeRect {
  width: number
  height: number
  /** the header's bottom */
  top: number
  /** the details panel's left edge (the screen's width when the panel is a sheet) */
  right: number
  /** the sheet's top (the screen's height when the panel is at the side) */
  bottom: number
}

/**
 * A screen that is not portrait (T-0037, F3): the book stands centred at `fill` 0.6, as always,
 * when that leaves it clear of the details panel (or the sheet). Where it would stand under the
 * panel (a phone held sideways, a small window) it is framed in the free rectangle instead: below
 * the header and left of the panel, the book and its clip centred there.
 */
export function landscapeInspect(frame: InspectFrame, r: FreeRect, clip = 0, edge = INSPECT_EDGE_PX) {
  const { width: W, height: H } = r
  const half = (DEFAULT_INSPECT.fill * H) / 2
  const halfW = half * WIDEST_COVER
  const fits = W / 2 + halfW <= r.right - edge && W / 2 - halfW >= edge && H / 2 + half <= r.bottom - edge
  if (fits) {
    Object.assign(frame, DEFAULT_INSPECT)
    return
  }
  const top = r.top + edge
  const bottom = r.bottom - edge
  const left = edge
  const right = r.right - edge
  frame.fill = Math.max(0.1, Math.min(DEFAULT_INSPECT.fill, (bottom - top) / (H * (1 + clip)), (right - left) / (H * WIDEST_COVER)))
  // the book and its clip centred in the rectangle
  const cy = (top + bottom) / 2 + (frame.fill * H * clip) / 2
  const cx = (left + right) / 2
  frame.yShift = (H / 2 - cy) / H
  frame.xShift = (cx - W / 2) / W
}

/** the details panel at the side (`.panel` in styles.css): 340 px wide at most, 1.25 rem from the right */
export const PANEL_WIDTH_PX = 340
export const PANEL_RIGHT_PX = 20
/** where the panel at the side starts, from the left */
export const panelLeft = (width: number) => width - PANEL_RIGHT_PX - Math.min(PANEL_WIDTH_PX, width - 2 * PANEL_RIGHT_PX)
/** the screens on which the panel is a sheet at the bottom (`SHEET_QUERY` in BookPanel) */
export const SHEET_MAX_WIDTH = 720

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

/**
 * Reduced motion (T-0026, T-0037 F2): the camera never glides to and from an opened book.
 * - `back`: a book is open: the camera is at its stepped-back place in this frame
 * - `hold`: the book was put back and is still flying home: the camera stays where it was
 * - `zoom`: the book is home: the camera is back at her zoom in this frame
 * - `ease`: nothing to jump for (or reduced motion is off): the camera eases as always
 */
export type ReducedCamera = 'back' | 'hold' | 'zoom' | 'ease'

export function reducedMotionCamera({
  reduced,
  open,
  flyingHome,
  held,
}: {
  reduced: boolean
  /** a book is open now */
  open: boolean
  /** a put-back book has not reached the shelf yet (or a book was open in the last frame) */
  flyingHome: boolean
  /** the camera was stepped back or held in the last frame */
  held: boolean
}): ReducedCamera {
  if (!reduced) return 'ease'
  if (open) return 'back'
  if (flyingHome) return 'hold'
  return held ? 'zoom' : 'ease'
}

/** the sheet's height in px when it opens, the screen turns or the cap changes: the share she last saw, kept under the cap */
export const openingSheetPx = (saved: number, screenPx: number, cap: number) => clampSheetPx(Math.min(saved, cap) * screenPx, screenPx, cap)
