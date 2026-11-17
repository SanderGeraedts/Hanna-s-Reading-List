import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))

const { canChange, challengeCalendar, challengeNow, pickFor, pickable } = await import('./monthChallenge')
const { mergeBooks } = await import('./merge')

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: ['Someone'],
  color: '#888888',
  status: 'want',
  addedAt: 0,
  ...extra,
})
const apply = (books: Book[], patches: Map<string, Partial<Book>>) => books.map((b) => ({ ...b, ...patches.get(b.id) }))

describe('monthly challenge (#144)', () => {
  it('invites her to set it up while it is not in use', () => {
    const c = challengeNow([book('a')], '2026-11-16')
    expect(c.notStarted).toBe(true)
  })

  it("lists this month's book as open until it's finished", () => {
    const dec = book('dec', { challengeMonth: '2026-12' })
    const before = challengeNow([dec], '2026-11-20')
    expect(before.open).toEqual([])
    const inDecember = challengeNow([dec], '2026-12-02')
    expect(inDecember.open.map((i) => i.book.id)).toEqual(['dec'])
    const finished = { ...dec, status: 'read' as const, finished: ['2026-12-10'] }
    const after = challengeNow([finished, book('jan', { challengeMonth: '2027-01' })], '2026-12-15')
    expect(after.open).toEqual([])
    expect(after.current?.doneOn).toBe('2026-12-10')
  })

  it('carries an unfinished book over, and counts it late when finished later', () => {
    const dec = book('dec', { challengeMonth: '2026-12' })
    const jan = book('jan', { challengeMonth: '2027-01' })
    const c = challengeNow([dec, jan], '2027-01-05')
    expect(c.open.map((i) => `${i.month}:${i.book.id}`)).toEqual(['2026-12:dec', '2027-01:jan'])
    const lateDone = challengeNow([{ ...dec, status: 'read', finished: ['2027-01-03'] }, jan], '2027-01-05')
    expect(lateDone.open.map((i) => i.book.id)).toEqual(['jan'])
  })

  it('counts a book finished early: its month is free', () => {
    const mar = book('mar', { challengeMonth: '2027-03', status: 'read', finished: ['2027-02-10'] })
    const c = challengeNow([mar, book('x', { challengeMonth: '2027-01' })], '2027-03-02')
    expect(c.current?.doneOn).toBe('2027-02-10')
    expect(c.open.map((i) => i.book.id)).toEqual(['x'])
  })

  it("doesn't count sleep reads, and doesn't offer them", () => {
    const sleepy = book('s', { challengeMonth: '2026-12', sleepRead: true, status: 'read', finished: ['2026-12-05'] })
    expect(challengeNow([sleepy], '2026-12-20').open.map((i) => i.book.id)).toEqual(['s'])
    expect(pickable([book('s2', { sleepRead: true }), book('ok')], '2027-01').map((b) => b.id)).toEqual(['ok'])
  })

  it('reminds her in December until next year has a book', () => {
    const dec = book('dec', { challengeMonth: '2026-12', status: 'read', finished: ['2026-12-03'] })
    expect(challengeNow([dec], '2026-12-10').remindNextYear).toBe(true)
    expect(challengeNow([dec], '2026-11-10').remindNextYear).toBe(false)
    expect(challengeNow([dec, book('j', { challengeMonth: '2027-01' })], '2026-12-10').remindNextYear).toBe(false)
  })

  it('only changes months that have not started, one book per month and each book once a year', () => {
    expect(canChange('2026-12', '2026-11-16')).toBe(true)
    expect(canChange('2026-11', '2026-11-16')).toBe(false)
    const shelf = [book('a', { challengeMonth: '2027-01' }), book('b'), book('c', { status: 'read' })]
    // a is January's already, c is finished: only b can go in February
    expect(pickable(shelf, '2027-02').map((b) => b.id)).toEqual(['b'])
    // swapping January to b clears a
    const swapped = apply(shelf, pickFor(shelf, '2027-01', 'b'))
    expect(swapped.map((b) => b.challengeMonth)).toEqual([undefined, '2027-01', undefined])
    expect(apply(swapped, pickFor(swapped, '2027-01', null)).some((b) => b.challengeMonth)).toBe(false)
  })

  it('merging duplicates keeps the challenge month', () => {
    expect(mergeBooks(book('a'), book('b', { challengeMonth: '2027-05' })).challengeMonth).toBe('2027-05')
  })

  it('shows the year as a calendar: every month, its book, and which are done (#154)', () => {
    const books = [
      book('nov', { challengeMonth: '2026-11', status: 'read', finished: ['2026-11-03'] }),
      book('dec', { challengeMonth: '2026-12' }),
      book('next', { challengeMonth: '2027-01' }),
    ]
    const cal = challengeCalendar(books, 2026, '2026-12-05')
    expect(cal.map((m) => m.month)).toEqual(Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}`))
    expect(cal[10]).toMatchObject({ current: false, past: true, item: { doneOn: '2026-11-03', late: false } })
    expect(cal[11]).toMatchObject({ current: true, past: false, item: { book: { id: 'dec' } } })
    expect(cal[11].item!.doneOn).toBeUndefined()
    expect(cal[0].item).toBeUndefined()
    expect(challengeCalendar(books, 2027, '2026-12-05')[0].item!.book.id).toBe('next')
  })
})
