import { describe, expect, it } from 'vitest'
import { BED_COLUMNS, BED_ROWS, FLAT_ELEVATION, SCENE_ELEVATION, fitView, gardenLayout, plantHeight, project, slotPoint, spotPoint } from './view'
import { ITEM_SLOTS, SPOTS_PER_BED } from './numbers'

/**
 * The garden's arithmetic (T-0061, T-0062): where a bed, a spot and an item
 * slot are, and where that lands on screen. Both views use this, so the spot
 * buttons sit over the drawing in either.
 */

describe('the layout of a year garden', () => {
  it('stacks the beds in one column for the flat view', () => {
    const l = gardenLayout(3, 1)
    expect(l.beds).toHaveLength(3)
    expect(l.beds[0].x).toBe(l.beds[1].x)
    expect(l.beds[1].z).toBeGreaterThan(l.beds[0].z)
    expect(l.columns).toBe(1)
  })

  it('lays them out two across for the 3D view, so ten beds are not a corridor', () => {
    const l = gardenLayout(10, 2)
    expect(l.beds[1].x).toBeGreaterThan(l.beds[0].x)
    expect(l.beds[1].z).toBe(l.beds[0].z)
    expect(l.beds[2].z).toBeGreaterThan(l.beds[0].z)
    // five rows of two, plus the item strip
    expect(l.depth).toBeGreaterThan(l.beds[8].z)
  })

  it('keeps every spot inside its own bed', () => {
    const l = gardenLayout(2, 1)
    for (const bed of [0, 1])
      for (let s = 0; s < SPOTS_PER_BED; s++) {
        const p = spotPoint(l, bed, s)
        expect(p.x).toBeGreaterThan(l.beds[bed].x)
        expect(p.x).toBeLessThan(l.beds[bed].x + BED_COLUMNS + 1)
        expect(p.z).toBeGreaterThan(l.beds[bed].z)
        expect(p.z).toBeLessThan(l.beds[bed].z + BED_ROWS + 1)
      }
  })

  it('gives no two spots the same place', () => {
    const l = gardenLayout(3, 2)
    const seen = new Set<string>()
    for (const bed of [0, 1, 2]) for (let s = 0; s < SPOTS_PER_BED; s++) {
      const p = spotPoint(l, bed, s)
      seen.add(`${p.x},${p.z}`)
    }
    expect(seen.size).toBe(3 * SPOTS_PER_BED)
  })

  it('spreads the item slots along the strip at the bottom', () => {
    const l = gardenLayout(2, 1)
    const first = slotPoint(l, 0, ITEM_SLOTS)
    const last = slotPoint(l, ITEM_SLOTS - 1, ITEM_SLOTS)
    expect(first.x).toBeLessThan(last.x)
    expect(first.z).toBeGreaterThan(l.beds[1].z)
    expect(last.x).toBeLessThan(l.width)
  })
})

describe('putting the garden on screen', () => {
  const layout = gardenLayout(2, 1)

  it('fits the whole garden in the canvas', () => {
    const view = fitView(layout, 360, 600)
    const corner = project(view, layout, { x: 0, z: 0 })
    const far = project(view, layout, { x: layout.width, z: layout.depth })
    expect(corner.x).toBeGreaterThanOrEqual(0)
    expect(corner.y).toBeGreaterThanOrEqual(0)
    expect(far.x).toBeLessThanOrEqual(360.001)
    expect(far.y).toBeLessThanOrEqual(600.001)
  })

  it('looks straight down in the flat view: height does not move anything', () => {
    const view = fitView(layout, 360, 600, FLAT_ELEVATION, 2)
    const ground = project(view, layout, { x: 2, z: 2, y: 0 })
    const top = project(view, layout, { x: 2, z: 2, y: 1.5 })
    expect(top.x).toBeCloseTo(ground.x)
    expect(top.y).toBeCloseTo(ground.y)
  })

  it('leans the 3D view: a plant’s top is higher up the screen than its foot', () => {
    const view = fitView(layout, 1280, 700, SCENE_ELEVATION, 2)
    const ground = project(view, layout, { x: 2, z: 2, y: 0 })
    const top = project(view, layout, { x: 2, z: 2, y: 1.5 })
    expect(top.y).toBeLessThan(ground.y)
    expect(top.x).toBeCloseTo(ground.x)
    // a spot farther back is higher up the screen than one in front
    const back = project(view, layout, { x: 2, z: 1 })
    const front = project(view, layout, { x: 2, z: 5 })
    expect(back.y).toBeLessThan(front.y)
  })

  it('gives a sprout a small height and a grown tree a big one', () => {
    expect(plantHeight(1, 0.3)).toBeLessThan(plantHeight(1, 1))
    expect(plantHeight(0.24, 0.3)).toBeGreaterThan(0.1)
  })
})
