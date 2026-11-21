import { describe, expect, it } from 'vitest'
import { DEEP_GOLD, GOLD, spineColours } from './textures'

describe('spineColours (#180)', () => {
  it('letters a dark hardcover spine in off-white, not gold, with gold bands', () => {
    const { ink, bands } = spineColours('#1d2a44')
    expect(ink).toBe('#f6efe1')
    expect(ink).not.toBe(GOLD)
    expect(bands).toBe(GOLD)
  })

  it('letters a light spine in near-black, with deep-gold bands', () => {
    const { ink, bands } = spineColours('#f2e6c8')
    expect(ink).toBe('#1d1a16')
    expect(ink).not.toBe(DEEP_GOLD)
    expect(bands).toBe(DEEP_GOLD)
  })
})
