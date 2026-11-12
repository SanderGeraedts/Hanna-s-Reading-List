import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))

const { missingNumbers, moreByAuthor, seriesOnShelf } = await import('./seriesGaps')

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

  it('offers the author’s other books she does not have, the series-looking ones first', () => {
    const books = [
      book('a', { title: 'A Court of Thorns and Roses', series: 'A Court of Thorns and Roses', seriesIndex: 1 }),
      book('b', { title: 'A Court of Mist and Fury', series: 'A Court of Thorns and Roses', seriesIndex: 2 }),
    ]
    const [s] = seriesOnShelf(books)
    const r = (title: string, year: number) => ({ workKey: `/works/${title}`, title, authors: ['Sarah J. Maas'], year, coverId: 1 })
    const out = moreByAuthor(
      [
        r('House of Earth and Blood', 2020),
        r('A Court of Silver Flames', 2021),
        r('A Court of Mist and Fury', 2016),
        r('Throne of Glass / Crown of Midnight / Heir of Fire', 2019),
        r('A Court of Frost and Starlight', 2018),
      ],
      s,
      books,
    )
    expect(out.map((x) => x.title)).toEqual([
      'A Court of Silver Flames',
      'A Court of Frost and Starlight',
      'House of Earth and Blood',
    ])
  })
})
