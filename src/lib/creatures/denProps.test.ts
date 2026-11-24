import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { DEN_SLOTS, SHOP_ITEMS } from './shop'
import type { DenSlot } from './shop'
import { CURRENT_RANGE, GENTLE_RANGE, GENTLE_WALK, ROAM_RANGE, WALK, gentleTarget, pickCurrentRoam, roamTarget } from './denRoam'
import type { RoamRange } from './denRoam'
import {
  BOWL_RADIUS,
  FLOOR_Y,
  GOLD_CUSHION_RADIUS,
  PROP_RADIUS,
  bedRadiusOf,
  bedTopAt,
  clearTarget,
  clearanceFor,
  denFootprints,
  insideAny,
  offBed,
  pushOutOf,
  stepAround,
} from './denProps'
import type { Footprint } from './denProps'
import { BOWL_SPOT, DEN_FILL, DEN_SPOTS, DEN_VIEW_H, buildBowl, buildDenItem, buildDefaultBed, denCamera, seatYOf } from '#/components/creatures/shopModels'

/**
 * T-0050 / D-0043: a roaming pet walks around every prop in the den and *on* its
 * own bed. Hanna, 2026-11-23: "When the fox is walking through the pillow his
 * feet vanish." These are the pure helpers behind the fix.
 */

/** The current pet (a grown-up) and her small roaming pets, in world units. */
const BIG = DEN_FILL.grown * DEN_VIEW_H
const SMALL = 0.3
const bigClear = clearanceFor(BIG)
const smallClear = clearanceFor(SMALL)

/** The fullest den: a bed, a toy and both corners filled with the widest item of each. */
const FULL: Partial<Record<DenSlot, string>> = { bed: 'basket-bed', rug: 'star-rug', wall: 'weather-window', toy: 'yarn', left: 'mini-bookcase', right: 'reading-lamp' }

/** Every model's own reach on the floor, measured from the geometry the den draws. */
function measuredRadius(g: THREE.Object3D) {
  g.updateMatrixWorld(true)
  const b = new THREE.Box3().setFromObject(g, true)
  return Math.max(Math.abs(b.min.x), Math.abs(b.max.x), Math.abs(b.min.z), Math.abs(b.max.z))
}

