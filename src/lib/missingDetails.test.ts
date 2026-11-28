import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import { foundPatch, missingByDetail, misses } from './missingDetails'

const book = (id: string, extra: Partial<Book> = {}) => ({ id, title: id, authors: [], color: '#333', status: 'read', addedAt: 1, ...extra }) as Book

describe('missing details (T-0129)', () => {
  it('names what each book is missing, the whole shelf but not the wishlist', () => {
    const books = [
      book('full', { description: 'A tale.', genres: ['Fantasy'], places: ['Japan'], tropes: ['found family'], characters: [{ name: 'Ann' }] as Book['characters'] }),
      book('bare', { status: 'want' }),
      book('blank', { description: '  ', genres: [], places: [] }),
      book('wish', { wish: true }),
    ]
    const m = missingByDetail(books)
    expect(m.back.map((b) => b.id)).toEqual(['bare', 'blank'])
    expect(m.genres.map((b) => b.id)).toEqual(['bare', 'blank'])
    expect(m.places.map((b) => b.id)).toEqual(['bare', 'blank'])
    expect(m.tropes.map((b) => b.id)).toEqual(['bare', 'blank'])
    expect(m.characters.map((b) => b.id)).toEqual(['bare', 'blank'])
    expect(misses(books[0], 'back')).toBe(false)
  })

  it('saves only what she kept, and never over something she filled in meanwhile', () => {
    const found = { id: 'a', back: 'Found blurb.', genres: ['Mystery'], places: ['Peru'] }
    const empty = book('a')
    expect(foundPatch(found, new Set(['back', 'places']))(empty)).toEqual({ description: 'Found blurb.', places: ['Peru'] })
    const hers = book('a', { description: 'Her own.', genres: ['Crime'] })
    expect(foundPatch(found, new Set(['back', 'genres', 'places']))(hers)).toEqual({ places: ['Peru'] })
  })
})
