import { ITEM_SLOTS } from '#/lib/garden/numbers'
import { FLAT_ELEVATION, SCENE_ELEVATION, fitView, gardenLayout, project, slotPoint, spotPoint } from '#/lib/garden/view'
import type { GardenLayout, ViewBox } from '#/lib/garden/view'

/**
 * Where a spot lands on the stage, as a percentage of its width and height
 * (T-0061 §5, T-0062 §5). Both views put the same buttons over their drawing
 * with this: straight down for the flat garden, from the 3D view's own angle
 * for the scene, where the orthographic camera is set to the same scale.
 *
 * Percentages, not pixels, so nothing has to be measured as the window changes.
 */

/** The stage the percentages are worked out in; its shape is fixed by CSS. */
export const NOMINAL_W = 1000
/** The 3D stage's shape: the garden's own, so the camera has no wasted green around it. */
export const SCENE_ASPECT = 16 / 9
export function sceneAspect(layout: GardenLayout): number {
  const need = layout.depth * Math.sin(SCENE_ELEVATION) + LIFT * Math.cos(SCENE_ELEVATION)
  return Math.max(1.1, Math.min(2.2, layout.width / need))
}
/** The tallest plant to keep in view, in garden units. */
const LIFT = 2.4

/** Beds across in the 3D view: a square-ish garden rather than a long corridor. */
export const sceneColumns = (beds: number) => Math.max(1, Math.min(3, Math.ceil(Math.sqrt(beds))))

export const sceneView = (layout: GardenLayout): ViewBox =>
  fitView(layout, NOMINAL_W, NOMINAL_W / sceneAspect(layout), SCENE_ELEVATION, LIFT)

export type Place = { left: number; top: number }

/** The flat garden: the drawing is the layout itself, so a spot is simply where it is. */
export function flatPlace(layout: GardenLayout, bed: number, spot: number): Place {
  const p = spotPoint(layout, bed, spot)
  return { left: (p.x / layout.width) * 100, top: (p.z / layout.depth) * 100 }
}

export function flatSlotPlace(layout: GardenLayout, slot: number): Place {
  const p = slotPoint(layout, slot, ITEM_SLOTS)
  return { left: (p.x / layout.width) * 100, top: (p.z / layout.depth) * 100 }
}

/** The 3D garden: the point on the ground, through the scene's own projection. */
export function scenePlace(layout: GardenLayout, bed: number, spot: number): Place {
  const view = sceneView(layout)
  const p = spotPoint(layout, bed, spot)
  const at = project(view, layout, { x: p.x, z: p.z, y: 0.25 })
  return { left: (at.x / view.width) * 100, top: (at.y / view.height) * 100 }
}

export function sceneSlotPlace(layout: GardenLayout, slot: number): Place {
  const view = sceneView(layout)
  const p = slotPoint(layout, slot, ITEM_SLOTS)
  const at = project(view, layout, { x: p.x, z: p.z, y: 0.2 })
  return { left: (at.x / view.width) * 100, top: (at.y / view.height) * 100 }
}

export { FLAT_ELEVATION, SCENE_ELEVATION, gardenLayout }
