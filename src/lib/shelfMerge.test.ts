import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import { mergeIntoServer } from './shelfMerge'

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: ['A'],
  status: 'want',
  color: '#000000',
  addedAt: 1,
  ...extra,
})

describe('mergeIntoServer', () => {
  const server = { books: [book('a'), book('b'), book('c')], updated: 't1' }

  it('takes the save as it is when it is based on the current server copy', () => {
    const r = mergeIntoServer(server, { books: [book('a', { title: 'X' }), book('b'), book('c')], base: 't1' })
    expect(r).toMatchObject({ changed: false, conflict: false })
    expect(r.books[0].title).toBe('X')
  })

  it('saves anything into an account without a shelf yet', () => {
    expect(mergeIntoServer(null, { books: [book('z')] })).toEqual({ books: [book('z')], changed: false, conflict: false })
  })

  it('keeps books a save leaves out, even from an up-to-date device, unless they were removed', () => {
    const r = mergeIntoServer(server, { books: [book('a')], base: 't1', removed: ['b'] })
    expect(r.books.map((b) => b.id)).toEqual(['a', 'c'])
    expect(r.changed).toBe(true)
  })

  it('counts a book merged into another as accounted for', () => {
    const r = mergeIntoServer(server, { books: [book('a', { mergedIds: ['b'] }), book('c')], base: 't1' })
    expect(r.books.map((b) => b.id)).toEqual(['a', 'c'])
  })

  it('never loses anything to a save from an older app that sends no base or removals', () => {
    const r = mergeIntoServer(server, { books: [book('x'), book('a', { title: 'Old edit' })] })
    expect(r.books.map((b) => b.id)).toEqual(['x', 'a', 'b', 'c'])
    expect(r.books[1].title).toBe('Book a')
    expect(r.conflict).toBe(true)
  })

  it('on a stale save, takes the newer edit of each book', () => {
    const current = { books: [book('a', { title: 'Server', editedAt: 5 }), book('b', { title: 'Server', editedAt: 5 })], updated: 't2' }
    const r = mergeIntoServer(current, {
      books: [book('a', { title: 'Device', editedAt: 9 }), book('b', { title: 'Device', editedAt: 3 })],
      base: 't1',
    })
    expect(r.books.map((b) => b.title)).toEqual(['Device', 'Server'])
  })
})
