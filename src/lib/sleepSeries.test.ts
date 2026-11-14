import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))

const {
  SERIES_QUESTION_FROM,
  authorKey,
  isSleepRead,
  joinSeries,
  markSleepSeries,
  notInSeries,
  seriesQuestions,
  skipsRatingQuestion,
  sleepReadIds,
  sleepSeriesKeys,
} = await import('./sleepSeries')
const { mergeBooks } = await import('./merge')
const { sortBooks } = await import('./library')
const { arrangementSeparators } = await import('./separators')

const OLD = SERIES_QUESTION_FROM - 1
const NEW = SERIES_QUESTION_FROM + 1
const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: ['Rick Riordan'],
  color: '#888888',
  status: 'want',
  addedAt: OLD,
  ...extra,
})
const percy = (i: number, extra: Partial<Book> = {}) => book(`p${i}`, { series: 'Percy Jackson', seriesIndex: i, ...extra })
/** apply patches the way the app does */
const apply = (books: Book[], patches: Map<string, Partial<Book>>) => books.map((b) => ({ ...b, ...patches.get(b.id) }))

describe('sleep reads', () => {
  it('a whole series: marked on every book, for the series it was set for', () => {
    const shelf = [percy(1), percy(2), book('other')]
    const marked = apply(shelf, markSleepSeries(shelf, 'percy jackson', true))
    expect(marked.map((b) => b.sleepSeries)).toEqual(['percy jackson', 'percy jackson', undefined])
    expect(isSleepRead(marked[0], marked)).toBe(true)
    expect(isSleepRead(marked[2], marked)).toBe(false)
    // and undone for the whole series in one go
    const unmarked = apply(marked, markSleepSeries(marked, 'percy jackson', false))
    expect(unmarked.some((b) => isSleepRead(b, unmarked))).toBe(false)
  })

  it('a book added to a marked series later is a sleep read straight away', () => {
    const shelf = apply([percy(1), percy(2)], markSleepSeries([percy(1), percy(2)], 'percy jackson', true))
    const later = percy(3)
    expect(isSleepRead(later, [...shelf, later])).toBe(true)
  })

  it("a book moved to another series doesn't take the mark along", () => {
    const shelf = apply(
      [percy(1), percy(2), percy(3), book('h1', { series: 'Heroes' }), book('h2', { series: 'Heroes' })],
      markSleepSeries([percy(1), percy(2), percy(3)], 'percy jackson', true),
    )
    // p3 is moved to Heroes by hand, still carrying its old mark
    const moved = shelf.map((b) => (b.id === 'p3' ? { ...b, series: 'Heroes' } : b))
    expect(moved.find((b) => b.id === 'p3')!.sleepSeries).toBe('percy jackson')
    expect(isSleepRead(moved.find((b) => b.id === 'p3')!, moved)).toBe(false)
    expect(sleepSeriesKeys(moved)).toEqual(new Set(['percy jackson']))
    expect(isSleepRead(moved.find((b) => b.id === 'h1')!, moved)).toBe(false)
  })

  it('only a re-read skips the rating question, never the first read', () => {
    const first = book('a', { sleepRead: true })
    const again = book('b', { sleepRead: true, readCount: 1, finished: ['2026-01-01'] })
    const normal = book('c', { readCount: 1, finished: ['2026-01-01'] })
    const shelf = [first, again, normal]
    expect(skipsRatingQuestion(first, shelf)).toBe(false)
    expect(skipsRatingQuestion(again, shelf)).toBe(true)
    expect(skipsRatingQuestion(normal, shelf)).toBe(false)
  })

  it('shows a moon on the sign of a sleep series', () => {
    const shelf = apply([percy(1), percy(2), book('x1', { series: 'X' }), book('x2', { series: 'X' })], markSleepSeries([percy(1), percy(2)], 'percy jackson', true))
    const seps = [...arrangementSeparators(sortBooks(shelf, 'series'), 'series').values()]
    expect(seps.find((s) => s.label === 'Percy Jackson')?.sleep).toBe(true)
    expect(seps.find((s) => s.label === 'X')?.sleep).toBeUndefined()
  })

  it('finds every sleep read for the moon on the spine: ticked itself or through its series', () => {
    const shelf = apply([percy(1), percy(2), book('own', { sleepRead: true }), book('plain')], markSleepSeries([percy(1), percy(2)], 'percy jackson', true))
    expect([...sleepReadIds(shelf)].sort()).toEqual(['own', 'p1', 'p2'])
  })

  it('merging duplicates keeps the series mark and the answer', () => {
    const merged = mergeBooks(book('a'), book('b', { sleepSeries: 'percy jackson', seriesAsked: true }))
    expect(merged.sleepSeries).toBe('percy jackson')
    expect(merged.seriesAsked).toBe(true)
  })
})

describe('"Is this part of …?"', () => {
  const shelf = [percy(1), percy(2), book('k1', { series: 'Kane Chronicles' }), book('k2', { series: 'Kane Chronicles' })]

  it('asks about a new book by a series author, with all that author’s series', () => {
    const q = seriesQuestions([...shelf, book('new', { addedAt: NEW })])
    expect(q.map((x) => x.book.id)).toEqual(['new'])
    expect(q[0].choices.map((c) => c.name)).toEqual(['Kane Chronicles', 'Percy Jackson'])
  })

  it("doesn't ask about older books, books already in a series, other authors, or answered ones", () => {
    expect(seriesQuestions([...shelf, book('old')])).toEqual([])
    expect(seriesQuestions([...shelf, percy(3, { addedAt: NEW })])).toEqual([])
    expect(seriesQuestions([...shelf, book('else', { addedAt: NEW, authors: ['Someone Else'] })])).toEqual([])
    expect(seriesQuestions([...shelf, book('no', { addedAt: NEW, ...notInSeries })])).toEqual([])
  })

  it('asks about a book added the evening it went live (#131)', () => {
    // Hanna's test book: 13 November 2026, 23:15 in Amsterdam
    const evening = book('test', { addedAt: Date.UTC(2026, 10, 13, 22, 15) })
    expect(seriesQuestions([...shelf, evening]).map((x) => x.book.id)).toEqual(['test'])
    expect(seriesQuestions([...shelf, book('before', { addedAt: Date.UTC(2026, 10, 13, 21, 0) })])).toEqual([])
  })

  it('matches author names written differently', () => {
    expect(authorKey('J.R.R. Tolkien')).toBe(authorKey('J. R. R. Tolkien'))
    expect(authorKey('Rick Riordan')).toBe(authorKey('rick  riordan'))
    expect(seriesQuestions([...shelf, book('new', { addedAt: NEW, authors: ['RICK RIORDAN'] })]).length).toBe(1)
  })

  it('joining puts the book in the series, and a sleep series makes it a sleep read', () => {
    const marked = apply(shelf, markSleepSeries(shelf, 'percy jackson', true))
    const nb = book('new', { addedAt: NEW })
    const [q] = seriesQuestions([...marked, nb])
    const percyChoice = q.choices.find((c) => c.name === 'Percy Jackson')!
    expect(percyChoice.sleep).toBe(true)
    const joined = { ...nb, ...joinSeries(percyChoice) }
    const after = [...marked, joined]
    expect(seriesQuestions(after)).toEqual([])
    expect(isSleepRead(joined, after)).toBe(true)
    // its first read still asks for a rating
    expect(skipsRatingQuestion(joined, after)).toBe(false)
  })
})
