import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import { needsPlaces, placesOf, worldMap } from './places'

const KNOWN = new Set(['United Kingdom', 'France', 'United States of America', 'Japan', 'Italy', 'Greece'])

describe('where the books are set', () => {
  it('finds countries in Open Library place names', () => {
    expect(placesOf(['London (England)'], KNOWN).countries).toEqual(['United Kingdom'])
    expect(placesOf(['Paris (France)', 'France'], KNOWN).countries).toEqual(['France'])
    expect(placesOf(['New York (N.Y.)'], KNOWN).countries).toEqual(['United States of America'])
    expect(placesOf(['England -- London'], KNOWN).countries).toEqual(['United Kingdom'])
    expect(placesOf(['Japan'], KNOWN).countries).toEqual(['Japan'])
    expect(placesOf(['Venice'], KNOWN).countries).toEqual(['Italy'])
  })

  it('puts made-up places in the imaginary lands', () => {
    const p = placesOf(['Hogwarts School of Witchcraft and Wizardry (Imaginary place)', 'Narnia', 'Middle Earth (Imaginary place)', 'England'], KNOWN)
    expect(p.imaginary).toEqual(['Hogwarts School of Witchcraft and Wizardry', 'Narnia', 'Middle Earth'])
    expect(p.countries).toEqual(['United Kingdom'])
  })

  it('reads Open Library’s real places for Harry Potter', () => {
    const p = placesOf(['England', 'Hogwarts School of Witchcraft and Wizardry', '4 Privet Drive', 'Diagon Alley'], KNOWN)
    expect(p.countries).toEqual(['United Kingdom'])
    expect(p.imaginary).toEqual(['Hogwarts School of Witchcraft and Wizardry'])
    // a real place name with a short made-up word inside it is not imaginary
    expect(placesOf(['Ozark Mountains'], KNOWN).imaginary).toEqual([])
  })

  it('ignores places it can’t place', () => {
    expect(placesOf(['Somewhere vague'], KNOWN)).toEqual({ countries: [], imaginary: [] })
  })

  it('counts finished books per country, and the ones still to look up', () => {
    const b = (id: string, extra: Partial<Book>): Book => ({ id, title: id, authors: [], color: '#888888', status: 'read', addedAt: 0, readCount: 1, ...extra })
    const books = [
      b('a', { places: ['London (England)'] }),
      b('b', { places: ['Oxford (England)', 'Greece'] }),
      b('c', { places: [] }),
      b('d', {}),
      b('e', { status: 'want', readCount: 0 }),
    ]
    const m = worldMap(books, KNOWN)
    expect([...m.countries]).toEqual([
      ['United Kingdom', 2],
      ['Greece', 1],
    ])
    expect(m.waiting).toBe(1)
    expect(m.placed).toBe(2)
    expect(books.filter(needsPlaces).map((x) => x.id)).toEqual(['d'])
  })
})
