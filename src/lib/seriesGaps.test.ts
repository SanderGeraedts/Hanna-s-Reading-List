import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))

const { cleanSeriesBooks, missingNumbers, notOnShelf, seriesOnShelf } = await import('./seriesGaps')

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: ['Sarah J. Maas'],
  color: '#888888',
  status: 'want',
  addedAt: 0,
  ...extra,
})

describe('completing a series', () => {
  it('finds the gaps below the highest number', () => {
    expect(missingNumbers([1, 2, 4, 6])).toEqual([3, 5])
    expect(missingNumbers([1, 1.5, 2])).toEqual([])
    expect(missingNumbers([3])).toEqual([1, 2])
    expect(missingNumbers([])).toEqual([])
  })

  it('lists every series on the shelf, even with one book, gaps first', () => {
    const books = [
      book('a', { title: 'Throne of Glass', series: 'Throne of Glass', seriesIndex: 1 }),
      book('b', { title: 'Heir of Fire', series: 'Throne of Glass', seriesIndex: 3 }),
      book('c', { title: 'Fourth Wing', series: 'The Empyrean', seriesIndex: 1, authors: ['Rebecca Yarros'] }),
      book('d', { title: 'A standalone' }),
    ]
    const s = seriesOnShelf(books)
    expect(s.map((x) => x.name)).toEqual(['Throne of Glass', 'The Empyrean'])
    expect(s[0]).toMatchObject({ numbers: [1, 3], missing: [2], author: 'Sarah J. Maas' })
    expect(s[1]).toMatchObject({ numbers: [1], missing: [], author: 'Rebecca Yarros' })
  })

  it('offers only the books she does not have, by number or by title', () => {
    const books = [
      book('a', { title: 'Fourth Wing', series: 'The Empyrean', seriesIndex: 1 }),
      book('b', { title: 'Iron Flame (The Empyrean, #2)' }),
    ]
    const [s] = seriesOnShelf(books)
    const list = cleanSeriesBooks([
      { number: 1, title: 'Fourth Wing', year: 2023, releaseDate: '' },
      { number: 2, title: 'Iron Flame', year: 2023, releaseDate: '' },
      { number: 3, title: 'Onyx Storm', year: 2025, releaseDate: '' },
      { number: 4, title: 'Book Four', year: 2027, releaseDate: '2027-05-01' },
      { title: '', number: 5 },
    ])
    expect(notOnShelf(list, s, books)).toEqual([
      { number: 3, title: 'Onyx Storm', year: 2025 },
      { number: 4, title: 'Book Four', year: 2027, releaseDate: '2027-05-01' },
    ])
  })
})
