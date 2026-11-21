import { describe, expect, it } from 'vitest'
import { MATCH_DIM, MATCH_FORWARD, MATCH_GLOW, bookLight } from './BookMesh'

describe('search highlight strength (#184)', () => {
  it('pins the values from the design', () => {
    expect(MATCH_GLOW).toBe(0.6)
    expect(MATCH_DIM).toBe(0.82)
    expect(MATCH_FORWARD).toBe(0.06)
  })

  it('lights a book on the shelf normally when no search is on', () => {
    expect(bookLight(0, 0, 0)).toEqual({ emissive: 0, shade: 1 })
  })

  it('gives a match a glow of 0.6 at full brightness', () => {
    expect(bookLight(0, 1, 0)).toEqual({ emissive: 0.6, shade: 1 })
  })

  it('leaves a book that does not match at 18% brightness, without glow', () => {
    const { emissive, shade } = bookLight(0, 0, 1)
    expect(emissive).toBe(0)
    expect(shade).toBeCloseTo(0.18, 5)
  })

  it('lights a taken-out book evenly, without glow or dimming', () => {
    expect(bookLight(1, 0, 0)).toEqual({ emissive: 1, shade: 0 })
    expect(bookLight(1, 1, 0)).toEqual({ emissive: 1, shade: 0 })
    expect(bookLight(1, 0, 1)).toEqual({ emissive: 1, shade: 0 })
  })
})

describe('a book on the shelf on a phone is drawn in two parts (T-0003)', () => {
  it('has the paper sides first and the spine last, as two groups', async () => {
    const { shelfBlock } = await import('./BookMesh')
    const g = shelfBlock({ w: 0.13, h: 0.2, t: 0.03 })
    expect(g.groups).toEqual([
      { start: 0, count: 30, materialIndex: 0 },
      { start: 30, count: 6, materialIndex: 1 },
    ])
    // the last six indices are the spine side (-x): every corner at x = -w/2
    const pos = g.attributes.position
    const idx = Array.from(g.index!.array).slice(30)
    expect(idx.every((i) => Math.abs(pos.getX(i) + 0.065) < 1e-6)).toBe(true)
    expect(g.index!.count).toBe(36)
  })
})
