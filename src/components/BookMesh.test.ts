import { describe, expect, it } from 'vitest'
import { MATCH_DIM, MATCH_FORWARD, MATCH_GLOW, bookLight } from './BookMesh'

describe('search highlight strength (#184)', () => {
  it('pins the values from the design', () => {
    expect(MATCH_GLOW).toBe(0.5)
    expect(MATCH_DIM).toBe(0.82)
    expect(MATCH_FORWARD).toBe(0.06)
  })

  it('lights a book on the shelf normally when no search is on', () => {
    expect(bookLight(0, 0, 0)).toEqual({ emissive: 0, shade: 1 })
  })

  it('gives a match a glow of 0.5 at full brightness', () => {
    expect(bookLight(0, 1, 0)).toEqual({ emissive: 0.5, shade: 1 })
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
