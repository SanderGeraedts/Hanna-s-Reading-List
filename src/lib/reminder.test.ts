import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import { amsterdamDay, amsterdamHour, readOn } from './reminder'

const book = (extra: Partial<Book>): Book => ({ id: 'b', title: 'B', authors: [], color: '#888', status: 'reading', addedAt: 0, ...extra })

describe('reading reminder (#163)', () => {
  it('uses the day and hour in Amsterdam, summer and winter', () => {
    // 18:30 UTC in July is 20:30 in Amsterdam; in January it's 19:30
    expect(amsterdamHour(new Date(Date.UTC(2026, 6, 1, 18, 30)))).toBe(20)
    expect(amsterdamHour(new Date(Date.UTC(2026, 0, 15, 18, 30)))).toBe(19)
    // 23:30 UTC on 31 Dec is already New Year's Day in Amsterdam
    expect(amsterdamDay(new Date(Date.UTC(2026, 11, 31, 23, 30)))).toBe('2027-01-01')
  })

  it('reminds only when nothing was read or finished that day', () => {
    expect(readOn([book({ readingLog: { '2026-11-19': 0.02 } })], '2026-11-19')).toBe(true)
    expect(readOn([book({ finished: ['2026-11-19'] })], '2026-11-19')).toBe(true)
    expect(readOn([book({ readingLog: { '2026-11-18': 0.5 } })], '2026-11-19')).toBe(false)
    expect(readOn(null, '2026-11-19')).toBe(false)
  })
})