describe('the den\'s footprints (D-0043 §1)', () => {
  it('matches every prop\'s own model: no radius is too small, and none is padded out of recognition', () => {
    for (const i of SHOP_ITEMS.filter((x) => x.category === 'home' || x.category === 'toys')) {
      const slot = i.slot as DenSlot
      // flat on the floor or up on the wall: nothing to walk into
      if (slot === 'rug' || slot === 'wall') {
        expect(PROP_RADIUS[i.id], `${i.id} should have no footprint`).toBeUndefined()
        continue
      }
      const measured = measuredRadius(buildDenItem(i.id, 'high', { sky: 'day', weather: 'rain' }))
      const r = PROP_RADIUS[i.id]
      expect(r, `${i.id} is missing from PROP_RADIUS`).toBeTypeOf('number')
      expect(r, `${i.id} footprint is smaller than the model`).toBeGreaterThanOrEqual(measured - 1e-6)
      expect(r, `${i.id} footprint is far wider than the model`).toBeLessThanOrEqual(measured + 0.05)
    }
    // the den's own gold cushion and the food bowl, which are always there
    expect(GOLD_CUSHION_RADIUS).toBeGreaterThanOrEqual(measuredRadius(buildDefaultBed('high')) - 1e-6)
    const bowl = buildBowl(25, 'high')
    bowl.updateMatrixWorld(true)
    const bb = new THREE.Box3().setFromObject(bowl, true)
    const bowlReach = Math.max(Math.abs(bb.min.x - BOWL_SPOT[0]), Math.abs(bb.max.x - BOWL_SPOT[0]), Math.abs(bb.min.z - BOWL_SPOT[2]), Math.abs(bb.max.z - BOWL_SPOT[2]))
    expect(BOWL_RADIUS).toBeGreaterThanOrEqual(bowlReach - 1e-6)
    expect(BOWL_RADIUS).toBeLessThanOrEqual(bowlReach + 0.05)
  })

  it('every bed the shop sells has a footprint, and an unknown bed falls back to the gold cushion', () => {
    for (const id of SHOP_ITEMS.filter((i) => i.slot === 'bed').map((i) => i.id)) expect(PROP_RADIUS[id], id).toBeTypeOf('number')
    expect(bedRadiusOf(undefined)).toBe(GOLD_CUSHION_RADIUS)
    expect(bedRadiusOf(null)).toBe(GOLD_CUSHION_RADIUS)
    expect(bedRadiusOf('nope')).toBe(GOLD_CUSHION_RADIUS)
    expect(bedRadiusOf('basket-bed')).toBe(PROP_RADIUS['basket-bed'])
  })

  it('puts each footprint at the spot the den draws it, and gives the rug and the wall none', () => {
    const empty = denFootprints({})
    // the bowl is always there; nothing else is placed
    expect(empty.hard).toEqual([{ x: BOWL_SPOT[0], z: BOWL_SPOT[2], r: BOWL_RADIUS }])
    expect(empty.bed).toEqual({ x: DEN_SPOTS.bed[0], z: DEN_SPOTS.bed[2], r: GOLD_CUSHION_RADIUS, seat: seatYOf(undefined) })

    const full = denFootprints(FULL)
    expect(full.bed).toEqual({ x: 0, z: 0, r: PROP_RADIUS['basket-bed'], seat: seatYOf('basket-bed') })
    for (const slot of ['toy', 'left', 'right'] as const) {
      const f = full.hard.find((p) => p.x === DEN_SPOTS[slot][0] && p.z === DEN_SPOTS[slot][2])
      expect(f, slot).toBeDefined()
      expect(f!.r).toBe(PROP_RADIUS[FULL[slot]!])
    }
    // the star rug and the window add nothing to walk into
    expect(full.hard.length).toBe(4)
    expect(DEN_SLOTS.length).toBe(6)
  })

  it('keeps a fifth of the pet\'s height clear, so the current pet keeps much more clear than her small pets', () => {
    expect(bigClear).toBeCloseTo(0.2, 6)
    expect(smallClear).toBeCloseTo(0.06, 6)
    expect(bigClear).toBeGreaterThan(smallClear * 3)
  })
})

describe('standing on the bed, not in it (D-0043 §3)', () => {
  const beds = [undefined, 'cloud-cushion', 'basket-bed'] as const

  it('seats the pet at seatYOf(bed) on the middle of every bed, and puts it on the floor past the rim', () => {
    for (const bed of beds) {
      const seat = seatYOf(bed)
      const r = bedRadiusOf(bed)
      expect(bedTopAt(0, seat, r), `${bed} middle`).toBe(seat)
      expect(bedTopAt(r * 0.3, seat, r), `${bed} inner`).toBe(seat)
      expect(bedTopAt(r, seat, r), `${bed} rim`).toBe(FLOOR_Y)
      expect(bedTopAt(r + 1, seat, r), `${bed} away`).toBe(FLOOR_Y)
    }
  })

  it('never dips below the floor or above the seat, and falls smoothly all the way down the slope', () => {
    for (const bed of beds) {
      const seat = seatYOf(bed)
      const r = bedRadiusOf(bed)
      let last = seat
      for (let d = 0; d <= r + 0.3; d += 0.005) {
        const y = bedTopAt(d, seat, r)
        expect(y, `${bed} at ${d}`).toBeGreaterThanOrEqual(FLOOR_Y - 1e-9)
        expect(y, `${bed} at ${d}`).toBeLessThanOrEqual(seat + 1e-9)
        // monotone down, and never a step: a 0.005 move changes the height by well under a tenth
        expect(y).toBeLessThanOrEqual(last + 1e-9)
        expect(Math.abs(y - last), `${bed} jumps at ${d}`).toBeLessThan(0.01)
        last = y
      }
      expect(last).toBe(FLOOR_Y)
    }
  })

  it('a pet on the cushion\'s rim stands higher than the floor but lower than the seat, so it reads as a slope', () => {
    const seat = seatYOf(undefined)
    const r = GOLD_CUSHION_RADIUS
    const mid = bedTopAt(r * 0.7, seat, r)
    expect(mid).toBeGreaterThan(FLOOR_Y)
    expect(mid).toBeLessThan(seat)
  })
})

