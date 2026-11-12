import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))

const { authorReason, combineSuggestions, tasteOf, titleKey, worthSuggesting } = await import('./recommend')

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: ['Someone'],
  color: '#888888',
  status: 'want',
  addedAt: 0,
  ...extra,
})
const r = (title: string, author: string, year: number) => ({
  workKey: `/works/${title}`,
  title,
  authors: [author],
  year,
  coverId: 1 as number | undefined,
})

describe('reading suggestions (no AI)', () => {
  it('compares titles without articles, subtitles or accents', () => {
    expect(titleKey('The Night Circus')).toBe(titleKey('Night Circus: A Novel'))
    expect(titleKey('Café')).toBe('cafe')
  })

  it('her taste: authors she rates best and reads most, genres of finished books', () => {
    const t = tasteOf([
      book('a', { status: 'read', rating: 5, authors: ['Maas'], genres: ['Fantasy'] }),
      book('b', { status: 'read', rating: 4, authors: ['Maas'], genres: ['Fantasy', 'Romance'] }),
      book('c', { status: 'read', rating: 2, authors: ['Other'], genres: ['Crime'] }),
      book('d', { status: 'want', authors: ['Unread'], genres: ['Horror'] }),
    ])
    expect(t.authors).toEqual([
      { name: 'Maas', rating: 4.5 },
      { name: 'Other', rating: 2 },
    ])
    expect(t.genres[0]).toBe('Fantasy')
    expect(t.genres).not.toContain('Horror')
    expect(authorReason(t.authors[0])).toBe('More by Maas, whose books you rate ★4½')
  })

  it('skips box sets, books without a cover and other scripts', () => {
    expect(worthSuggesting(r('House of Flame and Shadow', 'Maas', 2024))).toBe(true)
    expect(worthSuggesting(r('Book One / Book Two / Book Three', 'Maas', 2024))).toBe(false)
    expect(worthSuggesting(r('The Box Set', 'Maas', 2024))).toBe(false)
    expect(worthSuggesting({ ...r('No cover', 'Maas', 2024), coverId: undefined })).toBe(false)
    expect(worthSuggesting(r('暁のヨナ 47', 'X', 2027))).toBe(false)
  })

  it('takes from each list in turn, never a book she has or turned down, new genre books only', () => {
    const out = combineSuggestions(
      [
        { why: 'More by Maas', results: [r('On The Shelf', 'Maas', 2025), r('A', 'Maas', 2025), r('B', 'Maas', 2024)] },
        {
          why: 'New in Fantasy',
          results: [r('Old Fantasy', 'Y', 1999), r('C', 'Y', 2026), r('Nope', 'Z', 2026), r('A', 'Maas', 2025)],
          since: 2025,
        },
      ],
      ['On The Shelf — Maas', 'Nope — Z'],
      4,
    )
    expect(out.map((s) => `${s.title}: ${s.why}`)).toEqual(['A: More by Maas', 'C: New in Fantasy', 'B: More by Maas'])
  })
})
