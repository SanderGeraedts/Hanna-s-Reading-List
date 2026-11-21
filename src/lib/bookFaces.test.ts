import { describe, expect, it } from 'vitest'
import { coverSize, facesToPaint } from './bookFaces'

describe('only the cover faces that can be seen get painted (#181)', () => {
  it('a book on the shelf with a cover image paints neither the back nor the stand-in front', () => {
    expect(facesToPaint({ coverUrl: 'https://covers.example/1.jpg', coverFailed: false, takenOut: false })).toEqual({
      back: false,
      cover: false,
      fallback: false,
    })
  })

  it('paints the back and loads the cover image once the book is taken out', () => {
    const out = facesToPaint({ coverUrl: 'https://covers.example/1.jpg', coverFailed: false, takenOut: true })
    expect(out.back).toBe(true)
    expect(out.cover).toBe(true)
    expect(out.fallback).toBe(false)
  })

  it('a book without a cover image paints nothing on the shelf, the stand-in front once taken out', () => {
    expect(facesToPaint({ coverFailed: false, takenOut: false })).toEqual({ back: false, cover: false, fallback: false })
    expect(facesToPaint({ coverFailed: false, takenOut: true }).fallback).toBe(true)
    expect(facesToPaint({ coverUrl: 'https://covers.example/1.jpg', coverFailed: true, takenOut: true }).fallback).toBe(true)
  })

  it('keeps cover images at most 512 px on the long side, never enlarging them', () => {
    expect(coverSize(1400, 2100)).toEqual({ width: 341, height: 512 })
    expect(coverSize(3000, 3000)).toEqual({ width: 512, height: 512 })
    expect(coverSize(300, 450)).toEqual({ width: 300, height: 450 })
  })
})