describe('a target a pet can stand on (D-0043 §2, §5)', () => {
  const dens: Array<[string, Partial<Record<DenSlot, string>>]> = [
    ['an empty den', {}],
    ['a full den', FULL],
    ['a cloud cushion and a slide', { bed: 'cloud-cushion', toy: 'slide' }],
  ]

  for (const [name, placed] of dens) {
    for (const [who, range, clear, seed] of [
      ['the computer', CURRENT_RANGE, bigClear, 'current'],
      ['the phone', GENTLE_RANGE, bigClear, 'gentle'],
      ['her other pets', ROAM_RANGE, smallClear, 'other'],
    ] as Array<[string, RoamRange, number, string]>) {
      it(`${who} in ${name}: no seeded target ever lands inside a prop`, () => {
        const f = denFootprints(placed)
        const hard = who === 'her other pets' ? [...f.hard, { x: f.bed.x, z: f.bed.z, r: f.bed.r }] : f.hard
        for (let c = 1; c < 300; c++) {
          const seeded = seed === 'gentle' ? gentleTarget('p', 3, c) : roamTarget('p', 3, c, range)
          const t = clearTarget(seeded.x, seeded.z, hard, clear, range)
          expect(insideAny(t.x, t.z, hard, clear), `${c}: (${t.x.toFixed(2)}, ${t.z.toFixed(2)})`).toBeNull()
          expect(Math.abs(t.x)).toBeLessThanOrEqual(range.x + 1e-6)
          expect(t.z).toBeGreaterThanOrEqual(range.zMin - 1e-6)
          expect(t.z).toBeLessThanOrEqual(range.zMax + 1e-6)
        }
      })
    }
  }

  it('pushes a wander off the bed when there is floor in the patch to push it to (the computer)', () => {
    const f = denFootprints({})
    const need = f.bed.r + bigClear
    for (let c = 1; c < 200; c++) {
      const seeded = roamTarget('p', 5, c, CURRENT_RANGE)
      const off = offBed(seeded.x, seeded.z, f.bed, bigClear, f.hard, CURRENT_RANGE)
      expect(Math.hypot(off.x - f.bed.x, off.z - f.bed.z), `${c}`).toBeGreaterThanOrEqual(need - 1e-6)
      expect(Math.abs(off.x)).toBeLessThanOrEqual(CURRENT_RANGE.x + 1e-6)
    }
  })

  it('leaves a wander where it is when the patch has no floor left — the pet stands on the bed, never in it', () => {
    // the phone's patch is small on purpose (D-0040 §3), so some strolls end on the cushion's rim
    const f = denFootprints({})
    const t = offBed(0.1, 0.05, f.bed, bigClear, f.hard, GENTLE_RANGE)
    expect(Math.hypot(t.x, t.z)).toBeLessThan(f.bed.r + bigClear)
    // and standing there is standing on the cushion, above the floor
    expect(bedTopAt(Math.hypot(t.x, t.z), f.bed.seat, f.bed.r)).toBeGreaterThan(FLOOR_Y)
  })

  it('frees a pet a new prop was placed on top of, at walking speed and never in a jump', () => {
    const f = denFootprints({ toy: 'ball' })
    const ball = f.hard.find((p) => p.r === PROP_RADIUS.ball)!
    let x = ball.x
    let z = ball.z
    const step = WALK * (1 / 60)
    let frames = 0
    // dead centre of the ball to clear ground is 0.34 at 0.18 u/s: about two seconds of walking
    while (insideAny(x, z, f.hard, bigClear) && frames < 150) {
      const before = { x, z }
      const out = pushOutOf(x, z, f.hard, bigClear, step)
      x = out.x
      z = out.z
      expect(Math.hypot(x - before.x, z - before.z)).toBeLessThanOrEqual(step + 1e-9)
      frames++
    }
    expect(insideAny(x, z, f.hard, bigClear)).toBeNull()
    expect(frames).toBeLessThanOrEqual(150)
  })
})

