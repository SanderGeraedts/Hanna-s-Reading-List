import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))

const { statusPatch } = await import('./library')
const { mergeBooks } = await import('./merge')
const { onThisDay } = await import('./insights')
const {
  amountFromText,
  amountText,
  dayAmountPatch,
  loggableBooks,
  monthEntries,
  progressPatch,
  startedIn,
} = await import('./readingLog')

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: ['Someone'],
  color: '#888888',
  status: 'reading',
  addedAt: 0,
  ...extra,
})
const apply = (b: Book, patch: Partial<Book>) => ({ ...b, ...patch })

describe('reading log (#76)', () => {
  it('notes how far the progress moved on that day', () => {
    let b = book('a', { progress: 0.1, pages: 200 })
    b = apply(b, progressPatch(b, 0.2, '2026-11-08'))
    b = apply(b, progressPatch(b, 0.3, '2026-11-08'))
    b = apply(b, progressPatch(b, 0.35, '2026-11-09'))
    expect(b.progress).toBe(0.35)
    expect(b.readingLog).toEqual({ '2026-11-08': 0.2, '2026-11-09': 0.05 })
    expect(amountText(b, b.readingLog!['2026-11-08'])).toBe('40 pages')
  })

  it('takes a slip back off that day, never below nothing', () => {
    let b = book('a', { progress: 0.5, readingLog: { '2026-11-08': 0.1 } })
    b = apply(b, progressPatch(b, 0.45, '2026-11-08'))
    expect(b.readingLog).toEqual({ '2026-11-08': 0.05 })
    b = apply(b, progressPatch(b, 0, '2026-11-08'))
    expect(b.readingLog).toBeUndefined()
    expect(b.progress).toBe(0)
  })

  it('sets a day from the calendar and moves the progress by the difference', () => {
    let b = book('a', { progress: 0.5, pages: 100, readingLog: { '2026-11-05': 0.1 } })
    b = apply(b, dayAmountPatch(b, '2026-11-05', amountFromText(b, '30')!))
    expect(b.readingLog).toEqual({ '2026-11-05': 0.3 })
    expect(b.progress).toBe(0.7)
    b = apply(b, dayAmountPatch(b, '2026-11-05', amountFromText(b, '')!))
    expect(b.readingLog).toBeUndefined()
    expect(b.progress).toBe(0.4)
    // a finished book keeps its progress
    const done = book('b', { status: 'read', progress: 0.9 })
    expect(dayAmountPatch(done, '2026-11-05', 0.1)).toEqual({ readingLog: { '2026-11-05': 0.1 } })
  })

  it('reads amounts as pages, listening time or a percentage', () => {
    expect(amountFromText(book('p', { pages: 300 }), '30')).toBe(0.1)
    expect(amountFromText(book('p', { pages: 300 }), 'lots')).toBeNull()
    const listen = book('t', { minutes: 600, formats: ['storytel'] })
    expect(amountFromText(listen, '1 h')).toBe(0.1)
    expect(amountText(listen, 0.1)).toBe('1 h')
    expect(amountFromText(book('x'), '12,5%')).toBe(0.125)
  })

  it('notes the day a book is started, not when it is picked up again after a pause', () => {
    const want = book('a', { status: 'want' })
    expect(statusPatch(want, 'reading', '2026-11-08').started).toEqual(['2026-11-08'])
    expect(statusPatch(book('b', { status: 'paused' }), 'reading', '2026-11-08').started).toBeUndefined()
    const reread = statusPatch(book('c', { status: 'read', started: ['2025-01-01'] }), 'reading', '2026-11-08')
    expect(reread.started).toEqual(['2025-01-01', '2026-11-08'])
  })

  it('puts reading, starts and finishes on the calendar, and lists the books started', () => {
    const shelf = [
      book('a', { started: ['2026-11-02'], readingLog: { '2026-11-02': 0.1, '2026-11-03': 0.2 } }),
      book('b', { status: 'read', finished: ['2026-11-03'], started: ['2026-10-20'] }),
    ]
    const days = monthEntries(shelf, 2026, 11)
    expect(days.get(2)).toEqual([{ book: shelf[0], amount: 0.1, started: true }])
    expect(days.get(3)!.map((e) => [e.book.id, e.amount, e.finished])).toEqual([
      ['a', 0.2, undefined],
      ['b', undefined, true],
    ])
    expect(startedIn(shelf, 2026, 11).map((s) => s.book.id)).toEqual(['a'])
    expect(startedIn(shelf, 2026, 10).map((s) => s.book.id)).toEqual(['b'])
    expect(loggableBooks(shelf, '2026-11-03').map((b) => b.id)).toEqual(['a', 'b'])
    expect(loggableBooks(shelf, '2026-11-04').map((b) => b.id)).toEqual(['a'])
  })

  it('remembers what was read on this day in earlier years', () => {
    const shelf = [
      book('a', { readingLog: { '2025-11-07': 0.1 } }),
      book('b', { status: 'read', finished: ['2024-11-07'] }),
      book('c', { readingLog: { '2026-11-07': 0.1 } }),
    ]
    expect(onThisDay(shelf, new Date(2026, 10, 7)).map((e) => [e.book.id, e.year, e.amount, e.finished])).toEqual([
      ['a', 2025, 0.1, undefined],
      ['b', 2024, undefined, true],
    ])
  })

  it('keeps both copies’ days when books are merged', () => {
    const merged = mergeBooks(
      book('a', { started: ['2026-01-01'], readingLog: { '2026-01-01': 0.1, '2026-01-02': 0.2 } }),
      book('b', { started: ['2026-01-05'], readingLog: { '2026-01-02': 0.3 } }),
    )
    expect(merged.started).toEqual(['2026-01-01', '2026-01-05'])
    expect(merged.readingLog).toEqual({ '2026-01-01': 0.1, '2026-01-02': 0.3 })
  })
})
