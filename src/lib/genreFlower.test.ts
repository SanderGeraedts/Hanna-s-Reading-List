import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import { genrePetals, petalLength } from './genreFlower'

const book = (id: string, day: string, genres?: string[]): Book => ({ id, title: id, authors: [], color: '#888888', status: 'read', addedAt: 0, readCount: 1, finished: [day], genres })

describe('the genre flower', () => {
  it('counts the genres of the books finished, per year or all time', () => {
    const books = [book('a', '2026-03-01', ['Fantasy', 'Romance']), book('b', '2026-05-01', ['Fantasy']), book('c', '2025-01-01', ['Horror']), book('d', '2026-06-01')]
    expect(genrePetals(books, 2026)).toEqual({
      books: 3,
      petals: [
        { genre: 'Fantasy', count: 2 },
        { genre: 'Romance', count: 1 },
      ],
    })
    expect(genrePetals(books, 'all').petals.map((p) => p.genre)).toEqual(['Fantasy', 'Horror', 'Romance'])
  })

  it('keeps at most 8 petals, the rest as Other', () => {
    const books = Array.from({ length: 10 }, (_, i) => book(`b${i}`, '2026-01-01', [`G${i}`]))
    const { petals } = genrePetals(books, 2026)
    expect(petals.length).toBe(8)
    expect(petals[7]).toEqual({ genre: 'Other', count: 3 })
  })

  it('makes small genres still visible as a petal', () => {
    expect(petalLength(10, 10)).toBe(1)
    expect(petalLength(1, 100)).toBe(0.35)
  })
})
