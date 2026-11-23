import { describe, expect, it } from 'vitest'
import type { Book } from '../library'
import { deriveGarden } from './garden'
import { findPlants } from './find'

/** Finding a book's plant across every reading year (T-0066). */

const book = (id: string, title: string, day: string, extra: Partial<Book> = {}): Book =>
  ({
    id,
    title,
    authors: ['Someone Else'],
    addedAt: 1,
    status: 'read',
    finished: [day],
    pages: 300,
    readingLog: { [day]: 1 },
    ...extra,
  }) as unknown as Book

const shelf = [
  book('a', 'The Name of the Wind', '2026-02-01'),
  book('b', 'Wind and Truth', '2026-03-01'),
  book('c', 'Jane Eyre', '2019-05-05', { authors: ['Charlotte Brontë'] }),
]

const garden = () => deriveGarden(shelf, [], { today: '2026-11-23' })

describe('finding a book in the garden', () => {
  it('finds nothing for an empty search', () => {
    expect(findPlants(garden(), '')).toEqual([])
    expect(findPlants(garden(), '   ')).toEqual([])
  })

  it('finds a plant in an older year, not only the one she is looking at', () => {
    const hits = findPlants(garden(), 'jane')
    expect(hits).toHaveLength(1)
    expect(hits[0].year).toBe(2019)
    expect(hits[0].label).toBe('2019')
    expect(hits[0].plant.book.title).toBe('Jane Eyre')
  })

  it('puts a title that starts with what she typed before one that only contains it', () => {
    const hits = findPlants(garden(), 'wind')
    expect(hits.map((h) => h.plant.book.title)).toEqual(['Wind and Truth', 'The Name of the Wind'])
  })

  it('finds a book by its author, and ignores the accents', () => {
    const hits = findPlants(garden(), 'bronte')
    expect(hits.map((h) => h.plant.id)).toEqual(['c'])
  })

  it('never offers more than the limit', () => {
    const many = Array.from({ length: 20 }, (_, i) => book(`m${i}`, `Wind ${i}`, '2026-04-01'))
    expect(findPlants(deriveGarden(many, [], { today: '2026-11-23' }), 'wind')).toHaveLength(8)
    expect(findPlants(deriveGarden(many, [], { today: '2026-11-23' }), 'wind', 3)).toHaveLength(3)
  })

  it('finds nothing for a book that has no plant', () => {
    expect(findPlants(garden(), 'dune')).toEqual([])
  })
})
