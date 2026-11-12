import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))

const { cleanSuggestions, shelfSummary, titleKey } = await import('./recommend')

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: ['Someone'],
  color: '#888888',
  status: 'want',
  addedAt: 0,
  ...extra,
})

describe('recommendations', () => {
  it('compares titles without articles, subtitles or accents', () => {
    expect(titleKey('The Night Circus')).toBe(titleKey('Night Circus: A Novel'))
    expect(titleKey('Café')).toBe('cafe')
  })

  it('sums up her taste: best rated first, authors and genres of finished books', () => {
    const s = shelfSummary(
      [
        book('a', { status: 'read', rating: 5, spice: 3, authors: ['Maas'], genres: ['Fantasy'] }),
        book('b', { status: 'read', rating: 2, authors: ['Other'], genres: ['Crime'] }),
        book('c', { status: 'read', rating: 4.5, authors: ['Maas'], genres: ['Fantasy', 'Romance'] }),
        book('d', { status: 'want', authors: ['Unread'] }),
      ],
      ['Nope — Somebody'],
    )
    expect(s.favourites.map((f) => f.title)).toEqual(['Book a', 'Book c', 'Book b'])
    expect(s.favourites[0]).toMatchObject({ rating: 5, spice: 3 })
    expect(s.authors[0]).toBe('Maas')
    expect(s.authors).not.toContain('Unread')
    expect(s.genres[0]).toBe('Fantasy')
    expect(s.shelf).toContain('Book d — Unread')
    expect(s.notForMe).toEqual(['Nope — Somebody'])
  })

  it('never suggests a book she has or turned down, nor one twice', () => {
    const out = cleanSuggestions(
      [
        { title: 'The Book A', author: 'X', year: 2024, why: 'Because.' },
        { title: 'Fresh', author: 'Y', year: 2025, why: 'New.' },
        { title: 'Fresh: Special Edition', author: 'Y', why: 'Again.' },
        { title: 'Nope', author: 'Somebody', why: 'No.' },
        { title: '', author: 'Z', why: 'Empty.' },
        'junk',
      ],
      ['Book A — X', 'Nope — Somebody'],
    )
    expect(out).toEqual([{ title: 'Fresh', author: 'Y', year: 2025, why: 'New.' }])
  })
})
