import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))

const { pickReadNext, readNextChoices } = await import('./readNext')

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: ['Someone Else'],
  color: '#888888',
  status: 'want',
  addedAt: 0,
  ...extra,
})

const percy = (n: number, extra: Partial<Book> = {}) =>
  book(`p${n}`, { title: `Percy Jackson, Teil ${n}: Titel ${n}`, authors: ['Rick Riordan'], ...extra })

const ids = (books: Book[]) => books.map((b) => b.id).sort()

describe('what to read next (#58)', () => {
  it('offers books she wants to read, never re-reads', () => {
    const shelf = [
      book('w'),
      book('r', { status: 'read' }),
      book('again', { status: 'want', readCount: 1 }),
      book('c', { status: 'reading' }),
      book('p', { status: 'paused' }),
    ]
    expect(ids(readNextChoices(shelf))).toEqual(['w'])
  })

  it('offers only the next book of a series', () => {
    const shelf = [percy(3), percy(1, { status: 'read' }), percy(2), percy(4)]
    expect(ids(readNextChoices(shelf))).toEqual(['p2'])
  })

  it('offers nothing from a series she is in the middle of', () => {
    expect(readNextChoices([percy(1, { status: 'read' }), percy(2, { status: 'reading' }), percy(3)])).toEqual([])
    expect(readNextChoices([percy(1, { status: 'paused' }), percy(2)])).toEqual([])
  })

  it('starts a series at the first book, even when a later one was read', () => {
    expect(ids(readNextChoices([percy(1), percy(2, { status: 'read' }), percy(3)]))).toEqual(['p1'])
  })

  it('offers nothing once a series is read', () => {
    expect(readNextChoices([percy(1, { status: 'read' }), percy(2, { status: 'read' })])).toEqual([])
  })

  it('leaves out books that are not out yet', () => {
    const shelf = [book('out', { published: '2020' }), book('soon', { published: '2099-01-01' }), book('ry', { releaseDate: '2099-05-01' })]
    expect(ids(readNextChoices(shelf, '2026-11-13'))).toEqual(['out'])
  })

  it('picks another book when pressed again', () => {
    const choices = [book('a'), book('b')]
    expect(pickReadNext(choices, 'a', () => 0)?.id).toBe('b')
    expect(pickReadNext([book('a')], 'a')?.id).toBe('a')
    expect(pickReadNext([])).toBeUndefined()
  })
})
