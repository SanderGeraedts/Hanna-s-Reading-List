import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { SPECIES } from '#/lib/creatures/species'
import { DEN_SLOTS, OUTFIT_SLOTS, SHOP_ITEMS } from '#/lib/creatures/shop'
import type { DenSlot, OutfitSlot } from '#/lib/creatures/shop'
import { creatureFor } from './pose'
import type { CreatureQuality } from './model'
import { SPARKLE_SPOTS } from './eggModel'
import {
  BED_SEAT_Y,
  BOWL_SPOT,
  DEFAULT_SEAT_Y,
  DEN_SPOTS,
  HABITAT_IDS,
  buildBowl,
  buildDenItem,
  buildRoom,
  denCamera,
  drawCost,
  dressCreature,
  outfitModel,
  seatYOf,
} from './shopModels'

/**
 * The den's budget (T-0031 Design §10, Done when 3 and 10): the fullest den (a
 * habitat, all six spots filled with the biggest items, the window with
 * weather, a shiny grown-up wearing four pieces, a full bowl) stays at or under
 * 60 draw calls and 20,000 triangles on a phone (`low`) and 80 / 40,000 on a
 * computer (`high`, where shadow casters draw twice). Built from the same
 * builders the den draws with; draw calls are counted like `renderer.info`
 * (one per mesh, sprite or points). Also: every piece within its own budget,
 * and every spot fully in view at 390 (300 px and 180 px canvases) and 1280.
 */

const BUDGET: Record<CreatureQuality, { calls: number; triangles: number }> = {
  low: { calls: 60, triangles: 20_000 },
  high: { calls: 80, triangles: 40_000 },
}
const ofSlot = (slot: DenSlot) => SHOP_ITEMS.filter((i) => i.slot === slot && (i.category === 'home' || i.category === 'toys')).map((i) => i.id)
const outfitsOf = (slot: OutfitSlot) => SHOP_ITEMS.filter((i) => i.category === 'outfits' && i.slot === slot).map((i) => i.id)

function cost(o: THREE.Object3D, q: CreatureQuality) {
  return drawCost(o, q === 'high')
}

/** The costliest of a list by draw calls, then triangles. */
function worst<T>(list: T[], f: (x: T) => { calls: number; triangles: number }) {
  return list.map((x) => ({ x, ...f(x) })).sort((a, b) => b.calls - a.calls || b.triangles - a.triangles)[0]
}