describe('a walk that never enters a prop (D-0043 §2)', () => {
  function walk(from: { x: number; z: number }, to: { x: number; z: number }, props: readonly Footprint[], clear: number, speed: number) {
    let at = { ...from }
    const step = speed * (1 / 60)
    const seen: Array<{ x: number; z: number }> = []
    for (let i = 0; i < 1200; i++) {
      at = stepAround(at, to, step, props, clear)
      seen.push(at)
      if (Math.hypot(to.x - at.x, to.z - at.z) <= 0.02) break
    }
    return { at, seen }
  }

  const corners = (r: RoamRange) => [
    { x: -r.x, z: r.zMin },
    { x: r.x, z: r.zMin },
    { x: -r.x, z: r.zMax },
    { x: r.x, z: r.zMax },
    { x: 0, z: r.zMin },
    { x: 0, z: r.zMax },
  ]

  it('the current pet: corner to corner across a full den, on the computer, never steps into a prop', () => {
    const f = denFootprints(FULL)
    for (const a of corners(CURRENT_RANGE)) {
      for (const b of corners(CURRENT_RANGE)) {
        if (a === b) continue
        const from = clearTarget(a.x, a.z, f.hard, bigClear, CURRENT_RANGE)
        const to = clearTarget(b.x, b.z, f.hard, bigClear, CURRENT_RANGE)
        const { seen } = walk(from, to, f.hard, bigClear, WALK)
        for (const p of seen) expect(insideAny(p.x, p.z, f.hard, bigClear), `(${p.x.toFixed(2)}, ${p.z.toFixed(2)})`).toBeNull()
      }
    }
  })

  it('the phone\'s gentle stroll never steps into a prop either', () => {
    const f = denFootprints(FULL)
    for (const b of corners(GENTLE_RANGE)) {
      const to = clearTarget(b.x, b.z, f.hard, bigClear, GENTLE_RANGE)
      const { seen } = walk({ x: 0, z: 0 }, to, f.hard, bigClear, GENTLE_WALK)
      for (const p of seen) expect(insideAny(p.x, p.z, f.hard, bigClear)).toBeNull()
    }
  })

  it('her small pets never step into a prop, the bed included', () => {
    const f = denFootprints(FULL)
    const hard = [...f.hard, { x: f.bed.x, z: f.bed.z, r: f.bed.r }]
    for (const a of corners(ROAM_RANGE)) {
      for (const b of corners(ROAM_RANGE)) {
        if (a === b) continue
        const from = clearTarget(a.x, a.z, hard, smallClear, ROAM_RANGE)
        const to = clearTarget(b.x, b.z, hard, smallClear, ROAM_RANGE)
        const { seen } = walk(from, to, hard, smallClear, WALK)
        for (const p of seen) expect(insideAny(p.x, p.z, hard, smallClear)).toBeNull()
      }
    }
  })

  it('walks on, not in circles: a walk past a prop still arrives, and each step is at most one step long', () => {
    const f = denFootprints({ toy: 'ball' })
    // straight through the ball's middle, from one side to the other
    const ball = f.hard.find((p) => p.r === PROP_RADIUS.ball)!
    const from = { x: ball.x - 0.6, z: ball.z }
    const to = { x: ball.x + 0.6, z: ball.z }
    const step = WALK / 60
    let at = from
    let steps = 0
    while (Math.hypot(to.x - at.x, to.z - at.z) > 0.02 && steps < 2000) {
      const next = stepAround(at, to, step, f.hard, bigClear)
      expect(Math.hypot(next.x - at.x, next.z - at.z)).toBeLessThanOrEqual(step * 1.5 + 1e-9)
      at = next
      steps++
    }
    expect(Math.hypot(to.x - at.x, to.z - at.z)).toBeLessThanOrEqual(0.02)
    // 1.2 units at 0.18 u/s is about 400 frames; going round the ball may not take twice that
    expect(steps).toBeLessThan(800)
  })

  it('a step with nothing in the way is a straight step at full speed', () => {
    const step = WALK / 60
    const next = stepAround({ x: -0.8, z: 0.2 }, { x: 0.8, z: 0.2 }, step, [], bigClear)
    expect(next.x).toBeCloseTo(-0.8 + step, 9)
    expect(next.z).toBeCloseTo(0.2, 9)
  })
})

