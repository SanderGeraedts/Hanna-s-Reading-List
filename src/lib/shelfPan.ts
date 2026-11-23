/**
 * Moving along the zoomed-in shelf (T-0025, D-0032): the small rules behind the ‹ › buttons,
 * the ← → keys and the mouse drag on the empty wall. The pan itself is `x` in metres, between
 * `-xMax` (the left end) and `xMax` (the right end); the scene keeps it.
 */

/** the shelf must be able to move more than this (metres) before it counts as "can pan" */
export const PAN_THRESHOLD = 0.03
/** within this of an end (metres) the button on that side is disabled */
export const PAN_END_TOLERANCE = 0.001
/** a ‹ › press moves three quarters of what is on screen, an arrow key a fifth */
export const BUTTON_STEP_SHARE = 0.75
export const KEY_STEP_SHARE = 0.2
/** a mouse press becomes a drag (of a book or of the wall) past this many pixels, as a book drag always did */
export const DRAG_START_PX = 6

/** ‹ / ← is -1 (the view moves to the left), › / → is 1 */
export type PanDirection = -1 | 1

/** Keeps a pan inside the shelf: never past either end, and 0 when the shelf can't move. */
export function clampPan(x: number, xMax: number): number {
  if (!(xMax > 0)) return 0
  return Math.min(xMax, Math.max(-xMax, x))
}

export interface PanEdges {
  canPan: boolean
  atStart: boolean
  atEnd: boolean
}

/** Whether the shelf can move sideways, and whether it is at its left or right end. */
export function panEdges(x: number, xMax: number): PanEdges {
  const canPan = xMax > PAN_THRESHOLD
  return {
    canPan,
    atStart: canPan && x <= -xMax + PAN_END_TOLERANCE,
    atEnd: canPan && x >= xMax - PAN_END_TOLERANCE,
  }
}

export const sameEdges = (a: PanEdges, b: PanEdges) =>
  a.canPan === b.canPan && a.atStart === b.atStart && a.atEnd === b.atEnd

/** How far (metres) one step moves the pan: a share of the visible width, signed by the direction. */
export function panStep(direction: PanDirection, visibleWidth: number, share: number): number {
  return direction * share * visibleWidth
}

export const buttonStep = (direction: PanDirection, visibleWidth: number) =>
  panStep(direction, visibleWidth, BUTTON_STEP_SHARE)
export const keyStep = (direction: PanDirection, visibleWidth: number) =>
  panStep(direction, visibleWidth, KEY_STEP_SHARE)

/** Where a key event landed, as far as the shelf's arrows care. */
export type KeyTarget = 'body' | 'canvas' | 'shelf-button' | 'other'

/** marks the wrappers of the shelf's own buttons (‹ › and the zoom buttons) */
export const SHELF_CONTROLS_ATTR = 'data-shelf-controls'

/** Sorts a key event's target into the page itself, the shelf's canvas, one of its buttons, or anything else. */
export function keyTarget(target: EventTarget | null, canvas: HTMLCanvasElement | null): KeyTarget {
  if (!target || typeof (target as Element).closest !== 'function') return 'other'
  const el = target as Element
  if (el === el.ownerDocument.body) return 'body'
  if (canvas && el === canvas) return 'canvas'
  if (el.tagName === 'BUTTON' && el.closest(`[${SHELF_CONTROLS_ATTR}]`)) return 'shelf-button'
  return 'other'
}

export interface ArrowKeyInput {
  key: string
  shiftKey: boolean
  ctrlKey: boolean
  altKey: boolean
  metaKey: boolean
  defaultPrevented: boolean
  target: KeyTarget
  /** a book is open (the book panel) */
  bookOpen: boolean
  /** the shelf isn't showing (dashboard, calendar, challenges) */
  offShelf: boolean
  /** a panel lies over the shelf (room, Make a wish, quick update, wrap-up, …) */
  panelOpen: boolean
  canPan: boolean
}

/**
 * The ← → rule: the direction to move the shelf, or null when the key isn't the shelf's
 * (another key, a modifier, someone else has the keyboard, or there is nothing to move).
 */
export function arrowKeyDirection(e: ArrowKeyInput): PanDirection | null {
  const direction: PanDirection | null = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : null
  if (direction === null) return null
  if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey || e.defaultPrevented) return null
  if (e.bookOpen || e.offShelf || e.panelOpen || !e.canPan) return null
  if (e.target === 'other') return null
  return direction
}

/**
 * After the phone turns with a book out, the shelf behind snaps back to the top row — the
 * row she opened the book at. Without this the previous landscape midpoint carried over
 * to portrait, so the shelf sat a few rows lower (T-0044, F8).
 *
 * `currentY` is the camera's shelf-height target so far; `top` is the top of the range for
 * the new orientation. When the orientation changed and a book is open, snap to `top`;
 * otherwise keep `currentY`.
 */
export function scrollYOnTurn(args: {
  currentY: number | null
  wasPortrait: boolean
  portrait: boolean
  open: boolean
  top: number
}): number | null {
  if (args.open && args.wasPortrait !== args.portrait) return args.top
  return args.currentY
}

export type MousePress = 'undecided' | 'book' | 'wall' | 'none'

export interface MousePressInput {
  /** pixels the mouse has moved since the press */
  moved: number
  /** a book's own pointerdown claimed the press (`pending` is set) */
  pending: boolean
  /** the mouse button pressed: 0 is the left one */
  button: number
  canPan: boolean
  bookOpen: boolean
}

/**
 * What a mouse press on the shelf turns into, decided at the first move past 6 px: a book drag
 * when a book claimed it, a wall pan when it landed on the empty wall and the shelf can move,
 * otherwise nothing. Under 6 px it is still undecided, so a click stays a click.
 */
export function mousePress(p: MousePressInput): MousePress {
  if (p.moved < DRAG_START_PX) return 'undecided'
  if (p.pending) return 'book'
  if (p.button !== 0 || !p.canPan || p.bookOpen) return 'none'
  return 'wall'
}
