import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import { PICK_KINDS, addedToday, longLent, pickKind, placeLine, showPick, streakLine, weekDots } from './todayDashboard'

const book = (b: Partial<Book> & { id: string }): Book => ({ title: b.id, authors: [], status: 'read', color: '#333', addedAt: 1, ...b }) as Book

describe('the today dashboard (T-0124)', () => {
  it('shows this week Monday to Sunday, with the days she read on', () => {
    // 2026-11-27 is a Friday
    const dots = weekDots([book({ id: 'a', readingLog: { '2026-11-23': 0.1, '2026-11-26': 0.2, '2026-11-20': 0.3 } })], '2026-11-27')
    expect(dots.map((d) => d.day)).toEqual(['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29'])
    expect(dots.map((d) => d.label).join('')).toBe('MTWTFSS')
    expect(dots.filter((d) => d.read).map((d) => d.day)).toEqual(['2026-11-23', '2026-11-26'])
    expect(dots.find((d) => d.today)!.day).toBe('2026-11-27')
    expect(dots.filter((d) => d.future).length).toBe(2)
  })

  it('says how the streak stands, in one line', () => {
    expect(streakLine({ current: 7, best: 9, today: false })).toBe('🔥 7 days in a row, read today to make it 8')
    expect(streakLine({ current: 1, best: 9, today: false })).toBe('🔥 1 day in a row, read today to make it 2')
    expect(streakLine({ current: 8, best: 9, today: true })).toBe('✓ Read today · 8 days in a row')
    expect(streakLine({ current: 1, best: 1, today: true })).toBe('✓ Read today')
    expect(streakLine({ current: 0, best: 3, today: false })).toBe('Read a little today to start a streak.')
  })

  it('mentions a lent book only once it has been away a month', () => {
    const books = [
      book({ id: 'long', lent: { to: 'Mira', since: '2026-10-20' } }),
      book({ id: 'short', lent: { to: 'Joost', since: '2026-11-20' } }),
      book({ id: 'unknown', lent: { to: 'Ada' } }),
    ]
    expect(longLent(books, '2026-11-27').map((b) => b.id)).toEqual(['long'])
  })

  it('names the books added today, not wishes and not older ones', () => {
    const now = new Date(2026, 10, 27, 15)
    const books = [
      book({ id: 'new', addedAt: new Date(2026, 10, 27, 9).getTime() }),
      book({ id: 'wish', addedAt: new Date(2026, 10, 27, 9).getTime(), wish: true }),
      book({ id: 'old', addedAt: new Date(2026, 10, 26, 23).getTime() }),
    ]
    expect(addedToday(books, now).map((b) => b.id)).toEqual(['new'])
  })

  it('says where a book is set when it knows', () => {
    expect(placeLine(book({ id: 'a', places: ['Japan', 'Peru'] }))).toBe('Set in Japan')
    expect(placeLine(book({ id: 'b' }))).toBeNull()
    expect(placeLine(book({ id: 'c', places: [''] }))).toBeNull()
  })

  it('takes turns between the kinds of pick, one a day, and Another steps on', () => {
    const kinds = ['2026-11-27', '2026-11-28', '2026-11-29'].map((d) => pickKind(d))
    expect(new Set(kinds).size).toBe(3)
    const today = pickKind('2026-11-27')
    expect(pickKind('2026-11-27', 1)).not.toBe(today)
    expect(pickKind('2026-11-27', PICK_KINDS.length)).toBe(today)
  })

  it('offers a pick only while she has room for another book', () => {
    const reading = (n: number) => Array.from({ length: n }, (_, i) => book({ id: `r${i}`, status: 'reading' }))
    expect(showPick(reading(2))).toBe(true)
    expect(showPick(reading(3))).toBe(false)
  })
})