describe.each(['low', 'high'] as const)('the den on %s', (q) => {
  const shadows = q === 'high'

  it('keeps every outfit to 1 draw call (≤ 300 triangles on low)', () => {
    for (const i of SHOP_ITEMS.filter((x) => x.category === 'outfits')) {
      const m = outfitModel(i.id, q)
      const c = drawCost(m, false)
      expect(c.calls, i.id).toBe(1)
      if (q === 'low') expect(c.triangles, i.id).toBeLessThanOrEqual(300)
    }
  })

  it('keeps every home item and toy to ≤ 3 draw calls and ≤ 800 triangles, a habitat to ≤ 6 and ≤ 3,000, the weather to 1', () => {
    for (const i of SHOP_ITEMS.filter((x) => x.category === 'home' || x.category === 'toys')) {
      const g = buildDenItem(i.id, q, { sky: 'night', weather: 'snow' })
      const c = drawCost(g, false)
      expect(c.calls, i.id).toBeLessThanOrEqual(3)
      expect(c.triangles, i.id).toBeLessThanOrEqual(800)
    }
    // snow is one Points (one draw call); rain is one merged-streaks Mesh (one draw call) too
    const rainWin = buildDenItem('weather-window', q, { sky: 'day', weather: 'rain' })
    expect(rainWin.children.find((o) => o.name === 'weather')).toBeDefined()
    const snowWin = buildDenItem('weather-window', q, { sky: 'night', weather: 'snow' })
    expect(snowWin.children.filter((o) => (o as THREE.Points).isPoints).length).toBe(1)
    expect(buildDenItem('reading-lamp', q).children.filter((o) => (o as THREE.Sprite).isSprite).length).toBe(1)
    for (const h of HABITAT_IDS) {
      const c = drawCost(buildRoom(h, q), false)
      expect(c.calls, h).toBeLessThanOrEqual(6)
      expect(c.triangles, h).toBeLessThanOrEqual(3000)
    }
  })

  it(`the fullest den stays within ${BUDGET[q].calls} draw calls and ${BUDGET[q].triangles} triangles`, () => {
    const scene = new THREE.Group()
    // the costliest habitat
    const habitat = worst([...HABITAT_IDS], (h) => cost(buildRoom(h, q), q)).x
    scene.add(buildRoom(habitat, q))
    // on a phone a soft dark disc fakes the creature's shadow
    if (q === 'low') scene.add(new THREE.Mesh(new THREE.CircleGeometry(0.62, 32), new THREE.MeshBasicMaterial()))
    // the six spots, each with its costliest item (the window with weather on the wall)
    const placed: Record<string, string> = {}
    for (const slot of DEN_SLOTS) {
      const id = slot === 'wall' ? 'weather-window' : worst(ofSlot(slot), (id) => cost(buildDenItem(id, q, { sky: 'night', weather: 'snow' }), q)).x
      placed[slot] = id
      const g = buildDenItem(id, q, { sky: 'night', weather: 'snow' })
      g.position.set(...DEN_SPOTS[slot])
      scene.add(g)
    }
    scene.add(buildBowl(25, q))
    // the costliest creature as a shiny grown-up, wearing the costliest piece in each slot
    const species = worst([...SPECIES], (s) => cost(creatureFor(s.id, 'grown', true, q), q)).x
    const creature = creatureFor(species.id, 'grown', true, q)
    const worn = Object.fromEntries(OUTFIT_SLOTS.map((s) => [s, worst(outfitsOf(s), (id) => cost(outfitModel(id, q), q)).x]))
    expect(dressCreature(creature, worn, q).length).toBe(4)
    scene.add(creature)
    // the shiny sparkle: 8 sprites
    for (const _ of SPARKLE_SPOTS) scene.add(new THREE.Sprite())

    const total = drawCost(scene, shadows)
    console.info(
      `den ${q}: ${total.calls} draw calls, ${Math.round(total.triangles)} triangles (${habitat}, ${Object.values(placed).join(', ')}, ${species.id} shiny grown-up in ${Object.values(worn).join(', ')})`,
    )
    expect(total.calls).toBeLessThanOrEqual(BUDGET[q].calls)
    expect(total.triangles).toBeLessThanOrEqual(BUDGET[q].triangles)
  })

  /**
   * T-0046 / D-0040 §6: the current pet roams by moving the creature the den
   * already draws — its group's position and rotation — so the den costs exactly
   * what it cost before, wherever the pet happens to stand. Roaming may never add
   * an object; if this fails, something was drawn to make a pet move.
   */
  it('a roaming current pet costs nothing: the same creature, moved, anywhere in the den', () => {
    const creature = creatureFor('red-fox', 'grown', false, q)
    const onCushion = new THREE.Group()
    onCushion.add(creature)
    onCushion.position.set(0, seatYOf(undefined), 0)
    const before = cost(onCushion, q)
    // the pet gets up, walks to the far corner of its patch, turns and stands on the floor
    const spots: Array<[number, number, number]> = [
      [0.6, 0.01, 0.5],
      [-0.6, 0.01, -0.2],
      [0.3, 0.01, 0.3],
    ]
    for (const spot of spots) {
      onCushion.position.set(...spot)
      onCushion.rotation.y = Math.PI / 3
      expect(cost(onCushion, q)).toEqual(before)
      expect(onCushion.children.length).toBe(1)
    }
  })
})

describe('the six spots', () => {
  // the den's canvas: 390 Den view (334 × 300), 390 Shop view (334 × 180), 1280 (16:10)
  const aspects = { 'phone den 334×300': 334 / 300, 'phone shop 334×180': 334 / 180, 'computer 16:10': 16 / 10 }

  function onScreen(o: THREE.Object3D, cam: THREE.Camera) {
    o.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(o, true)
    let worstX = 0
    let worstY = 0
    for (const x of [box.min.x, box.max.x])
      for (const y of [box.min.y, box.max.y])
        for (const z of [box.min.z, box.max.z]) {
          const v = new THREE.Vector3(x, y, z).project(cam)
          worstX = Math.max(worstX, Math.abs(v.x))
          worstY = Math.max(worstY, Math.abs(v.y))
        }
    return { worstX, worstY }
  }

  for (const [name, aspect] of Object.entries(aspects)) {
    it(`shows every item of the bed, wall, corners and toy fully, at ${name}`, () => {
      const cam = denCamera(aspect)
      for (const slot of DEN_SLOTS.filter((s) => s !== 'rug')) {
        for (const id of ofSlot(slot)) {
          const g = buildDenItem(id, 'high', { sky: 'day', weather: 'rain' })
          // the glow sprite may spill over the edge; the lamp itself may not
          g.children.filter((c) => (c as THREE.Sprite).isSprite).forEach((c) => c.removeFromParent())
          g.position.set(...DEN_SPOTS[slot])
          const s = onScreen(g, cam)
          expect(s.worstX, `${id} x`).toBeLessThanOrEqual(1)
          expect(s.worstY, `${id} y`).toBeLessThanOrEqual(1)
        }
      }
      const bowl = buildBowl(25, 'high')
      expect(onScreen(bowl, cam).worstX).toBeLessThanOrEqual(1)
      expect(BOWL_SPOT[0]).toBeGreaterThan(0)
    })
  }

  it('keeps the corners beside the pet, the wall item above the floor and the toy low and in front', () => {
    expect(DEN_SPOTS.left[0]).toBeLessThan(0)
    expect(DEN_SPOTS.right[2]).toBeLessThan(-1)
    expect(DEN_SPOTS.toy[2]).toBeGreaterThan(0)
    // nothing in front of the pet's face: the toy is under 0.35 high
    const toy = new THREE.Box3().setFromObject(buildDenItem('slide', 'high'), true)
    expect(toy.max.y).toBeLessThan(0.35)
  })
})

