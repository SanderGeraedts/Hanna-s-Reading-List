import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import { byBooks, needsPlaces, placesOf, worldMap } from './places'
import { coverAtSize } from './cover'

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
    expect(p.imaginary).toEqual(['Hogwarts', 'Narnia', 'Middle Earth'])
    expect(p.countries).toEqual(['United Kingdom'])
  })

  it('reads Open Library’s real places for Harry Potter', () => {
    const p = placesOf(['England', 'Hogwarts School of Witchcraft and Wizardry', '4 Privet Drive', 'Diagon Alley'], KNOWN)
    expect(p.countries).toEqual(['United Kingdom'])
    expect(p.imaginary).toEqual(['Hogwarts'])
    // a real place name with a short made-up word inside it is not imaginary
    expect(placesOf(['Ozark Mountains'], KNOWN).imaginary).toEqual([])
  })

  it('ignores places it can’t place', () => {
    expect(placesOf(['Somewhere vague'], KNOWN)).toEqual({ countries: [], imaginary: [] })
  })

  it('gives the finished books per country, and counts the ones still to look up', () => {
    const books = [
      b('a', { places: ['London (England)'] }),
      b('b', { places: ['Oxford (England)', 'Greece'] }),
      b('c', { places: [] }),
      b('d', {}),
      b('e', { status: 'want', readCount: 0, places: ['France'] }),
    ]
    const m = worldMap(books, KNOWN)
    expect([...m.countries].map(([c, list]) => [c, ids(list)])).toEqual([
      ['United Kingdom', ['a', 'b']],
      ['Greece', ['b']],
    ])
    expect(m.waiting).toBe(1)
    expect(m.placed).toBe(2)
    expect(books.filter(needsPlaces).map((x) => x.id)).toEqual(['d'])
  })
})

const b = (id: string, extra: Partial<Book> = {}): Book => ({ id, title: id, authors: [], color: '#888888', status: 'read', addedAt: 0, readCount: 1, ...extra })
const ids = (list: Book[]) => list.map((x) => x.id)

describe('the map: books per place in tile order (T-0018)', () => {
  it('puts the most recently finished first, no finish date last, ties by title', () => {
    const books = [
      b('old', { title: 'Old', finished: ['2024-03-01'], places: ['France'] }),
      b('none-z', { title: 'Zebra', places: ['France'] }),
      b('new', { title: 'New', finished: ['2023-01-01', '2026-10-01'], places: ['Paris (France)'] }),
      b('none-a', { title: 'Apple', places: ['France'] }),
      b('tie-b', { title: 'Beta', finished: ['2025-05-05'], places: ['France'] }),
      b('tie-a', { title: 'Alpha', finished: ['2025-05-05'], places: ['France'] }),
    ]
    expect(ids(worldMap(books, KNOWN).countries.get('France')!)).toEqual(['new', 'tie-a', 'tie-b', 'old', 'none-a', 'none-z'])
  })

  it('has each book once per country and once per land, in the same order for lands', () => {
    const books = [
      b('a', { title: 'A', finished: ['2025-01-01'], places: ['London (England)', 'Oxford (England)', 'Narnia', 'Narnia (Imaginary place)'] }),
      b('c', { title: 'C', finished: ['2026-01-01'], places: ['narnia (Imaginary place)', 'England'] }),
    ]
    const m = worldMap(books, KNOWN)
    expect(ids(m.countries.get('United Kingdom')!)).toEqual(['c', 'a'])
    expect(ids(m.imaginary.get('Narnia')!)).toEqual(['c', 'a'])
  })

  it('sorts places most books first, ties alphabetical, for countries and lands', () => {
    const books = [
      b('a', { places: ['Japan', 'Oz'] }),
      b('b', { places: ['Italy', 'Narnia'] }),
      b('c', { places: ['Italy', 'Narnia'] }),
      b('d', { places: ['France', 'Atlantis'] }),
    ]
    const m = worldMap(books, KNOWN)
    expect(byBooks(m.countries).map(([c, list]) => [c, ids(list)])).toEqual([
      ['Italy', ['b', 'c']],
      ['France', ['d']],
      ['Japan', ['a']],
    ])
    expect(byBooks(m.imaginary).map(([l]) => l)).toEqual(['Narnia', 'Atlantis', 'Oz'])
  })
})

describe('the map: small covers (T-0018)', () => {
  it('asks the app’s cover route for another size', () => {
    expect(coverAtSize('/api/cover/id/8231856?size=L', 'S')).toBe('/api/cover/id/8231856?size=S')
    expect(coverAtSize('/api/cover/isbn/9780140328721', 'S')).toBe('/api/cover/isbn/9780140328721?size=S')
    expect(coverAtSize('/api/cover/id/8231856?size=L', 'M')).toBe('/api/cover/id/8231856?size=M')
  })

  it('leaves own photos, Storytel covers and empty ones as they are', () => {
    const photo = 'data:image/jpeg;base64,/9j/4AAQ'
    expect(coverAtSize(photo, 'S')).toBe(photo)
    const storytel = '/api/remote-cover?url=https%3A%2F%2Fexample.com%2Fc.jpg%3Fsize%3DL'
    expect(coverAtSize(storytel, 'S')).toBe(storytel)
    expect(coverAtSize('', 'S')).toBe('')
  })
})
