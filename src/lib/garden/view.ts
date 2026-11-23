import { BED_COLUMNS, BED_ROWS, SPOTS_PER_BED } from './numbers'

/**
 * Where everything is, in garden units, and where that lands on screen
 * (T-0061, T-0062). One spot is one unit. Both views lay the beds out with
 * this, and both put the same spot buttons over the drawing by projecting the
 * same points: straight down for the flat view, from a fixed low angle for the
 * 3D one. Nothing here draws; it is only arithmetic, so it can be tested.
 */

/** A bed is a little bigger than its spots: a rim of earth around them. */
export const BED_RIM = 0.4
export const BED_W = BED_COLUMNS + BED_RIM * 2
export const BED_D = BED_ROWS + BED_RIM * 2
/** Grass between the beds. */
export const BED_GAP = 1
/** The item strip along the bottom of the garden. */
export const STRIP_D = 1.6

/** Straight down (the flat view) and the 3D view's fixed angle, in radians. */
export const FLAT_ELEVATION = Math.PI / 2
export const SCENE_ELEVATION = (55 * Math.PI) / 180

export interface BedBox {
  bed: number
  /** the bed's left and far edge, in units */
  x: number
  z: number
}

export interface GardenLayout {
  beds: BedBox[]
  columns: number
  /** the whole garden, in units */
  width: number
  depth: number
  /** the item strip's far edge */
  stripZ: number
}

/** The beds of a year garden, in a grid of `columns` beds across. */
export function gardenLayout(beds: number, columns = 1): GardenLayout {
  const cols = Math.max(1, Math.min(columns, beds));
  const rows = Math.ceil(beds / cols)
  const boxes: BedBox[] = []
  for (let b = 0; b < beds; b++) {
    const c = b % cols
    const r = Math.floor(b / cols)
    boxes.push({ bed: b, x: BED_GAP + c * (BED_W + BED_GAP), z: BED_GAP + r * (BED_D + BED_GAP) })
  }
  const width = BED_GAP + cols * (BED_W + BED_GAP)
  const depth = BED_GAP + rows * (BED_D + BED_GAP) + STRIP_D
  return { beds: boxes, columns: cols, width, depth, stripZ: depth - STRIP_D }
}

/** The middle of a spot, in units. */
export function spotPoint(layout: GardenLayout, bed: number, spot: number): { x: number; z: number } {
  const box = layout.beds[bed] ?? layout.beds[0] ?? { x: 0, z: 0 }
  const column = spot % BED_COLUMNS
  const row = Math.floor(spot / BED_COLUMNS) % BED_ROWS
  return { x: box.x + BED_RIM + column + 0.5, z: box.z + BED_RIM + row + 0.5 }
}

/** The middle of an item slot, in units. */
export function slotPoint(layout: GardenLayout, slot: number, slots: number): { x: number; z: number } {
  const step = layout.width / slots
  return { x: step * (slot + 0.5), z: layout.stripZ + STRIP_D / 2 }
}

export interface ViewBox {
  /** pixels per unit */
  scale: number
  /** where the middle of the garden sits on screen, in pixels */
  cx: number
  cy: number
  elevation: number
  width: number
  height: number
}

/**
 * How big the garden is drawn so that it fits a canvas of `w` × `h` pixels,
 * seen at `elevation`. Straight down, the garden takes its own width and depth;
 * from an angle, its depth is foreshortened and its height is not — the extra
 * `lift` units above the ground (the tallest plant) are what stick up.
 */
export function fitView(layout: GardenLayout, w: number, h: number, elevation = FLAT_ELEVATION, lift = 0): ViewBox {
  const sin = Math.sin(elevation)
  const cos = Math.cos(elevation)
  const needW = layout.width
  const needH = layout.depth * sin + lift * cos
  const scale = Math.min(w / needW, h / needH)
  return { scale, cx: w / 2, cy: h / 2, elevation, width: w, height: h }
}

/**
 * A point in the garden on screen, in pixels from the canvas's top left. `y` is
 * the height above the ground (a plant's top), which only leans into the
 * picture when the view is at an angle.
 */
export function project(view: ViewBox, layout: GardenLayout, p: { x: number; y?: number; z: number }): { x: number; y: number } {
  const sin = Math.sin(view.elevation)
  const cos = Math.cos(view.elevation)
  const dx = p.x - layout.width / 2
  const dz = p.z - layout.depth / 2
  const dy = p.y ?? 0
  return { x: view.cx + dx * view.scale, y: view.cy - (dy * cos - dz * sin) * view.scale }
}

/** How tall a spot's plant is drawn, in units, for a plant of `scale` and a kind of `height`. */
export const plantHeight = (height: number, scale: number) => Math.max(0.12, height * scale * 1.6)

export { BED_COLUMNS, BED_ROWS, SPOTS_PER_BED }
