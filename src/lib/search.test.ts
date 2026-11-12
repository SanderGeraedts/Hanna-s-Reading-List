import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))

const { searchShelf, snippet } = await import('./search')

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: ['Someone'],
  color: '#888888',
  status: 'want',
  addedAt: 0,
  ...extra,
})

describe('searching the back text', () => {
  const shelf = [
    book('wing', {
      title: 'Fourth Wing',
      description: 'Twenty-year-old Violet Sorrengail was supposed to enter the Scribe Quadrant, but she is ordered to become a dragon rider instead.',
    }),
    book('dragon', { title: 'The Last Dragon' }),
    book('other', { description: 'A quiet story about a bakery.' }),
  ]

  it('finds a book by what it is about, after title matches', () => {
    expect(searchShelf(shelf, 'dragon').map((h) => h.book.id)).toEqual(['dragon', 'wing'])
    expect(searchShelf(shelf, 'dragon rider').map((h) => h.book.id)).toEqual(['wing'])
    expect(searchShelf(shelf, 'bakery').map((h) => h.book.id)).toEqual(['other'])
  })

  it('shows the words around the match', () => {
    const [hit] = searchShelf(shelf, 'scribe')
    expect(hit.hint).toContain('Scribe Quadrant')
    expect(hit.hint?.startsWith('…')).toBe(true)
  })

  it('cuts snippets at whole words', () => {
    expect(snippet('one two three four five six seven eight nine ten', 'five', 8)).toBe('…four five six…')
    expect(snippet('short text', 'nope')).toBe('')
  })
})