/**
 * The whole thing, for every bed: the current pet's own state machine driving the
 * same helpers `<Creature>` drives, for 2,000 frames. It is the check behind
 * Hanna's report — at no frame may the pet's feet be inside a prop, and at every
 * frame it must be standing on something.
 */
describe('a full den, every bed: the pet\'s feet are never inside a prop', () => {
  for (const bed of [undefined, 'cloud-cushion', 'basket-bed'] as const) {
    for (const phone of [false, true]) {
      it(`${bed ?? 'the gold cushion'}, on ${phone ? 'the phone' : 'the computer'}`, () => {
        const placed: Partial<Record<DenSlot, string>> = { ...FULL, bed }
        if (!bed) delete placed.bed
        const f = denFootprints(placed)
        const range = phone ? GENTLE_RANGE : CURRENT_RANGE
        const speed = phone ? GENTLE_WALK : WALK
        const step = speed / 60
        let roamed = false
        let onFloor = false
        let furthest = 0
        // four dens (four session seeds), 100 s each: the walk is seeded, so one den is one story
        for (let session = 1; session <= 4; session++) {
          let at = { x: 0, z: 0 }
          let state = { until: 0, target: { x: 0, z: 0 }, counter: 0 }
          for (let frame = 0; frame < 6000; frame++) {
            const t = frame / 60
            if (t > state.until) {
              const counter = state.counter + 1
              const pick = pickCurrentRoam({ petId: 'fox', session, phone, reduce: false, current: true, toyFree: false, pairFree: false, mood: null, hour: 14 }, counter)
              let go: { x: number; z: number }
              if (pick.state === 'roam') {
                const seeded = phone ? gentleTarget('fox', session, counter) : roamTarget('fox', session, counter, range)
                const off = offBed(seeded.x, seeded.z, f.bed, bigClear, f.hard, range)
                go = clearTarget(off.x, off.z, f.hard, bigClear, range)
                roamed = true
              } else if (pick.state === 'rest') go = { ...at }
              else go = { x: f.bed.x, z: f.bed.z }
              state = { until: t + pick.secs, target: go, counter }
            }
            if (insideAny(at.x, at.z, f.hard, bigClear)) at = pushOutOf(at.x, at.z, f.hard, bigClear, step)
            const d = Math.hypot(state.target.x - at.x, state.target.z - at.z)
            if (d > 0.02) at = stepAround(at, state.target, Math.min(d, step), f.hard, bigClear)
            // its feet are never inside a prop …
            expect(insideAny(at.x, at.z, f.hard, bigClear), `session ${session} frame ${frame} at (${at.x.toFixed(2)}, ${at.z.toFixed(2)})`).toBeNull()
            // … and it always stands on something: the floor, or the top of its bed
            const fromBed = Math.hypot(at.x - f.bed.x, at.z - f.bed.z)
            furthest = Math.max(furthest, fromBed)
            const y = bedTopAt(fromBed, f.bed.seat, f.bed.r)
            expect(y, `session ${session} frame ${frame}`).toBeGreaterThanOrEqual(FLOOR_Y - 1e-9)
            if (y <= FLOOR_Y + 1e-9) onFloor = true
            // and it stays in its patch (the stroll may end on the bed, never out of frame)
            expect(Math.abs(at.x)).toBeLessThanOrEqual(range.x + 1e-6)
          }
        }
        expect(roamed, 'the pet never picked a wander').toBe(true)
        if (!phone) {
          // on a computer it really does walk off its bed and stand on the rug
          expect(onFloor, `the pet never reached the floor (furthest ${furthest.toFixed(2)})`).toBe(true)
        } else {
          // on the phone the patch is small on purpose (D-0040 §3): a stroll gets it off the
          // bed's flat top and down the slope, which is what makes the stroll read, and never in
          expect(furthest, 'the phone pet never left the middle of its bed').toBeGreaterThan(f.bed.r * 0.35)
        }
      })
    }
  }

  it('sits on the middle of its bed at the seat height whenever it picks the cushion', () => {
    for (const bed of [undefined, 'cloud-cushion', 'basket-bed'] as const) {
      const f = denFootprints(bed ? { bed } : {})
      expect(bedTopAt(0, f.bed.seat, f.bed.r)).toBe(seatYOf(bed))
      expect(f.bed.seat).toBe(seatYOf(bed))
    }
  })
})

