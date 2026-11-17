import { describe, expect, it } from 'vitest'
import { WIDTH, layoutTiles, shareFileName } from './shareImage'

describe('challenge picture (#153)', () => {
  it('lays tiles out in rows inside the margins', () => {
    const { rects, height } = layoutTiles({ columns: 6, aspect: 1.5, count: 26 })
    expect(rects).toHaveLength(26)
    // 26 letters in 6 columns: 5 rows, the last one with 2 tiles
    expect(new Set(rects.map((r) => r.y)).size).toBe(5)
    expect(rects[6].x).toBe(rects[0].x)
    expect(rects[6].y).toBeGreaterThan(rects[0].y + rects[0].h)
    const right = Math.max(...rects.map((r) => r.x + r.w))
    expect(right).toBeCloseTo(WIDTH - rects[0].x)
    const bottom = Math.max(...rects.map((r) => r.y + r.h))
    expect(height).toBeGreaterThan(bottom)
    expect(rects.every((r) => r.h === r.w * 1.5)).toBe(true)
  })

  it('names the file after the challenge', () => {
    expect(shareFileName('A–Z challenge 2026')).toBe('a-z-challenge-2026.png')
    expect(shareFileName('Book bingo 2026 · card 2')).toBe('book-bingo-2026-card-2.png')
    expect(shareFileName('…')).toBe('challenge.png')
  })
})
