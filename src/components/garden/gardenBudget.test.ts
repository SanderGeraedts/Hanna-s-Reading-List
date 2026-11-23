import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import type { Book } from '#/lib/library'
import { addDays } from '#/lib/creatures/days'
import { drawCost } from '../creatures/shopModels'
import { deriveGarden } from '#/lib/garden/garden'
import type { Plant } from '#/lib/garden/garden'
import { DETAILED_PLANTS, GARDEN_ITEMS, ITEM_SLOTS, SPOTS_PER_BED } from '#/lib/garden/numbers'
import { PLANT_KINDS, PLANT_KIND_IDS } from '#/lib/garden/plants'
import { SEASONS } from '#/lib/garden/seasons'
import { gardenLayout, slotPoint, spotPoint } from '#/lib/garden/view'
import { sceneColumns, sceneView } from './gardenView'
import { buildBeds, buildGround, buildItem, buildPlant, buildPlantField, buildShadows, buildVisitors, buildWeather, lookOf } from './plantModel'

/**
 * The 3D garden's budget (T-0062 Done when 1, D-0051 §6): the fullest garden on
 * screen — a hundred plants over nine beds, every garden item, the visitors and
 * the snow — stays at or under **60 draw calls and 20,000 triangles**, the den's
 * budget on a phone-grade setting, measured with the den's own `drawCost`.
 *
 * Also: one plant is one draw call, so the count grows with the beds and not
 * with the plants; and every spot of the fullest garden stays inside the canvas,
 * which is what puts the spot buttons over the plants.
 */

const CALLS = 60
const TRIANGLES = 20_000

let next = 0
const finished = (day: string, over: Partial<Book> = {}): Book => ({
  id: `b${next++}`,
  title: `Book ${next}`,
  authors: [],
  color: '#333',
  status: 'read',
  addedAt: next,
  finished: [day],
  readingLog: { [day]: 0.4 },
  ...over,
})

const GENRES = ['Fantasy', 'Romance', 'Thriller', 'Science fiction', 'Classics', 'Non-fiction', 'Humour', 'Poetry', 'Graphic novel']

/** A garden of `n` plants of every kind, in one year. */
function gardenOf(n: number, today: string) {
  next = 0
  const books = Array.from({ length: n }, (_, i) =>
    finished(addDays(`${today.slice(0, 4)}-01-01`, i % 300), { genres: [GENRES[i % GENRES.length]], pages: 90 + (i % 7) * 120 }),
  )
  return deriveGarden(books, [], { today })
}

/** The whole scene the garden draws, as `GardenScene` builds it. */
function build(plants: Plant[], beds: number, season: (typeof SEASONS)[number], items: number, visitors: number, front: 'low' | 'high' = 'low') {
  const columns = sceneColumns(beds)
  const layout = gardenLayout(beds, columns)
  const root = new THREE.Group()
  root.add(buildGround(layout, season))
  root.add(buildBeds(layout, season))
  const shadows: Array<{ x: number; z: number; r: number }> = []
  const order = [...plants].sort((a, b) => b.bed - a.bed || b.spot - a.spot)
  const field: Array<{ look: ReturnType<typeof lookOf>; x: number; z: number }> = []
  order.forEach((p, i) => {
    const at = spotPoint(layout, p.bed, p.spot)
    shadows.push({ x: at.x, z: at.z, r: 0.3 + p.scale * 0.25 })
    if (i < DETAILED_PLANTS) {
      const mesh = buildPlant(lookOf(p, season), front)
      mesh.position.set(at.x, 0.13, at.z)
      root.add(mesh)
    } else field.push({ look: lookOf(p, season, true), x: at.x, z: at.z })
  })
  const behind = buildPlantField(field)
  if (behind) root.add(behind)
  root.add(buildShadows(shadows))
  GARDEN_ITEMS.slice(0, items).forEach((item, i) => {
    const at = slotPoint(layout, i % ITEM_SLOTS, ITEM_SLOTS)
    const mesh = buildItem(item.id, season)
    mesh.position.set(at.x, 0, at.z)
    root.add(mesh)
  })
  const guests = Array.from({ length: visitors }, (_, i) => ({ x: i, y: 1.2, z: i, colour: '#e2c05a' }))
  const flyers = buildVisitors(guests)
  if (flyers) root.add(flyers)
  const sky = buildWeather(layout, season)
  if (sky) root.add(sky)
  return { root, layout }
}

