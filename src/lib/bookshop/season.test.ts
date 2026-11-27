import { describe, expect, it } from 'vitest'
import { shopDecorations } from './season'

describe('what the bookshop is dressed for (T-0123)', () => {
  it('Sinterklaas from mid-November to 5 December, Christmas all December', () => {
    expect(shopDecorations('2026-11-14')).toEqual([])
    expect(shopDecorations('2026-11-15')).toEqual(['sinterklaas'])
    expect(shopDecorations('2026-12-03')).toEqual(['sinterklaas', 'christmas'])
    expect(shopDecorations('2026-12-06')).toEqual(['christmas'])
    expect(shopDecorations('2026-12-31')).toEqual(['christmas'])
    expect(shopDecorations('2027-01-01')).toEqual([])
  })

  it('autumn and Halloween in October', () => {
    expect(shopDecorations('2026-10-01')).toEqual(['autumn'])
    expect(shopDecorations('2026-10-31')).toEqual(['autumn'])
    expect(shopDecorations('2026-09-30')).toEqual([])
  })

  it('her birthday, only when this device knows it', () => {
    expect(shopDecorations('2026-06-12', '06-12')).toEqual(['birthday'])
    expect(shopDecorations('2026-06-12', null)).toEqual([])
    expect(shopDecorations('2026-06-12', 'nonsense')).toEqual([])
    expect(shopDecorations('2026-12-24', '12-24')).toEqual(['birthday', 'christmas'])
  })
})
