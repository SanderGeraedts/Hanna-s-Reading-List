import { describe, expect, it } from 'vitest'
import {
  CURRENT_RANGE,
  GENTLE_MAX_SECS,
  GENTLE_RANGE,
  GENTLE_SHARE,
  GENTLE_WALK,
  WALK,
  gentleTarget,
  isHopper,
  pickCurrentRoam,
  pickRoam,
  roamRandom,
  roamTarget,
} from './denRoam'

const base = {
  petId: 'p1',
  session: 7,
  phone: false,
  reduce: false,
  current: false,
  toyFree: false,
  pairFree: false,
  mood: null,
  hour: 12,
}

describe('den roam state machine (T-0032 Design §4)', () => {
  it('deterministic: same input → same pick', () => {
    expect(pickRoam(base, 1)).toEqual(pickRoam(base, 1))
    expect(roamRandom('a', 1, 1)).toBe(roamRandom('a', 1, 1))
  })

  it('phone and reduce motion collapse to rest only', () => {
    expect(pickRoam({ ...base, phone: true }, 1).state).toBe('rest')
    expect(pickRoam({ ...base, reduce: true }, 1).state).toBe('rest')
  })

  it('missing-you mood: only rest or cushion, never roam', () => {
    for (let c = 1; c < 30; c++) {
      const s = pickRoam({ ...base, mood: 'missing' }, c).state
      expect(['rest', 'cushion']).toContain(s)
    }
  })

  it('sleepy current pet at night picks sleep', () => {
    expect(pickRoam({ ...base, current: true, mood: 'sleepy', hour: 23 }, 1).state).toBe('sleep')
    expect(pickRoam({ ...base, current: true, mood: 'sleepy', hour: 2 }, 1).state).toBe('sleep')
  })

  it('happy mood extends the cushion time', () => {
    const neutral = pickRoam({ ...base, current: true, mood: null }, 1)
    const happy = pickRoam({ ...base, current: true, mood: 'happy' }, 1)
    if (neutral.state === 'cushion' && happy.state === 'cushion') {
      expect(happy.secs).toBeGreaterThan(neutral.secs)
    }
  })

  it('a free toy sometimes picks toy; a locked toy never does', () => {
    let hadToy = false
    for (let c = 1; c < 80; c++) if (pickRoam({ ...base, toyFree: true }, c).state === 'toy') hadToy = true
    expect(hadToy).toBe(true)
    for (let c = 1; c < 80; c++) expect(pickRoam({ ...base, toyFree: false }, c).state).not.toBe('toy')
  })

  it('pair-free gives a pair state sometimes', () => {
    let hadPair = false
    for (let c = 1; c < 80; c++) if (pickRoam({ ...base, pairFree: true }, c).state === 'pair') hadPair = true
    expect(hadPair).toBe(true)
  })

  it('roam target stays within the walkable rectangle', () => {
    for (let c = 1; c < 40; c++) {
      const { x, z } = roamTarget('p', 1, c)
      expect(x).toBeGreaterThanOrEqual(-1.0 - 1e-6)
      expect(x).toBeLessThanOrEqual(1.0 + 1e-6)
      expect(z).toBeGreaterThanOrEqual(-0.5)
      expect(z).toBeLessThanOrEqual(0.91)
    }
  })

  it('roam target keeps to the rectangle it is given', () => {
    for (let c = 1; c < 60; c++) {
      const { x, z } = roamTarget('p', 1, c, CURRENT_RANGE)
      expect(Math.abs(x)).toBeLessThanOrEqual(CURRENT_RANGE.x + 1e-6)
      expect(z).toBeGreaterThanOrEqual(CURRENT_RANGE.zMin - 1e-6)
      expect(z).toBeLessThanOrEqual(CURRENT_RANGE.zMax + 1e-6)
    }
  })

  it('hoppers include the penguins, hedgehog and axolotl', () => {
    for (const s of ['adelie-penguin', 'emperor-penguin', 'african-penguin', 'hedgehog', 'axolotl']) {
      expect(isHopper(s)).toBe(true)
    }
    expect(isHopper('cat')).toBe(false)
  })
})

