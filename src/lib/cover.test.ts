import { describe, expect, it } from 'vitest'
import { MIN_SWATCH_DISTANCE, analyzePixels, automaticColour, colorFromString } from './cover'

const N = 24 * 24

/** 24 × 24 RGBA pixels, filled row by row from `[colour, count]` runs */
function pixels(runs: [[number, number, number], number][]) {
  const data = new Uint8ClampedArray(N * 4)
  let p = 0
  for (const [[r, g, b], count] of runs) {
    for (let i = 0; i < count; i++, p++) {
      data[p * 4] = r
      data[p * 4 + 1] = g
      data[p * 4 + 2] = b
      data[p * 4 + 3] = 255
    }
  }
  expect(p).toBe(N)
  return data
}

function rgb(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function dist(a: string, b: string) {
  const [x, y] = [rgb(a), rgb(b)]
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2])
}

describe('analyzePixels (T-0019)', () => {
  it('gives the same automatic colour analyzeCover always gave (saturation-weighted average × 0.82)', () => {
    // half (200,100,50): sat 0.75, weight 0.7125; half grey (100,100,100): weight 0.15
    // r = (0.7125·200 + 0.15·100) / 0.8625 · 0.82 = 149.74 → 0x96
    // g = 100 · 0.82 = 82 → 0x52
    // b = (0.7125·50 + 0.15·100) / 0.8625 · 0.82 = 48.13 → 0x30
    const { color } = analyzePixels(
      pixels([
        [[200, 100, 50], N / 2],
        [[100, 100, 100], N / 2],
      ]),
    )
    expect(color).toBe('#965230')
  })

  it('puts the automatic colour first and gives 1 to 6 swatches', () => {
    const many = pixels(
      Array.from({ length: 8 }, (_, i) => [[(i * 97) % 256, (i * 53 + 40) % 256, (i * 151 + 90) % 256], N / 8]),
    )
    for (const data of [many, pixels([[[10, 120, 200], N]])]) {
      const { color, palette } = analyzePixels(data)
      expect(palette[0]).toBe(color)
      expect(palette.length).toBeGreaterThanOrEqual(1)
      expect(palette.length).toBeLessThanOrEqual(6)
    }
  })

  it('half red, a quarter blue and a quarter yellow give a red, a blue and a yellow swatch, each × 0.82', () => {
    const { palette } = analyzePixels(
      pixels([
        [[255, 0, 0], N / 2],
        [[0, 0, 255], N / 4],
        [[255, 255, 0], N / 4],
      ]),
    )
    expect(palette).toContain('#d10000')
    expect(palette).toContain('#0000d1')
    expect(palette).toContain('#d1d100')
    // red has the most weight, so it comes straight after the automatic colour
    expect(palette[1]).toBe('#d10000')
  })

  it('puts a saturated colour ahead of a grey of the same area', () => {
    // half red keeps the automatic colour away from both, so each gets its own swatch
    const { palette } = analyzePixels(
      pixels([
        [[255, 0, 0], N / 2],
        [[128, 128, 128], N / 4],
        [[30, 160, 60], N / 4],
      ]),
    )
    const green = palette.indexOf('#198331')
    const grey = palette.indexOf('#696969')
    expect(green).toBeGreaterThan(0)
    expect(grey).toBeGreaterThan(green)
  })

  it('never gives two swatches closer than the minimum distance; one colour gives one swatch', () => {
    const near = analyzePixels(
      pixels([
        [[120, 40, 40], N / 2],
        [[126, 44, 40], N / 4],
        [[20, 60, 160], N / 4],
      ]),
    )
    for (let i = 0; i < near.palette.length; i++)
      for (let j = i + 1; j < near.palette.length; j++)
        expect(dist(near.palette[i], near.palette[j])).toBeGreaterThanOrEqual(MIN_SWATCH_DISTANCE)
    expect(analyzePixels(pixels([[[10, 120, 200], N]])).palette).toHaveLength(1)
  })

  it('gives the same palette for the same pixels every time', () => {
    const data = pixels(
      Array.from({ length: 16 }, (_, i) => [[(i * 37) % 256, (i * 71) % 256, (i * 113) % 256], N / 16]),
    )
    const first = analyzePixels(data).palette
    for (let i = 0; i < 5; i++) expect(analyzePixels(data).palette).toEqual(first)
  })
})

describe('automaticColour (T-0019)', () => {
  const analysis = { color: '#7a2e2e', aspect: 0.66, palette: ['#7a2e2e'] }

  it('is the cover’s colour for a book with a cover', () => {
    expect(automaticColour({ title: 'Dune', coverUrl: '/api/cover/id/1?size=L' }, analysis)).toBe('#7a2e2e')
  })

  it('is the title’s colour for a book without a cover', () => {
    expect(automaticColour({ title: 'Dune' }, analysis)).toBe(colorFromString('Dune'))
    expect(automaticColour({ title: 'Dune' }, null)).toBe(colorFromString('Dune'))
  })

  it('is unknown for a cover that could not be analysed', () => {
    expect(automaticColour({ title: 'Dune', coverUrl: '/api/cover/id/1?size=L' }, null)).toBeNull()
  })
})
