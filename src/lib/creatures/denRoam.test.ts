import { describe, expect, it } from 'vitest'
import { isHopper, pickRoam, roamRandom, roamTarget } from './denRoam'

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

  it('hoppers include the penguins, hedgehog and axolotl', () => {
    for (const s of ['adelie-penguin', 'emperor-penguin', 'african-penguin', 'hedgehog', 'axolotl']) {
      expect(isHopper(s)).toBe(true)
    }
    expect(isHopper('cat')).toBe(false)
  })
})
