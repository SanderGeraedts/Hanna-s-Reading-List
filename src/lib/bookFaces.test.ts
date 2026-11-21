import { describe, expect, it } from 'vitest'
import { facesToPaint } from './bookFaces'

describe('only the cover faces that can be seen get painted (#181)', () => {
  it('a book on the shelf with a cover image paints neither the back nor the stand-in front', () => {
    expect(facesToPaint({ coverUrl: 'https://covers.example/1.jpg', coverFailed: false, takenOut: false })).toEqual({
      back: false,
      fallback: false,
    })
  })

  it('paints the back once the book is taken out', () => {
    expect(facesToPaint({ coverUrl: 'https://covers.example/1.jpg', coverFailed: false, takenOut: true }).back).toBe(true)
  })

  it('paints the stand-in front for a book without a cover image, or when it failed to load', () => {
    expect(facesToPaint({ coverFailed: false, takenOut: false }).fallback).toBe(true)
    expect(facesToPaint({ coverUrl: 'https://covers.example/1.jpg', coverFailed: true, takenOut: false }).fallback).toBe(true)
  })
})
