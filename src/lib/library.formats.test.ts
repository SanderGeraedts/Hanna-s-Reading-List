import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))

const { formatsOf, groupLabel, primaryFormat, sortBooks, withFormats } = await import('./library')
const { searchShelf } = await import('./search')

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: ['Someone'],
  color: '#888888',
  status: 'want',
  addedAt: 0,
  ...extra,
})

describe('more than one way of having a book (#16)', () => {
  it('reads books from before formats existed', () => {
    expect(formatsOf(book('a', { format: 'hardcover' }))).toEqual(['hardcover'])
    expect(formatsOf(book('b', { storytelId: 'st-1' }))).toEqual(['storytel'])
    expect(formatsOf(book('c'))).toEqual([])
  })

  it('keeps several formats, in a fixed order', () => {
    expect(formatsOf(book('a', { formats: ['storytel', 'paperback'] }))).toEqual(['paperback', 'storytel'])
  })

  it('respects an explicit list over the old field and the Storytel default', () => {
    expect(formatsOf(book('a', { format: 'ebook', formats: ['paperback'] }))).toEqual(['paperback'])
    expect(formatsOf(book('b', { storytelId: 'st-1', formats: [] }))).toEqual([])
  })

  it('lets the physical copy win when grouping', () => {
    expect(primaryFormat(book('a', { formats: ['storytel', 'ebook', 'paperback'] }))).toBe('paperback')
    expect(primaryFormat(book('b', { formats: ['storytel', 'library'] }))).toBe('library')
    expect(primaryFormat(book('c', { formats: ['audiobook', 'storytel'] }))).toBe('audiobook')
    expect(groupLabel('format', book('d', { formats: ['ebook', 'hardcover'] }))).toBe('Hardcover')
  })

  it('arranges by the winning format, physical groups first', () => {
    const shelf = [
      book('st', { formats: ['storytel'] }),
      book('both', { formats: ['storytel', 'paperback'] }),
      book('none'),
      book('eb', { formats: ['ebook'] }),
    ]
    expect(sortBooks(shelf, 'format').map((b) => b.id)).toEqual(['both', 'eb', 'st', 'none'])
  })

  it('finds a book under any of its formats', () => {
    const shelf = [book('both', { title: 'Tintenherz', formats: ['paperback', 'storytel'] })]
    expect(searchShelf(shelf, 'storytel').map((h) => h.book.id)).toEqual(['both'])
    expect(searchShelf(shelf, 'paperback').map((h) => h.book.id)).toEqual(['both'])
  })

  it('writes the list and retires the old field', () => {
    expect(withFormats(['storytel', 'paperback', 'storytel'])).toEqual({ formats: ['paperback', 'storytel'], format: undefined })
  })
})
