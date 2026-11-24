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

  it('never offers a book whose earlier books are not all read, also when they are not on the shelf', () => {
    // book 2 isn't on the shelf: book 3 waits
    expect(readNextChoices([percy(1, { status: 'read' }), percy(3)])).toEqual([])
    // only book 3 of a series: not offered
    expect(readNextChoices([percy(3)])).toEqual([])
    // once 1 and 2 are read, book 3 can come up
    expect(ids(readNextChoices([percy(1, { status: 'read' }), percy(2, { readCount: 1, status: 'want' }), percy(3)]))).toEqual(['p3'])
    // book 1 of a series, alone on the shelf: fine
    expect(ids(readNextChoices([percy(1)]))).toEqual(['p1'])
  })

  it('a book numbered before it on the shelf (a novella) must be read too', () => {
    const shelf = [
      book('a1', { series: 'Saga', seriesIndex: 1, status: 'read' }),
      book('a15', { series: 'Saga', seriesIndex: 1.5 }),
      book('a2', { series: 'Saga', seriesIndex: 2 }),
    ]
    expect(ids(readNextChoices(shelf))).toEqual(['a15'])
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

describe('never a sleep read (D-0025, T-0017)', () => {
  it('leaves out a book ticked as a sleep read and one whose series is marked', () => {
    const shelf = [
      book('plain'),
      book('sleepy', { sleepRead: true }),
      book('n1', { title: 'Night 1', series: 'Night Saga', seriesIndex: 1, status: 'read', sleepSeries: 'night saga' }),
      book('n2', { title: 'Night 2', series: 'Night Saga', seriesIndex: 2 }),
    ]
    expect(ids(readNextChoices(shelf))).toEqual(['plain'])
    // without the marks, both would be offered
    const unmarked = shelf.map((b) => ({ ...b, sleepRead: undefined, sleepSeries: undefined }))
    expect(ids(readNextChoices(unmarked))).toEqual(['n2', 'plain', 'sleepy'])
  })
})
