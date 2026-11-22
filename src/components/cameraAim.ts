import * as THREE from 'three'
import { FRAME, SHELF } from '#/lib/shelfLayout'

export const FOV = 35

export interface CaseFraming {
  /** distance from the camera to the front of the case */
  toCase: number
  /** height of the view at the case, in metres */
  viewH: number
  /** width of the view at the case, in metres */
  viewW: number
  /** how far the camera may move sideways either way (0 when the whole width is on screen) */
  xMax: number
  /** height the camera looks at when everything fits, and whether it does */
  fitsH: boolean
}

/**
 * How close the camera comes to the case and how far it may pan sideways. On wide screens the
 * whole case fits; on a phone held upright it is framed to the width of the screen. Zooming in
 * brings the camera closer (1: the whole case).
 */
export function frameCase(caseWidth: number, caseHeight: number, aspect: number, portrait: boolean, zoom: number): CaseFraming {
  const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2))
  // phones use (nearly) the full width; desktops keep a margin round the case
  const marginW = portrait ? 1.09 : FRAME.horizontal
  const distW = (caseWidth * marginW) / 2 / (tan * aspect)
  // leave room for the header at the top
  const distH = (caseHeight * FRAME.vertical) / 2 / tan
  // desktops show the whole case; phones held upright scroll through it
  const fitted = Math.max(distW, portrait ? 0 : distH, 0.9)
  const toCase = Math.max(0.35, fitted / Math.max(1, zoom))
  const viewH = 2 * toCase * tan
  const viewW = viewH * aspect
  // zoomed in, the camera can move sideways as far as the case reaches, with a strip of wall
  // past each end so the ‹ › button there covers no book
  const xMax = Math.max(0, caseWidth / 2 - viewW / 2 + 0.05)
  return { toCase, viewH, viewW, xMax, fitsH: distH <= toCase }
}

/** z of the camera for a framing: in front of the case's front edge */
export const cameraZ = (toCase: number) => toCase + SHELF.depth / 2

/** The eased state of the aim, kept between frames. */
export interface Aim {
  /** the point the camera looks at, eased like the camera so the view never jolts */
  lookX: number | null
  lookY: number | null
  /** vertical parallax offset, eased gently like the sideways one */
  tiltY: number
}

export const newAim = (): Aim => ({ lookX: null, lookY: null, tiltY: 0 })

/**
 * Places the camera for one frame: it eases towards `target` (where the shelf is scrolled and
 * panned to) plus a touch of mouse parallax, and looks straight ahead at the pan (T-0025). The
 * parallax moves only the camera, never the aim, so the view doesn't bob with the mouse.
 */
export function aimCamera(
  camera: THREE.Camera,
  target: { x: number; y: number; z: number },
  aim: Aim,
  parallax: { x: number; y: number },
  dt: number,
) {
  const d = Math.min(dt, 0.05)
  const damp = THREE.MathUtils.damp
  aim.lookX = damp(aim.lookX ?? target.x, target.x, 3, d)
  aim.lookY = damp(aim.lookY ?? target.y, target.y, 6, d)
  aim.tiltY = damp(aim.tiltY, parallax.y, 3, d)
  camera.position.set(
    damp(camera.position.x, target.x + parallax.x, 3, d),
    aim.lookY + aim.tiltY,
    damp(camera.position.z, target.z, 3, d),
  )
  // look straight ahead at the pan and the shelf height (not following the parallax),
  // easing at the same rate as the camera so moving stays level
  camera.lookAt(aim.lookX, aim.lookY, 0)
}