/** Added by the tester, 2026-11-23, from what was tried against the build. */
describe('gap tests (tester)', () => {
  it('is deterministic: the same den and the same counter give the same target and the same step, every time', () => {
    const f = denFootprints(FULL)
    for (let c = 1; c < 40; c++) {
      const seeded = roamTarget('fox', 9, c, CURRENT_RANGE)
      const a = clearTarget(seeded.x, seeded.z, f.hard, bigClear, CURRENT_RANGE)
      const b = clearTarget(seeded.x, seeded.z, f.hard, bigClear, CURRENT_RANGE)
      expect(a).toEqual(b)
      const s1 = stepAround({ x: 0, z: 0 }, a, WALK / 60, f.hard, bigClear)
      const s2 = stepAround({ x: 0, z: 0 }, a, WALK / 60, f.hard, bigClear)
      expect(s1).toEqual(s2)
    }
  })

  it('never jumps: no step in a den full of props is longer than two steps, anywhere in the patch', () => {
    const f = denFootprints(FULL)
    const step = WALK / 60
    for (let c = 1; c < 60; c++) {
      const to = clearTarget(roamTarget('fox', 4, c, CURRENT_RANGE).x, roamTarget('fox', 4, c, CURRENT_RANGE).z, f.hard, bigClear, CURRENT_RANGE)
      let at = { x: 0, z: 0 }
      for (let i = 0; i < 400; i++) {
        const next = stepAround(at, to, step, f.hard, bigClear)
        expect(Math.hypot(next.x - at.x, next.z - at.z), `counter ${c} frame ${i}`).toBeLessThanOrEqual(step * 2 + 1e-9)
        at = next
        if (Math.hypot(to.x - at.x, to.z - at.z) <= 0.02) break
      }
    }
  })

  it('every one of her pets starts clear of the props, however many she has', () => {
    const f = denFootprints(FULL)
    const hard = [...f.hard, { x: f.bed.x, z: f.bed.z, r: f.bed.r }]
    for (let i = 0; i < 60; i++) {
      const seeded = roamTarget(`pet-${i}`, 7 + i, 0)
      const start = clearTarget(seeded.x, seeded.z, hard, smallClear, ROAM_RANGE)
      expect(insideAny(start.x, start.z, hard, smallClear), `pet-${i}`).toBeNull()
    }
  })

  it('an item with no footprint in the table is left out rather than becoming a circle of NaN', () => {
    const f = denFootprints({ toy: 'a-toy-from-the-future', left: 'potted-plant' })
    for (const p of f.hard) {
      expect(Number.isFinite(p.x) && Number.isFinite(p.z) && Number.isFinite(p.r), JSON.stringify(p)).toBe(true)
    }
    // the bowl and the plant, not a third circle for the unknown toy
    expect(f.hard.length).toBe(2)
  })

  it('reduce motion cannot move the pet: it picks the cushion, and the cushion is the seat height', () => {
    for (const phone of [false, true]) {
      for (let c = 1; c < 60; c++) {
        const pick = pickCurrentRoam({ petId: 'fox', session: 1, phone, reduce: true, current: true, toyFree: false, pairFree: false, mood: null, hour: 14 }, c)
        expect(pick.state).toBe('cushion')
      }
    }
    // and the cushion's own spot is the seat, so a still pet is exactly where it has always been
    const f = denFootprints({})
    expect(bedTopAt(0, f.bed.seat, f.bed.r)).toBe(seatYOf(undefined))
  })

  it('a clearance can never swallow a whole patch: there is always somewhere to stand', () => {
    for (const [range, clear] of [
      [CURRENT_RANGE, bigClear],
      [GENTLE_RANGE, bigClear],
      [ROAM_RANGE, smallClear],
    ] as Array<[RoamRange, number]>) {
      const f = denFootprints(FULL)
      const hard = clear === smallClear ? [...f.hard, { x: f.bed.x, z: f.bed.z, r: f.bed.r }] : f.hard
      let found = 0
      for (let x = -range.x; x <= range.x; x += 0.05)
        for (let z = range.zMin; z <= range.zMax; z += 0.05) if (!insideAny(x, z, hard, clear)) found++
      expect(found, 'nowhere at all to stand in this patch').toBeGreaterThan(20)
    }
  })

  it('the bowl is avoided where the bowl actually is — the bug that hid in roamTarget for two tasks', () => {
    const f = denFootprints({})
    const bowl = f.hard[0]
    expect(bowl.x).toBe(BOWL_SPOT[0])
    expect(bowl.z).toBe(BOWL_SPOT[2])
    // T-0032's circle sat at (0.55, 0.15) with r 0.12: a patch of empty rug
    expect(insideAny(0.55, 0.15, f.hard, 0)).toBeNull()
    // while the bowl's real spot is kept clear
    expect(insideAny(BOWL_SPOT[0], BOWL_SPOT[2], f.hard, 0)).not.toBeNull()
  })
})