describe('outfits on the anchors (Design §7)', () => {
  it('puts each piece inside its anchor (so it moves with the head or body), one per slot, and takes them off again', () => {
    const cat = creatureFor('cat', 'baby', false, 'low')
    const worn = { head: 'bobble-hat', face: 'star-glasses', neck: 'bell-collar', back: 'little-backpack' }
    const pieces = dressCreature(cat, worn, 'low')
    expect(pieces.map((m) => m.parent!.name)).toEqual(['hat', 'face', 'neck', 'back'])
    // the hat and glasses are in the head part, the collar and backpack in the body
    const partOf = (o: THREE.Object3D) => {
      let p = o.parent
      while (p && !p.name.startsWith('part:')) p = p.parent
      return p?.name
    }
    expect(pieces.map(partOf)).toEqual(['part:head', 'part:head', 'part:body', 'part:body'])
    // sized by the anchor: a hat 0.26–0.36 wide, the collar round the neck ring
    expect(pieces[0].scale.x).toBeGreaterThanOrEqual(0.26)
    expect(pieces[0].scale.x).toBeLessThanOrEqual(0.36)
    expect(pieces[2].scale.x).toBeCloseTo((cat.getObjectByName('neck')!.userData.size as number) * 1.45)
    // dressed again: the old pieces come off, no doubles
    dressCreature(cat, { head: 'little-crown' }, 'low')
    const left: string[] = []
    cat.traverse((o) => o.name.startsWith('outfit:') && left.push(o.name))
    expect(left).toEqual(['outfit:little-crown'])
    dressCreature(cat, {}, 'low')
    let any = false
    cat.traverse((o) => (any ||= o.name.startsWith('outfit:')))
    expect(any).toBe(false)
  })

  it('never dresses the cached creature itself: every den gets its own clone', () => {
    const a = creatureFor('koala', 'grown', false, 'low')
    dressCreature(a, { head: 'big-bow' }, 'low')
    const b = creatureFor('koala', 'grown', false, 'low')
    let dressed = false
    b.traverse((o) => (dressed ||= o.name.startsWith('outfit:')))
    expect(dressed).toBe(false)
  })
})

/**
 * The three UX re-review must-fixes (2026-11-23): the creature sits per bed, the rain scatter
 * stays inside the arched pane, and the seat covers every bed id the shop offers.
 */
describe('the seat height per bed (review 2026-11-23, closes F14)', () => {
  it('uses each bed\'s own top; no bed and an unknown id fall back to the default (gold cushion)', () => {
    expect(seatYOf(undefined)).toBe(DEFAULT_SEAT_Y)
    expect(seatYOf(null)).toBe(DEFAULT_SEAT_Y)
    expect(seatYOf('')).toBe(DEFAULT_SEAT_Y)
    expect(seatYOf('nope')).toBe(DEFAULT_SEAT_Y)
    expect(seatYOf('cloud-cushion')).toBe(0.22)
    expect(seatYOf('basket-bed')).toBe(0.14)
    // the default is the gold cushion's own height (0.18)
    expect(DEFAULT_SEAT_Y).toBe(0.18)
  })

  it('every shop bed has a seat (so the cloud-cushion case that opened this review can\'t come back for a new bed)', () => {
    for (const id of SHOP_ITEMS.filter((i) => i.slot === 'bed').map((i) => i.id)) {
      expect(BED_SEAT_Y[id], id).toBeTypeOf('number')
      // a seat under the gold cushion (0.18) would sink the pet again
      expect(BED_SEAT_Y[id], id).toBeGreaterThan(0)
    }
  })
})

describe('rain stays inside the arched pane (review 2026-11-23)', () => {
  it('every rain streak sits inside the arched window pane, not on the frame or the wall', () => {
    const win = buildDenItem('weather-window', 'high', { sky: 'day', weather: 'rain' })
    const weather = win.children.find((o) => o.name === 'weather')! as THREE.Mesh
    expect(weather).toBeDefined()
    const { archTop, archR } = weather.userData as { archTop: number; archR: number }
    // the window: the pane half-width is W * 0.48 (from buildWindow); W = 0.9
    const halfW = 0.9 * 0.48
    const bbox = new THREE.Box3().setFromObject(weather)
    // every streak within the rectangular body (|x| ≤ halfW, y ≤ archTop) or the arch above
    expect(bbox.min.x).toBeGreaterThanOrEqual(-halfW - 0.04)
    expect(bbox.max.x).toBeLessThanOrEqual(halfW + 0.04)
    expect(bbox.max.y).toBeLessThanOrEqual(archTop + archR + 0.04)
  })

  it('rain is one merged mesh (one draw call), so the budget is unchanged', () => {
    const win = buildDenItem('weather-window', 'high', { sky: 'day', weather: 'rain' })
    const weather = win.children.find((o) => o.name === 'weather')!
    expect((weather as THREE.Mesh).isMesh).toBe(true)
    expect(drawCost(weather, false).calls).toBe(1)
  })
})
