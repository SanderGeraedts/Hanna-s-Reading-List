import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'
import type { RawVolume } from './googleVolume'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))
vi.mock('#/server/openLibrary', () => ({ searchBooks: async () => [], getWorkDetails: async () => null }))
// no canvas in tests: covers can't be sampled, so books fall back to a colour
vi.mock('./cover', async (orig) => ({ ...(await orig<typeof import('./cover')>()), analyzeCover: async () => null }))

const { fromVolume } = await import('./googleVolume')
const { combineShelves, SHELVES } = await import('./googleLibrary')
const { findMatch, googlePatch, importGoogleBooks } = await import('./googleImport')
const { combineResults } = await import('./searchResults')

const raw = (id: string, info: NonNullable<RawVolume['volumeInfo']>): RawVolume => ({ id, volumeInfo: info })
const tintenherz = raw('g1', {
  title: 'Tintenherz',
  authors: ['Cornelia Funke'],
  publishedDate: '2003-09-23',
  pageCount: 566,
  language: 'de',
  categories: ['Juvenile Fiction / Fantasy & Magic'],
  industryIdentifiers: [
    { type: 'ISBN_10', identifier: '3791504657' },
    { type: 'ISBN_13', identifier: '9783791504650' },
  ],
  description: '<p>Meggie &amp; ihr Vater&nbsp;Mo…</p>',
  imageLinks: { thumbnail: 'http://books.google.com/books/content?id=g1&printsec=frontcover&img=1&zoom=1&edge=curl' },
})

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: ['Someone'],
  color: '#888888',
  status: 'want',
  addedAt: 0,
  ...extra,
})

describe('Google Books volumes (#67)', () => {
  it('takes what the shelf needs from a volume', () => {
    expect(fromVolume(tintenherz)).toEqual({
      googleId: 'g1',
      title: 'Tintenherz',
      authors: ['Cornelia Funke'],
      published: '2003-09-23',
      year: 2003,
      pages: 566,
      isbn: '9783791504650',
      description: 'Meggie & ihr Vater Mo…',
      genres: expect.arrayContaining(['Fantasy']),
      language: 'de',
      coverUrl: 'https://books.google.com/books/content?id=g1&printsec=frontcover&img=1&zoom=1',
    })
    expect(fromVolume({ id: 'x' })).toBeNull()
  })

  it('search shows Google only for books Open Library does not have', () => {
    const ol = [{ workKey: '/works/OL1W', title: 'Tintenherz', authors: ['Cornelia Funke'] }]
    const google = [fromVolume(tintenherz)!, fromVolume(raw('g2', { title: 'Tintenblut', authors: ['Cornelia Funke'] }))!]
    expect(combineResults(ol, google).map((f) => f.key)).toEqual(['/works/OL1W', 'google:g2'])
  })
})

describe('Google Play Books library (#67)', () => {
  it('a book on several shelves takes the furthest status, and counts as owned when bought', () => {
    const books = combineShelves([
      { shelf: SHELVES.toRead, volumes: [tintenherz, raw('g2', { title: 'Tintenblut' })] },
      { shelf: SHELVES.haveRead, volumes: [tintenherz] },
      { shelf: SHELVES.purchased, volumes: [tintenherz] },
    ])
    expect(books.map((b) => [b.googleId, b.status, b.owned])).toEqual([
      ['g1', 'read', true],
      ['g2', 'want', false],
    ])
  })

  it('matches books already on the shelf by Google id, ISBN, or title and author', () => {
    const item = fromVolume(tintenherz)!
    expect(findMatch(item, [book('a', { googleId: 'g1' })])?.id).toBe('a')
    expect(findMatch(item, [book('b', { isbn: '978-3-7915-0465-0' })])?.id).toBe('b')
    expect(findMatch(item, [book('c', { title: 'Tintenherz', authors: ['C. Funke'] })])?.id).toBe('c')
    expect(findMatch(item, [book('d', { title: 'Tintenblut', authors: ['Cornelia Funke'] })])).toBeUndefined()
  })

  it('only moves a book forward, and fills gaps without overwriting', () => {
    const item = { ...fromVolume(tintenherz)!, status: 'want' as const, owned: true }
    const read = book('a', { status: 'read', pages: 600, title: 'Tintenherz' })
    const patch = googlePatch(read, item)
    expect(patch).toMatchObject({ googleId: 'g1', formats: ['ebook'], isbn: '9783791504650' })
    expect(patch).not.toHaveProperty('status')
    expect(patch).not.toHaveProperty('pages')
    // a paused book stays paused unless Google says it's read
    expect(googlePatch(book('p', { status: 'paused' }), { ...item, status: 'reading' })).not.toHaveProperty('status')
    expect(googlePatch(book('p', { status: 'paused' }), { ...item, status: 'read' })).toMatchObject({ status: 'read' })
  })

  it('adds new books and updates known ones', async () => {
    const added: Array<Partial<Book>> = []
    const updated: Array<[string, Partial<Book>]> = []
    const items = combineShelves([
      { shelf: SHELVES.readingNow, volumes: [tintenherz] },
      { shelf: SHELVES.toRead, volumes: [raw('g2', { title: 'Tintenblut', authors: ['Cornelia Funke'] })] },
    ])
    const summary = await importGoogleBooks(items, [book('a', { title: 'Tintenblut', authors: ['Cornelia Funke'] })], {
      addBook: (b) => added.push(b),
      updateBook: (id, p) => updated.push([id, p]),
      onProgress: () => {},
    })
    expect(summary).toEqual({ added: 1, updated: 1, unchanged: 0 })
    expect(added[0]).toMatchObject({ title: 'Tintenherz', googleId: 'g1', status: 'reading', pages: 566 })
    expect(updated).toEqual([['a', { googleId: 'g2' }]])
  })
})