describe('the walk patches stay in frame (D-0043 consequences)', () => {
  // the den's canvas: the phone's Den view (334 × 300) and a computer at 16:10
  const aspects = { 'the phone (334×300)': 334 / 300, 'a computer (16:10)': 16 / 10 }
  /**
   * A grown pet's silhouette as rings: its feet, its widest point about a third up,
   * its shoulders and the top of its head, from the measured bodies of all twenty
   * species. A box round the whole creature would be far wider than any of them.
   */
  const RINGS = [
    { y: FLOOR_Y, r: 0.15 },
    { y: 0.3 * BIG, r: 0.38 },
    { y: 0.6 * BIG, r: 0.3 },
    { y: BIG, r: 0.12 },
  ]

  for (const [name, aspect] of Object.entries(aspects)) {
    const range = aspect < 1.5 ? GENTLE_RANGE : CURRENT_RANGE
    it(`shows the whole pet anywhere in its patch, on ${name}`, () => {
      const cam = denCamera(aspect)
      for (const x of [-range.x, -range.x / 2, 0, range.x / 2, range.x]) {
        for (const z of [range.zMin, 0, range.zMax]) {
          for (const ring of RINGS) {
            for (let a = 0; a < 16; a++) {
              const an = (a / 16) * Math.PI * 2
              const v = new THREE.Vector3(x + Math.cos(an) * ring.r, ring.y, z + Math.sin(an) * ring.r).project(cam)
              expect(Math.abs(v.x), `x at (${x}, ${z}) ring ${ring.y}`).toBeLessThanOrEqual(1)
              expect(Math.abs(v.y), `y at (${x}, ${z}) ring ${ring.y}`).toBeLessThanOrEqual(1)
            }
          }
        }
      }
    })
  }

  it('the phone\'s patch is the smaller one, and both leave room round the bed', () => {
    expect(GENTLE_RANGE.x).toBeLessThan(CURRENT_RANGE.x)
    // a stroll must be able to reach the cushion's rim: the patch goes past the bed's middle third
    const bed = denFootprints({}).bed
    expect(GENTLE_RANGE.x).toBeGreaterThan(bed.r * 0.35)
    // the computer's patch has real floor outside the widest bed on at least one side
    expect(CURRENT_RANGE.x).toBeGreaterThan(PROP_RADIUS['basket-bed'] + bigClear - 0.05)
  })
})
