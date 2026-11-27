import { describe, expect, it } from 'vitest'
import { roamHeight } from './WalkingPets'
import { DEN_FILL, DEN_VIEW_H } from './shopModels'

/** T-0120: a roaming pet is as tall as its age, never one size for all. */
describe('roamHeight', () => {
  const onCushion = (s: 'baby' | 'young' | 'grown') => DEN_FILL[s] * DEN_VIEW_H

  it('grows with age, in the same steps as on the cushion', () => {
    expect(roamHeight('baby')).toBeLessThan(roamHeight('young'))
    expect(roamHeight('young')).toBeLessThan(roamHeight('grown'))
    expect(roamHeight('baby') / roamHeight('grown')).toBeCloseTo(onCushion('baby') / onCushion('grown'), 5)
  })

  it('never lets a baby on the cushion stand taller than a grown-up walking past', () => {
    expect(roamHeight('grown')).toBeGreaterThanOrEqual(onCushion('baby'))
  })

  it('stays a little smaller than the same age on the cushion, so the floor does not crowd', () => {
    for (const s of ['baby', 'young', 'grown'] as const) expect(roamHeight(s)).toBeLessThan(onCushion(s))
  })
})
