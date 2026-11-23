import { describe, expect, it } from 'vitest'
import { rhythm } from './rhythm'

describe('the Stats page’s scope (T-0070)', () => {
  const books = [
    { id: 'a', title: 'A', authors: [], status: 'read', color: '#000', addedAt: 0, readingLog: { '2025-06-02': 1, '2026-06-01': 1, '2026-06-08': 1 } },
  ] as unknown as Parameters<typeof rhythm>[0]

  it('counts the weekdays of the year she picked, not the last twelve months', () => {
    // 2026-06-01 and 2026-06-08 are Mondays, 2025-06-02 is a Monday too
    expect(rhythm(books, 2026, '2026-11-23', 'period').weekdays[0]).toBe(2)
    expect(rhythm(books, 2025, '2026-11-23', 'period').weekdays[0]).toBe(1)
    expect(rhythm(books, 2024, '2026-11-23', 'period').weekdays).toEqual([0, 0, 0, 0, 0, 0, 0])
  })

  it('counts everything for all time', () => {
    const r = rhythm(books, 'all', '2026-11-23', 'period')
    expect(r.weekdays[0]).toBe(3)
    expect(r.months[5]).toBe(3)
  })

  it('still looks at the last twelve months by default', () => {
    expect(rhythm(books, 2026, '2026-11-23').weekdays[0]).toBe(2)
  })
})