/**
 * The current pet's own clock (T-0046 Design §2, D-0040): it roams too now —
 * freely on a computer, a short slow wander now and then on a phone, and never
 * with reduce motion.
 */
describe('the current pet roams too (T-0046, D-0040)', () => {
  const cur = { ...base, current: true }
  const share = (input: typeof cur, n = 400) => {
    let roams = 0
    for (let c = 1; c <= n; c++) if (pickCurrentRoam(input, c).state === 'roam') roams++
    return roams / n
  }
  /** the share of its *time* the pet spends walking about */
  const walking = (input: typeof cur, n = 400) => {
    let roam = 0
    let all = 0
    for (let c = 1; c <= n; c++) {
      const p = pickCurrentRoam(input, c)
      all += p.secs
      if (p.state === 'roam') roam += p.secs
    }
    return roam / all
  }

  it('is deterministic: the same input gives the same pick', () => {
    expect(pickCurrentRoam(cur, 3)).toEqual(pickCurrentRoam(cur, 3))
  })

  it('reduce motion: the cushion, always — on every size, mood and hour', () => {
    for (const phone of [false, true]) {
      for (const mood of [null, 'happy', 'sleepy', 'missing', 'back'] as const) {
        for (const hour of [0, 5, 12, 22, 23]) {
          for (let c = 1; c < 20; c++) {
            expect(pickCurrentRoam({ ...cur, reduce: true, phone, mood, hour }, c).state).toBe('cushion')
          }
        }
      }
    }
  })

  it('on a computer it roams, like her other pets', () => {
    expect(share({ ...cur, phone: false })).toBeGreaterThan(0.2)
  })

  it('on a phone it roams, but rarely and briefly — clearly lighter than the computer', () => {
    const onPhone = share({ ...cur, phone: true })
    expect(onPhone).toBeGreaterThan(0) // it does wander: that is the whole point of T-0046
    expect(onPhone).toBeLessThanOrEqual(GENTLE_SHARE + 0.05)
    // it spends less than half the time on its feet that the computer's pet does
    const phoneTime = walking({ ...cur, phone: true })
    const computerTime = walking({ ...cur, phone: false })
    console.info(`walking: phone ${(phoneTime * 100).toFixed(1)} %, computer ${(computerTime * 100).toFixed(1)} % of the time`)
    expect(phoneTime).toBeLessThan(computerTime / 2)
    for (let c = 1; c <= 400; c++) {
      const p = pickCurrentRoam({ ...cur, phone: true }, c)
      if (p.state === 'roam') expect(p.secs).toBeLessThanOrEqual(GENTLE_MAX_SECS)
      else expect(p.secs).toBeGreaterThanOrEqual(6) // long rests between the strolls
    }
    expect(GENTLE_WALK).toBeLessThan(WALK / 2)
  })

  it('never takes a toy or a pair: those stay with the other pets', () => {
    for (const phone of [false, true]) {
      for (let c = 1; c <= 200; c++) {
        expect(['toy', 'pair']).not.toContain(pickCurrentRoam({ ...cur, phone, toyFree: true, pairFree: true }, c).state)
      }
    }
  })

  it('missing-you never wanders off; sleepy sleeps at night and not by day', () => {
    for (const phone of [false, true]) {
      for (let c = 1; c <= 200; c++) {
        expect(['rest', 'cushion']).toContain(pickCurrentRoam({ ...cur, phone, mood: 'missing' }, c).state)
      }
      for (const hour of [22, 23, 0, 5]) {
        expect(pickCurrentRoam({ ...cur, phone, mood: 'sleepy', hour }, 1).state).toBe('sleep')
      }
      expect(pickCurrentRoam({ ...cur, phone, mood: 'sleepy', hour: 12 }, 1).state).not.toBe('sleep')
    }
  })

  it('the phone stroll stays in its small patch around the cushion', () => {
    for (let c = 1; c <= 200; c++) {
      const { x, z } = gentleTarget('p1', 7, c)
      expect(Math.abs(x)).toBeLessThanOrEqual(GENTLE_RANGE.x + 1e-6)
      expect(z).toBeGreaterThanOrEqual(GENTLE_RANGE.zMin - 1e-6)
      expect(z).toBeLessThanOrEqual(GENTLE_RANGE.zMax + 1e-6)
    }
  })
})
