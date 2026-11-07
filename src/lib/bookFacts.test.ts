import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))
const search = vi.fn()
const publishDate = vi.fn()
vi.mock('#/server/openLibrary', () => ({
  searchBooks: (a: unknown) => search(a),
  getWorkDetails: async () => ({ genres: [] }),
  getPublishDate: (a: unknown) => publishDate(a),
}))

const { formatPublished, normalizeIsbn, parsePublished } = await import('./bookFacts')
const { lookUpFacts } = await import('./useBookDetails')
const { mergeBooks } = await import('./merge')

const book = (extra: Partial<Book> = {}): Book => ({
  id: 'b',
  title: 'Tintenherz',
  authors: ['Cornelia Funke'],
  color: '#888888',
  status: 'want',
  addedAt: 0,
  ...extra,
})

describe('publication dates (#44)', () => {
  it('reads the ways a date is written, as far as it is known', () => {
    expect(parsePublished('2008')).toBe('2008')
    expect(parsePublished('2008-03-12')).toBe('2008-03-12')
    expect(parsePublished('12.03.2008')).toBe('2008-03-12')
    expect(parsePublished('12/3/2008')).toBe('2008-03-12')
    expect(parsePublished('3.2008')).toBe('2008-03')
    expect(parsePublished('March 2008')).toBe('2008-03')
    expect(parsePublished('March 12, 2008')).toBe('2008-03-12')
    expect(parsePublished('12. März 2008')).toBe('2008-03-12')
    expect(parsePublished('c1998')).toBe('1998')
  })

  it("refuses what isn't a date", () => {
    expect(parsePublished('31.02.2008')).toBeNull()
    expect(parsePublished('soon')).toBeNull()
    expect(parsePublished('1998 or 1999')).toBeNull()
    expect(parsePublished('')).toBeNull()
  })

  it('shows it again in words', () => {
    expect(formatPublished('2008-03-12')).toBe('12 March 2008')
    expect(formatPublished('2008-03')).toBe('March 2008')
    expect(formatPublished('2008')).toBe('2008')
    // what is shown can be read back unchanged
    expect(parsePublished(formatPublished('2008-03-12'))).toBe('2008-03-12')
  })
})

describe('ISBNs (#43)', () => {
  it('accepts ISBN-10 and -13 with hyphens or spaces, and checks the last digit', () => {
    expect(normalizeIsbn('978-3-7915-0465-0')).toBe('9783791504650')
    expect(normalizeIsbn('3 7915 0465 X')).toBeNull()
    expect(normalizeIsbn('0-306-40615-2')).toBe('0306406152')
    expect(normalizeIsbn('080442957x')).toBe('080442957X')
    expect(normalizeIsbn('9783791504651')).toBeNull()
    expect(normalizeIsbn('12345')).toBeNull()
  })
})

describe('filling in a missing ISBN and date', () => {
  it('takes the ISBN of the Open Library match, then that edition’s date', async () => {
    search.mockResolvedValueOnce([{ workKey: '/works/OL1W', title: 'Tintenherz', authors: ['Cornelia Funke'], isbn: '9783791504650', year: 2003 }])
    publishDate.mockResolvedValueOnce({ published: '2003-09' })
    expect(await lookUpFacts(book())).toEqual({ isbn: '9783791504650', year: 2003, published: '2003-09', factsChecked: '9783791504650' })
  })

  it("doesn't let a different edition's date change the year", async () => {
    publishDate.mockResolvedValueOnce({ published: '2015-01-01' })
    expect(await lookUpFacts(book({ isbn: '9783791504650', year: 2003 }))).toEqual({ factsChecked: '9783791504650' })
  })

  it('remembers that nothing was found', async () => {
    search.mockResolvedValueOnce([])
    expect(await lookUpFacts(book())).toEqual({ factsChecked: '' })
  })

  it('a merged copy brings its date along when it is the same year', () => {
    expect(mergeBooks(book({ year: 2003 }), book({ id: 'o', year: 2003, published: '2003-09' })).published).toBe('2003-09')
    expect(mergeBooks(book({ year: 2003 }), book({ id: 'o', year: 2015, published: '2015' })).published).toBeUndefined()
  })
})
