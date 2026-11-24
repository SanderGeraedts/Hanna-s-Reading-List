import { describe, expect, it } from 'vitest'
import { DEEP_GOLD, GOLD, contrastRatio, inkFor, spineColours } from './textures'

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

describe('inkFor keeps spine lettering readable (T-0019)', () => {
  it('reads at 3:1 or better on every colour of a sweep', () => {
    for (let r = 0; r < 256; r += 16)
      for (let g = 0; g < 256; g += 16)
        for (let b = 0; b < 256; b += 16) {
          const bg = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
          expect(contrastRatio(inkFor(bg), bg)).toBeGreaterThanOrEqual(3)
        }
  })

  it('keeps white lettering on dark spines and dark lettering on light ones', () => {
    expect(inkFor('#1d2a44')).toBe('#f6efe1')
    expect(inkFor('#7a2e2e')).toBe('#f6efe1')
    expect(inkFor('#f2e6c8')).toBe('#1d1a16')
  })

  it('switches to dark lettering on a bright middle colour where white would be hard to read', () => {
    // bright green: below the brightness threshold, but white reads under 3:1
    expect(contrastRatio('#f6efe1', '#30c030')).toBeLessThan(3)
    expect(inkFor('#30c030')).toBe('#1d1a16')
  })
})