describe('one plant is one draw call', () => {
  it('builds every kind, stage and season as a single mesh of its own', () => {
    for (const id of PLANT_KIND_IDS)
      for (const season of SEASONS)
        for (const sprout of [false, true]) {
          const mesh = buildPlant({ kind: PLANT_KINDS[id], sprout, season, blooming: true, night: false, height: 1.6 }, 'low')
          const cost = drawCost(mesh, false)
          expect(cost.calls, `${id} ${season}`).toBe(1)
          expect(cost.triangles, `${id} ${season}`).toBeLessThanOrEqual(400)
          expect(mesh.geometry.attributes.color, `${id} colour`).toBeDefined()
        }
  })

  it('keeps a garden item to one draw call too', () => {
    for (const item of GARDEN_ITEMS)
      for (const season of SEASONS) {
        const cost = drawCost(buildItem(item.id, season), false)
        expect(cost.calls, item.id).toBe(1)
        expect(cost.triangles, item.id).toBeLessThanOrEqual(600)
      }
  })
})

describe('the fullest garden', () => {
  for (const season of SEASONS) {
    it(`stays within ${CALLS} draw calls and ${TRIANGLES} triangles in ${season}`, () => {
      const today = `2026-${season === 'winter' ? '12' : season === 'spring' ? '04' : season === 'summer' ? '07' : '10'}-15`
      const garden = gardenOf(100, today)
      const year = garden.years[0]
      const { root } = build(year.plants, year.beds, season, GARDEN_ITEMS.length, 6)
      const cost = drawCost(root, false)
      expect(cost.calls, `${season} draw calls`).toBeLessThanOrEqual(CALLS)
      expect(cost.triangles, `${season} triangles`).toBeLessThanOrEqual(TRIANGLES)
    })
  }

  it('stays within the den’s computer budget (80 draw calls, 40,000 triangles) with the front plants in full', () => {
    const year = gardenOf(114, '2026-07-15').years[0]
    const cost = drawCost(build(year.plants, year.beds, 'summer', GARDEN_ITEMS.length, 6, 'high').root, false)
    expect(cost.calls).toBeLessThanOrEqual(80)
    expect(cost.triangles).toBeLessThanOrEqual(40_000)
  })

  it('does not grow its draw calls with every extra plant', () => {
    const small = gardenOf(10, '2026-07-15').years[0]
    const big = gardenOf(114, '2026-07-15').years[0]
    const a = drawCost(build(small.plants, small.beds, 'summer', 2, 2).root, false)
    const b = drawCost(build(big.plants, big.beds, 'summer', 6, 6).root, false)
    expect(big.plants.length / small.plants.length).toBeGreaterThan(10)
    // ten times the plants, nowhere near ten times the cost
    expect(b.calls).toBeLessThan(a.calls * 3)
    expect(b.calls).toBeLessThanOrEqual(CALLS)
  })

  it('keeps every spot inside the canvas, so the buttons sit over the plants', () => {
    for (const beds of [1, 2, 5, 10]) {
      const layout = gardenLayout(beds, sceneColumns(beds))
      const view = sceneView(layout)
      for (let bed = 0; bed < beds; bed++)
        for (let spot = 0; spot < SPOTS_PER_BED; spot++) {
          const p = spotPoint(layout, bed, spot)
          const at = { x: ((p.x - 0) / layout.width) * 100, z: ((p.z - 0) / layout.depth) * 100 }
          expect(at.x, `bed ${bed} spot ${spot}`).toBeGreaterThanOrEqual(0)
          expect(at.x).toBeLessThanOrEqual(100)
          expect(at.z).toBeGreaterThanOrEqual(0)
          expect(at.z).toBeLessThanOrEqual(100)
        }
      expect(view.scale).toBeGreaterThan(0)
    }
  })
})

describe('the numbers for the record', () => {
  it('prints what the garden costs (T-0062, T-0065 Test)', () => {
    const rows: string[] = []
    for (const n of [1, 12, 50, 114]) {
      const year = gardenOf(n, '2026-10-15').years[0]
      const cost = drawCost(build(year.plants, year.beds, 'autumn', GARDEN_ITEMS.length, 6).root, false)
      const high = drawCost(build(year.plants, year.beds, 'autumn', GARDEN_ITEMS.length, 6, 'high').root, false)
      rows.push(`${n} plants / ${year.beds} beds: phone ${cost.calls} draw calls, ${Math.round(cost.triangles)} triangles; computer ${high.calls} / ${Math.round(high.triangles)}`)
    }
    // eslint-disable-next-line no-console
    console.log(`the 3D garden on a phone-grade setting:\n  ${rows.join('\n  ')}`)
    expect(rows).toHaveLength(4)
  })
})
